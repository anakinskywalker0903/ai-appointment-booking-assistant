import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { buildSystemPrompt } from '../ai/prompts.js';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

const mockServices = [
  { name: 'Haircut', duration_minutes: 45, description: 'Classic haircut' },
  { name: 'Hair Spa', duration_minutes: 60, description: 'Deep conditioning' }
];

const mockEmployees = [
  { name: 'Sarah', role: 'Senior Stylist', services: [{ name: 'Haircut' }] },
  { name: 'David', role: 'Barber', services: [{ name: 'Haircut' }] }
];

const modelsToTest = ['groq/compound', 'groq/compound-mini'];

async function run() {
  const systemPrompt = buildSystemPrompt(mockServices, mockEmployees) + JSON_FORMAT_INSTRUCTIONS;

  for (const model of modelsToTest) {
    console.log(`Testing model: ${model}...`);
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'I want a haircut tomorrow at 4 PM with Sarah. My name is Alex, email alex@example.com' }
        ],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content;
      console.log('Raw output:', raw);
      const parsed = JSON.parse(raw);
      const validated = intentSchema.safeParse(parsed);

      if (validated.success) {
        console.log(`✅ ${model} VALIDATION PASSED!`, validated.data);
      } else {
        console.log(`❌ ${model} Zod failed:`, validated.error.flatten());
      }
    } catch (err) {
      console.error(`❌ ${model} Error:`, err.message);
    }
    console.log('---');
  }
}

run();
