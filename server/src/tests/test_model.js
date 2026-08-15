import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];

for (const name of models) {
  try {
    const model = genAI.getGenerativeModel({ model: name });
    const result = await model.generateContent('Say "ok" in one word.');
    console.log(`✅ ${name}: ${result.response.text().trim().slice(0, 60)}`);
  } catch (err) {
    const short = err.message?.slice(0, 120);
    console.log(`❌ ${name}: ${short}`);
  }
}
