import Groq from 'groq-sdk';
import { z } from 'zod';
import dotenv from 'dotenv';
import { buildSystemPrompt } from './prompts.js';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Zod schema to validate Groq's JSON output ───────────────────────────────

const intentSchema = z.object({
  intent: z.enum(['BOOK_APPOINTMENT', 'CHECK_AVAILABILITY', 'CANCEL_APPOINTMENT', 'GENERAL']),
  service: z.string().nullable().optional().default(null),
  date: z.string().nullable().optional().default(null),
  time: z.string().nullable().optional().default(null),
  employeePreference: z.string().nullable().optional().default(null),
  customerName: z.string().nullable().optional().default(null),
  customerEmail: z.string().nullable().optional().default(null),
  confirmationResponse: z.enum(['YES', 'NO']).nullable().optional().default(null),
  missingFields: z.array(z.string()).default([]),
  message: z.string(),
});

// ── JSON schema description for the system prompt ────────────────────────────

const JSON_FORMAT_INSTRUCTIONS = `

RESPONSE FORMAT:
You MUST respond with a valid JSON object and nothing else. No markdown, no code fences, no explanation outside the JSON.
The JSON object must have exactly these fields:
{
  "intent": "BOOK_APPOINTMENT" | "CHECK_AVAILABILITY" | "CANCEL_APPOINTMENT" | "GENERAL",
  "service": "<exact service name from list or null>",
  "date": "<YYYY-MM-DD or null>",
  "time": "<HH:MM 24-hour or null>",
  "employeePreference": "<stylist name or null>",
  "customerName": "<full name or null>",
  "customerEmail": "<email or null>",
  "confirmationResponse": "YES" | "NO" | null,
  "missingFields": ["field1", "field2"],
  "message": "<your friendly reply to the customer>"
}`;

// ── Model cascade ────────────────────────────────────────────────────────────
// Groq's free tier is generous, but we keep a cascade for resilience.

const MODEL_CASCADE = [
  'groq/compound',       // Primary — top quality compound reasoning model
  'groq/compound-mini',  // Fallback — high speed lightweight model
];

/**
 * Convert frontend chat history format to Groq/OpenAI messages format.
 * Frontend sends: [{ role: 'user'|'model', parts: [{ text }] }]
 * Groq expects:   [{ role: 'user'|'assistant', content: '...' }]
 */
function convertHistory(history) {
  return history.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.parts.map(p => p.text).join('\n'),
  }));
}

/**
 * Call Groq with conversation history and extract structured booking intent.
 * Uses JSON mode + Zod validation to guarantee structured output.
 *
 * @param {string} userMessage - Latest user message
 * @param {Array}  history     - [{role: 'user'|'model', parts: [{text}]}]
 * @param {Array}  services    - Active services from DB
 * @param {Array}  employees   - Active employees from DB
 * @returns {Object} { intent, usage }
 */
export async function extractIntent(userMessage, history, services, employees = []) {
  const systemPrompt = buildSystemPrompt(services, employees) + JSON_FORMAT_INSTRUCTIONS;
  const messages = [
    { role: 'system', content: systemPrompt },
    ...convertHistory(history),
    { role: 'user', content: userMessage },
  ];

  let lastError;

  for (const modelName of MODEL_CASCADE) {
    // Each model gets up to 2 attempts (handles transient errors)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: modelName,
          messages,
          temperature: 0.2,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) {
          throw new Error('Groq returned empty response');
        }

        // Parse JSON
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new Error(`Groq returned invalid JSON: ${raw.slice(0, 200)}`);
        }

        // Validate with Zod
        const validated = intentSchema.safeParse(parsed);
        if (!validated.success) {
          console.warn(`[Groq] Schema validation failed on ${modelName}:`, validated.error.flatten());
          // Try to use the raw parsed data with defaults for missing fields
          parsed = {
            intent: parsed.intent || 'GENERAL',
            service: parsed.service || null,
            date: parsed.date || null,
            time: parsed.time || null,
            employeePreference: parsed.employeePreference || null,
            customerName: parsed.customerName || null,
            customerEmail: parsed.customerEmail || null,
            confirmationResponse: parsed.confirmationResponse || null,
            missingFields: parsed.missingFields || [],
            message: parsed.message || "I'm sorry, could you rephrase that?",
          };
        } else {
          parsed = validated.data;
        }

        // Build usage info (Groq provides this in the response)
        const usage = completion.usage ? {
          promptTokenCount: completion.usage.prompt_tokens,
          candidatesTokenCount: completion.usage.completion_tokens,
          totalTokenCount: completion.usage.total_tokens,
        } : null;

        if (modelName !== MODEL_CASCADE[0]) {
          console.log(`[Groq] Used fallback model: ${modelName}`);
        }

        return { intent: parsed, usage };

      } catch (err) {
        lastError = err;

        const status = err.status || err.statusCode;
        const is429 = status === 429 || err.message?.includes('429') || err.message?.includes('rate_limit');
        const is503 = status === 503 || err.message?.includes('503') || err.message?.includes('Service Unavailable');

        if (is429) {
          console.warn(`[Groq] 429 rate limit on ${modelName}. Moving to next model.`);
          break; // Skip to next model
        }

        if (is503 && attempt < 2) {
          console.warn(`[Groq] 503 transient on ${modelName}, retrying in 2s (attempt ${attempt}/2)`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        // Non-retryable error on this model — try next
        if (attempt >= 2 || (!is429 && !is503)) {
          console.warn(`[Groq] Error on ${modelName}: ${err.message}. Trying next model.`);
          break;
        }
      }
    }
  }

  // All models exhausted
  throw lastError;
}
