import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const candidateModels = [
  'groq/compound',
  'groq/compound-mini',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];

async function testModels() {
  console.log('Testing Groq models for JSON response compatibility...\n');

  for (const model of candidateModels) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'Respond with valid JSON: {"status": "ok", "message": "hello"}' },
          { role: 'user', content: 'Hi' }
        ],
        temperature: 0.2,
        max_tokens: 100,
        response_format: { type: 'json_object' },
      });

      console.log(`✅ SUCCESS [${model}]:`, completion.choices[0]?.message?.content);
    } catch (err) {
      console.log(`❌ FAILED  [${model}]:`, err.message);
    }
  }
}

testModels();
