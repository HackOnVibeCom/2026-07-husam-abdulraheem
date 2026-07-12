const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  try {
    // There isn't a direct listModels in the standard JS SDK, we'll fetch it via fetch
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY}`);
    const data = await response.json();
    console.log("Available models:");
    data.models.filter(m => m.name.includes("gemini")).forEach(m => console.log(m.name));
  } catch (e) {
    console.error(e);
  }
}
run();
