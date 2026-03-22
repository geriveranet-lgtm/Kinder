import { GoogleGenAI } from "@google/genai";

async function findKinomaniaUrl() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Find the correct URL for the top 100 or top 250 movies on kinomania.ru. Also, find a few movie titles and poster URLs from that site if possible.",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    console.log(response.text);
  } catch (error) {
    console.error("Error finding kinomania URL:", error);
  }
}

findKinomaniaUrl();
