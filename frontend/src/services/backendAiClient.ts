import { auth } from "@/firebase/auth";

/**
 * Backend AI Service - Calls the Express backend for AI operations.
 */
const DEFAULT_BACKEND_URL = "http://localhost:8787";
const BACKEND_URL = import.meta.env.VITE_API_URL?.trim() || DEFAULT_BACKEND_URL;

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

const createBackendHeaders = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be authenticated to call AI");
  }

  const idToken = await user.getIdToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
};

/**
 * Call the backend Gemini API route.
 * Requires user to be authenticated
 */
export const callBackendAI = async (
  request: GenerateTextRequest
): Promise<GenerateTextResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
      method: "POST",
      headers: await createBackendHeaders(),
      body: JSON.stringify(request),
    });
    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || "Failed to generate text");
    }

    return payload as GenerateTextResponse;
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
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch (error) {
    console.warn("AI service health check failed:", error);
    return false;
  }
};
