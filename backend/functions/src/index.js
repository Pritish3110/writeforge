import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Firebase Admin
admin.initializeApp();

let geminiClient = null;
let geminiApiKey = "";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  if (!geminiClient || geminiApiKey !== apiKey) {
    geminiClient = new GoogleGenerativeAI(apiKey);
    geminiApiKey = apiKey;
  }

  return geminiClient;
};

/**
 * Cloud Function: generateText
 * Generates text using Gemini API with authentication
 *
 * Request body:
 * {
 *   "prompt": "Your prompt here",
 *   "model": "models/gemini-2.5-flash",
 *   "generationConfig": { "maxOutputTokens": 150, "temperature": 0.7 }
 * }
 */
export const generateText = functions
  .runWith({ secrets: ["GEMINI_API_KEY"] })
  .https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to call this function"
      );
    }

    const userId = context.auth.uid;
    const { prompt, model = "models/gemini-2.5-flash", generationConfig = {} } =
      data;

    // Validate input
    if (!prompt || typeof prompt !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A non-empty string prompt is required"
      );
    }

    const aiClient = getGeminiClient();

    if (!aiClient) {
      console.error("GEMINI_API_KEY is not set");
      throw new functions.https.HttpsError(
        "internal",
        "AI service is temporarily unavailable"
      );
    }

    try {
      // Call Gemini API
      const generativeModel = aiClient.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.7,
          ...generationConfig,
        },
      });

      const result = await generativeModel.generateContent(prompt);
      const responseText = result.response.text();

      return {
        success: true,
        text: responseText,
        model,
        userId,
      };
    } catch (error) {
      console.error("Gemini API Error:", error);

      // Handle specific errors
      if (error.message?.includes("quota")) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "API quota exceeded. Please try again in a moment."
        );
      }

      if (error.message?.includes("API key")) {
        throw new functions.https.HttpsError(
          "internal",
          "AI service configuration error"
        );
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate text. Please try again."
      );
    }
  });

/**
 * Cloud Function: healthCheck
 * Simple endpoint to verify the function is running
 */
export const healthCheck = functions.https.onCall(async (_data, context) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    authenticated: !!context.auth,
  };
});
