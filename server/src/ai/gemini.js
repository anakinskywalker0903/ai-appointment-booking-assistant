import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
import { buildSystemPrompt } from './prompts.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Structured output schema — backend validates this before any DB operations
const intentSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intent: {
      type: SchemaType.STRING,
      enum: ['BOOK_APPOINTMENT', 'CHECK_AVAILABILITY', 'CANCEL_APPOINTMENT', 'GENERAL'],
      description: 'The user\'s primary intent',
    },
    service: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Matched service name exactly as in available services list, or null',
    },
    date: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Appointment date in YYYY-MM-DD format, or null',
    },
    time: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Appointment time in HH:MM 24-hour format, or null',
    },
    employeePreference: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Name of preferred stylist/employee if mentioned, or null if no preference',
    },
    customerName: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Customer full name, or null if not provided',
    },
    customerEmail: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Customer email address, or null if not provided',
    },
    confirmationResponse: {
      type: SchemaType.STRING,
      nullable: true,
      enum: ['YES', 'NO'],
      description: 'Whether the user confirmed a pending booking: YES, NO, or null',
    },
    missingFields: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Fields still needed to complete a BOOK_APPOINTMENT',
    },
    message: {
      type: SchemaType.STRING,
      description: 'The conversational reply to show the user',
    },
  },
  required: ['intent', 'missingFields', 'message'],
};

// Model cascade: spread requests across available models to stay within free tier quotas.
// Order: highest quota first, gemini-flash-latest (Gemini 3.7) as final fallback.
const MODEL_CASCADE = [
  'gemini-3.5-flash-lite',   // 15 req/day — reserved for demo
  'gemini-3.1-flash-lite',   // 15 req/day — fallback
  'gemini-3.5-flash',        // 5 req/day  — last resort
];

/**
 * Parse the retryDelay from a Gemini 429 error message (e.g. "Please retry in 41.18s").
 * Returns milliseconds to wait, capped at 60s.
 */
function parseRetryDelay(errMessage) {
  const match = errMessage?.match(/retry[^\d]*(\d+(?:\.\d+)?)\s*s/i);
  if (match) {
    return Math.min(Math.ceil(parseFloat(match[1])) * 1000, 60000);
  }
  return 10000; // default 10s if not parseable
}

/**
 * Call Gemini with conversation history and extract structured booking intent.
 * Tries gemini-1.5-flash first (higher free quota), falls back to gemini-flash-latest.
 * Respects the retry-after delay from 429 responses.
 *
 * @param {string} userMessage - Latest user message
 * @param {Array}  history     - [{role: 'user'|'model', parts: [{text}]}]
 * @param {Array}  services    - Active services from DB
 * @param {Array}  employees   - Active employees from DB
 * @returns {Object} Structured intent object
 */
export async function extractIntent(userMessage, history, services, employees = []) {
  const systemInstruction = buildSystemPrompt(services, employees);
  const generationConfig = {
    responseMimeType: 'application/json',
    responseSchema: intentSchema,
    temperature: 0.2,
  };

  let lastError;

  for (const modelName of MODEL_CASCADE) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction,
      generationConfig,
    });

    // Each model gets up to 2 attempts (handles transient 503s)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(userMessage);
        const raw = result.response.text();
        const usage = result.response.usageMetadata;

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new Error(`Gemini returned invalid JSON: ${raw.slice(0, 200)}`);
        }

        if (modelName !== MODEL_CASCADE[0]) {
          console.log(`[Gemini] Used fallback model: ${modelName}`);
        }
        return { intent: parsed, usage };

      } catch (err) {
        lastError = err;

        const is429 = err.status === 429 || err.message?.includes('429') || err.message?.includes('Quota');
        const is503 = err.status === 503 || err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('Service Unavailable');

        if (is429) {
          // Quota exhausted on this model — no point retrying, move to next model
          const waitMs = parseRetryDelay(err.message);
          console.warn(`[Gemini] 429 quota exceeded on ${modelName}. Moving to next model. (Retry-After: ~${waitMs / 1000}s)`);
          break;
        }

        if (is503 && attempt < 2) {
          console.warn(`[Gemini] 503 transient on ${modelName}, retrying in 3s (attempt ${attempt}/2)`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        // Non-retryable error — bail out of the whole cascade
        throw err;
      }
    }
  }

  // All models exhausted
  throw lastError;
}
