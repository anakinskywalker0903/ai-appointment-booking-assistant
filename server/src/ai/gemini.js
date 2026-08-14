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

/**
 * Call Gemini with conversation history and extract structured booking intent.
 * @param {string} userMessage - Latest user message
 * @param {Array}  history     - [{role: 'user'|'model', parts: [{text}]}]
 * @param {Array}  services    - Active services from DB
 * @returns {Object} Structured intent object
 */
export async function extractIntent(userMessage, history, services) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(services),
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: intentSchema,
      temperature: 0.2, // low temperature = more consistent structured output
    },
  });

  const chat = model.startChat({ history });

  const result = await chat.sendMessage(userMessage);
  const raw = result.response.text();

  // Track token usage for documentation
  const usage = result.response.usageMetadata;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Gemini returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  return { intent: parsed, usage };
}
