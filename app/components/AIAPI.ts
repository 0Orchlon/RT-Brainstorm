// aiapi.ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API });

async function mainas(): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "who made you",
    config: {
      thinkingConfig: {
        thinkingBudget: 0, // Disables thinking
      },
    },
  });

  console.log(response.text);
  return response.text;
}

// Export the promise of the response text
const aiResponse = mainas();

export default aiResponse;
