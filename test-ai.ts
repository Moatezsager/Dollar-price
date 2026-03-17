import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function test() {
  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyC-qVnUYQ8NUu2AQx_Ub3LBbL5w6-Op31U";
  console.log("Using API Key:", apiKey.substring(0, 10) + "...");
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Say hello",
    });
    console.log("Response:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
