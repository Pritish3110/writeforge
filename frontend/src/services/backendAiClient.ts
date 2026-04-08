import { auth } from "@/firebase/auth";
import { functions } from "@/firebase/config";
import { httpsCallable } from "firebase/functions";

/**
 * Backend AI Service - Calls Firebase Cloud Functions for AI operations
 * The Gemini API key is now stored securely on the backend
 */

let generateTextFunction: ReturnType<typeof httpsCallable> | null = null;

export const getGenerateTextFunction = () => {
  if (!generateTextFunction) {
    generateTextFunction = httpsCallable(functions, "generateText");
  }
  return generateTextFunction;
};

export interface GenerateTextRequest {
  prompt: string;
  model?: string;
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
  };
}

export interface GenerateTextResponse {
  success: boolean;
  text: string;
  model: string;
  userId: string;
}

/**
 * Call the backend Gemini API function
 * Requires user to be authenticated
 */
export const callBackendAI = async (
  request: GenerateTextRequest
): Promise<GenerateTextResponse> => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be authenticated to call AI");
  }

  try {
    const generateText = getGenerateTextFunction();
    const response = (await generateText(request)) as {
      data: GenerateTextResponse;
    };

    if (!response.data?.success) {
      throw new Error("Failed to generate text");
    }

    return response.data;
  } catch (error) {
    console.error("Backend AI Error:", error);

    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Failed to call backend AI service");
  }
};

/**
 * Health check - verify the backend AI service is available
 */
export const checkAIServiceHealth = async (): Promise<boolean> => {
  try {
    const healthCheckFunction = httpsCallable(functions, "healthCheck");
    await healthCheckFunction({});
    return true;
  } catch (error) {
    console.warn("AI service health check failed:", error);
    return false;
  }
};
