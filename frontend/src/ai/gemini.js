import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || "";

let geminiClient = null;

export const hasGeminiApiKey = Boolean(GEMINI_API_KEY);

export const getGeminiClient = () => {
  if (!hasGeminiApiKey) {
    throw new Error(
      "Missing Gemini API key. Add VITE_GEMINI_API_KEY to your local environment.",
    );
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  return geminiClient;
};

const genAI = {
  getGenerativeModel: (options) => getGeminiClient().getGenerativeModel(options),
};

export default genAI;
