require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testQuotas() {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    const genAI = new GoogleGenerativeAI(key);

    const modelsToTest = [
        "gemini-2.5-flash",
        "gemini-flash-lite-latest",
        "gemini-pro-latest",
        "gemini-2.0-flash-lite"
    ];

    for (const modelName of modelsToTest) {
        try {
            console.log(`Testing model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            await model.generateContent("test");
            console.log(`[SUCCESS] ${modelName} has available quota!`);
        } catch (err) {
            console.error(`[FAILED] ${modelName}:`, err.message.substring(0, 150) + "...");
        }
    }
}

testQuotas();
