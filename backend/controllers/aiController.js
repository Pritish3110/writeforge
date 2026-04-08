const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_PROMPT_LENGTH = 10000;
const DEFAULT_GENERATION_CONFIG = {
  maxOutputTokens: 150,
  temperature: 0.7,
};

const resolveModelName = (model = DEFAULT_MODEL) =>
  String(model).replace(/^models\//, "").trim() || DEFAULT_MODEL;

const extractTextFromGeminiResponse = (payload) =>
  payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join("")
    .trim() || "";

const validateGenerateRequest = (body = {}) => {
  const { prompt, model, generationConfig } = body;

  if (typeof prompt !== "string" || !prompt.trim()) {
    return "Invalid prompt.";
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return `Prompt is too long. Maximum length is ${MAX_PROMPT_LENGTH} characters.`;
  }

  if (model !== undefined && (typeof model !== "string" || !model.trim())) {
    return "Invalid model.";
  }

  if (
    generationConfig !== undefined &&
    (typeof generationConfig !== "object" ||
      generationConfig === null ||
      Array.isArray(generationConfig))
  ) {
    return "Invalid generationConfig.";
  }

  return null;
};

export const generateText = async (request, response) => {
  const { prompt, model = DEFAULT_MODEL, generationConfig = {} } = request.body || {};
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const validationError = validateGenerateRequest(request.body);

  if (validationError) {
    response.status(400).json({
      success: false,
      error: validationError,
    });
    return;
  }

  if (!geminiApiKey) {
    response.status(500).json({
      success: false,
      error: "GEMINI_API_KEY is not configured on the backend.",
    });
    return;
  }

  try {
    const resolvedModel = resolveModelName(model);
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt.trim() }],
            },
          ],
          generationConfig: {
            ...DEFAULT_GENERATION_CONFIG,
            ...(generationConfig || {}),
          },
        }),
      },
    );

    const payload = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API request failed.", payload);
      response.status(geminiResponse.status).json({
        success: false,
        error:
          payload?.error?.message ||
          "Gemini API request failed.",
      });
      return;
    }

    const text = extractTextFromGeminiResponse(payload);

    if (!text) {
      response.status(502).json({
        success: false,
        error: "Gemini returned an empty response.",
      });
      return;
    }

    response.status(200).json({
      success: true,
      text,
      model: `models/${resolvedModel}`,
      userId: request.user.uid,
    });
  } catch (error) {
    console.error("Backend Gemini generation failed.", error);
    response.status(500).json({
      success: false,
      error: "Failed to generate text.",
    });
  }
};

export const healthCheck = async (_request, response) => {
  response.status(200).json({
    ok: true,
    service: "writerz-backend",
    timestamp: new Date().toISOString(),
  });
};
