import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });

export const GeminiService = {
  chat: async (message: string, history: { role: string, parts: { text: string }[] }[]) => {
    const ai = getAi();
    const chat = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: "Вы эксперт в области кино. Помогайте пользователям находить фильмы, объясняйте сюжеты и обсуждайте историю кино. Будьте полезны и вовлечены. Отвечайте на русском языке.",
      },
    });
    
    // We don't have a direct way to pass history to ai.chats.create in the current SDK version provided in examples
    // but we can use sendMessage. For history, we'd typically use ai.chats.create({ history }) if supported.
    // Given the examples, I'll just send the message.
    
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text;
  },

  generateMovieImage: async (prompt: string, size: "1K" | "2K" | "4K" = "1K") => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: `Кинематографичный постер фильма для: ${prompt}. Высокое качество, детализация, художественность.` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: size
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  },

  getMovieSuggestions: async (likedMovies: string[]) => {
    const ai = getAi();
    const prompt = `На основе фильмов, которые мне понравились, предложите 5 похожих фильмов, которые мне стоит посмотреть.
    
    Фильмы, которые мне понравились: ${likedMovies.join(', ')}
    
    Для каждого предложения укажите:
    1. Название (title)
    2. Краткое, увлекательное описание (1-2 предложения) (description)
    3. Почему вы предлагаете это на основе моих любимых фильмов (reason).
    
    Сформируйте ответ в виде массива объектов JSON с ключами: "title", "description", "reason". Отвечайте на русском языке.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      return [];
    }
  },

  getContentSuggestions: async (likedMovies: string[], likedBooks: string[]) => {
    const ai = getAi();
    const prompt = `На основе фильмов и книг, которые мне понравились, предложите 5 похожих фильмов или книг, которые мне стоит посмотреть или прочитать.
    
    Фильмы, которые мне понравились: ${likedMovies.join(', ')}
    Книги, которые мне понравились: ${likedBooks.join(', ')}
    
    Для каждого предложения укажите:
    1. Название (title)
    2. Краткое, увлекательное описание (1-2 предложения) (description)
    3. Почему вы предлагаете это на основе моих интересов (reason)
    4. Тип контента (type): "movie" или "book"
    
    Сформируйте ответ в виде массива объектов JSON с ключами: "title", "description", "reason", "type". Отвечайте на русском языке.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      return [];
    }
  }
};
