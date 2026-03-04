const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = (process.env.GEMINI_API_KEY || "").trim();
const genAI = new GoogleGenerativeAI(key);

if (key) {
    console.log(`AI Architect: Gemini Loaded (Key starts with: ${key.substring(0, 4)}...)`);
} else {
    console.warn("AI Architect: GEMINI_API_KEY is missing in .env");
}

module.exports = genAI;
