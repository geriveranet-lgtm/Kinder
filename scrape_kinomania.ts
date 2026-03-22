import { GoogleGenAI } from "@google/genai";

async function scrapeKinomania() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Extract movie titles and poster URLs from https://www.kinomania.ru/top/films. Return the data as a JSON array of objects with 'title' and 'posterUrl' properties.",
      config: {
        tools: [{ urlContext: {} }]
      }
    });
    console.log(response.text);
  } catch (error) {
    console.error("Error scraping kinomania:", error);
  }
}

scrapeKinomania();
