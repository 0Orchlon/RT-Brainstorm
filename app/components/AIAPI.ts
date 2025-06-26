// aiapi.ts
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API,
});

// Export a function to get a Gemini response from user input
export async function getGeminiResponse(userContent: string): Promise<string> {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userContent,
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    return result.text;
  } catch (err) {
    console.error("AI error:", err);
    return "Sorry, I couldn't think of a response.";
  }
}
