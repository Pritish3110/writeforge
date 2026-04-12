import { callBackendAI } from "@/services/backendAiClient";
import { auth } from "@/firebase/auth";

export const PRIMARY_MODEL_NAME = "models/gemini-2.5-flash";
export const FALLBACK_MODEL_NAME = "models/gemini-2.0-flash";
export const MODEL_SEQUENCE = [
  PRIMARY_MODEL_NAME,
  FALLBACK_MODEL_NAME,
];

export const DEFAULT_UNAVAILABLE_MESSAGE =
  "I'm a bit busy right now. Try again in a moment.";
export const QUOTA_EXHAUSTED_MESSAGE =
  "I'm a bit busy right now. Try again in a moment.";

const DEFAULT_GENERATION_CONFIG = {
  maxOutputTokens: 150,
  temperature: 0.7,
};
const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];
const NON_RETRYABLE_STATUSES = [400, 401, 403, 404];
const RETRYABLE_ERROR_PATTERNS = [
  "deadline exceeded",
  "fetch failed",
  "network",
  "overloaded",
  "quota",
  "rate limit",
  "resource exhausted",
  "service unavailable",
  "temporarily unavailable",
  "timed out",
  "timeout",
  "truncated response",
  "truncated_response",
  "unavailable",
];
const NON_RETRYABLE_ERROR_PATTERNS = [
  "api key",
  "api_key",
  "forbidden",
  "invalid argument",
  "invalid api key",
  "malformed",
  "permission",
  "safety",
  "unauthorized",
];
const COOLDOWN_MS = 2000;
const COOLDOWN_MESSAGE = "Give it a second...";
const QUEUE_MESSAGE = "One sec...";
const MINIMUM_RESPONSE_MESSAGE = "Hmm... try that again?";
const MIN_RESPONSE_LENGTH = 5;
const MODEL_REQUEST_TIMEOUT_MS = 12000;
const QUOTA_BLOCK_MS = 3 * 60 * 1000;

const SIMPLE_REPLIES = {
  hi: "Hey 👋",
  hello: "Hey 👋",
  hey: "Hey 👋",
};

let lastCallTime = 0;
let isProcessing = false;
let quotaBlockedUntil = 0;

export const resetModelManagerStateForTests = () => {
  if (import.meta.env.MODE !== "test") {
    return;
  }

  lastCallTime = 0;
  isProcessing = false;
  quotaBlockedUntil = 0;
};

const extractErrorStatus = (error) =>
  error?.status ||
  error?.response?.status ||
  error?.cause?.status ||
  null;

const extractErrorCode = (error) =>
  error?.code || error?.details?.code || error?.cause?.code || "";

const extractErrorMessage = (error) => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
};

const containsAnyPattern = (value, patterns) =>
  patterns.some((pattern) => value.includes(pattern));

export const getSimpleReply = (query = "") => {
  const normalizedQuery = String(query)
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "");
  return SIMPLE_REPLIES[normalizedQuery] || null;
};

export const isQuotaError = (error) => {
  const status = Number(extractErrorStatus(error));
  const code = String(extractErrorCode(error)).toLowerCase();
  const message = extractErrorMessage(error).toLowerCase();
  const combined = `${status} ${code} ${message}`.trim();

  return (
    status === 429 ||
    combined.includes("quota") ||
    combined.includes("exceeded") ||
    combined.includes("resource exhausted") ||
    combined.includes("rate limit") ||
    combined.includes("429")
  );
};

const shouldTryFallback = (error) => {
  const status = Number(extractErrorStatus(error));
  const code = String(extractErrorCode(error)).toLowerCase();
  const message = extractErrorMessage(error).toLowerCase();
  const combined = `${code} ${message}`.trim();

  if (isQuotaError(error)) {
    return false;
  }

  if (NON_RETRYABLE_STATUSES.includes(status)) {
    return false;
  }

  if (RETRYABLE_STATUSES.includes(status)) {
    return true;
  }

  if (containsAnyPattern(combined, NON_RETRYABLE_ERROR_PATTERNS)) {
    return false;
  }

  return containsAnyPattern(combined, RETRYABLE_ERROR_PATTERNS);
};

export const canCallAI = () => {
  const now = Date.now();

  if (now - lastCallTime < COOLDOWN_MS) {
    return false;
  }

  lastCallTime = now;
  return true;
};

const isQuotaBlocked = () => quotaBlockedUntil > Date.now();

const blockQuotaTemporarily = () => {
  quotaBlockedUntil = Date.now() + QUOTA_BLOCK_MS;
};

export const localFallback = (query = "") => {
  const normalizedQuery = String(query).trim().toLowerCase();

  if (normalizedQuery.length < 10) {
    return "Want to expand that?";
  }

  if (normalizedQuery.includes("continue")) {
    return "Where should it go next?";
  }

  if (normalizedQuery.includes("idea")) {
    return "Want a few directions?";
  }

  if (normalizedQuery.includes("help")) {
    return "What do you need help with?";
  }

  return "Try again in a moment.";
};

const buildResponse = ({
  text,
  model = null,
  usedFallback = false,
  unavailable = false,
  error,
  throttled = false,
  queued = false,
  quotaLimited = false,
} = {}) => ({
  text,
  model,
  usedFallback,
  unavailable,
  error,
  throttled,
  queued,
  quotaLimited,
});

export const queueAI = async (task) => {
  if (isProcessing) {
    return buildResponse({
      text: QUEUE_MESSAGE,
      unavailable: true,
      queued: true,
    });
  }

  isProcessing = true;

  try {
    return await task();
  } finally {
    isProcessing = false;
  }
};

export const isTruncated = (text = "") => {
  const normalized = String(text).trim();

  if (!normalized) {
    return true;
  }

  if (normalized.length < MIN_RESPONSE_LENGTH) {
    return true;
  }

  if (/(?:\.\.\.|…|[,;:(\[{\/\\-]|['"`]\s*)$/.test(normalized)) {
    return true;
  }

  return normalized.length >= 40 && !/[.!?]["')\]]?$/.test(normalized);
};

const normalizeResponseText = (text = "") =>
  String(text)
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const createModelError = ({ message, code, modelName, cause } = {}) => {
  const error = new Error(message);

  if (code) {
    error.code = code;
  }

  if (modelName) {
    error.modelName = modelName;
  }

  if (cause) {
    error.cause = cause;
  }

  return error;
};

const createTimeoutError = (modelName, attemptLabel) =>
  createModelError({
    message: `${modelName} ${attemptLabel} timed out.`,
    code: "MODEL_TIMEOUT",
    modelName,
  });

const createTruncatedResponseError = (modelName, responseText = "") =>
  createModelError({
    message: `Truncated response from ${modelName}.`,
    code: "TRUNCATED_RESPONSE",
    modelName,
    cause: responseText ? new Error(responseText) : undefined,
  });

const withTimeout = async (task, modelName, attemptLabel) => {
  let timeoutId;

  try {
    return await Promise.race([
      task(),
      new Promise((_, reject) => {
        timeoutId = globalThis.setTimeout(() => {
          reject(createTimeoutError(modelName, attemptLabel));
        }, MODEL_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

const ensureMinimumResponse = (text = "") =>
  text.length < MIN_RESPONSE_LENGTH ? MINIMUM_RESPONSE_MESSAGE : text;

/**
 * Call backend AI service with the given prompt
 * Uses Firebase Cloud Function for secure API key handling
 */
const callBackendModel = async (prompt, modelName, attemptLabel) => {
  const text = await withTimeout(
    async () => {
      try {
        const response = await callBackendAI({
          prompt,
          model: modelName,
          generationConfig: DEFAULT_GENERATION_CONFIG,
        });
        return response.text;
      } catch (error) {
        throw error;
      }
    },
    modelName,
    attemptLabel,
  );

  return normalizeResponseText(text);
};

const runModelWithRetry = async (prompt, modelName) => {
  const firstText = await callBackendModel(prompt, modelName, "attempt");

  if (!isTruncated(firstText)) {
    return ensureMinimumResponse(firstText);
  }

  console.warn("Response truncated, retrying...");

  try {
    const retryText = await callBackendModel(prompt, modelName, "retry");

    if (!isTruncated(retryText)) {
      return ensureMinimumResponse(retryText);
    }
  } catch (retryError) {
    console.warn("Retry failed:", retryError);
    throw retryError;
  }

  throw createTruncatedResponseError(modelName, firstText);
};

export const getPrimaryModel = (modelOptions = {}) => {
  // Returning a wrapper that calls the backend
  return {
    generateContent: async (prompt) => {
      const text = await callBackendAI({
        prompt,
        model: PRIMARY_MODEL_NAME,
        generationConfig: {
          ...DEFAULT_GENERATION_CONFIG,
          ...(modelOptions.generationConfig || {}),
        },
      });
      return { response: { text: () => text.text } };
    },
  };
};

export const getFallbackModel = (modelOptions = {}) => {
  // Returning a wrapper that calls the backend
  return {
    generateContent: async (prompt) => {
      const text = await callBackendAI({
        prompt,
        model: FALLBACK_MODEL_NAME,
        generationConfig: {
          ...DEFAULT_GENERATION_CONFIG,
          ...(modelOptions.generationConfig || {}),
        },
      });
      return { response: { text: () => text.text } };
    },
  };
};

export const safeGenerate = async (
  prompt,
  {
    fallbackMessage = DEFAULT_UNAVAILABLE_MESSAGE,
    modelOptions = {},
    fallbackInput = "",
  } = {},
) => {
  // Check if user is authenticated
  if (!auth.currentUser) {
    const authError = new Error(
      "User must be authenticated to use AI features.",
    );
    console.error("AUTH ERROR:", authError);

    return buildResponse({
      text: fallbackMessage,
      unavailable: true,
      error: authError,
    });
  }

  return queueAI(async () => {
    if (isQuotaBlocked()) {
      return buildResponse({
        text: QUOTA_EXHAUSTED_MESSAGE,
        unavailable: true,
        quotaLimited: true,
      });
    }

    if (!canCallAI()) {
      return buildResponse({
        text: COOLDOWN_MESSAGE,
        unavailable: true,
        throttled: true,
      });
    }

    let lastError = null;

    for (let index = 0; index < MODEL_SEQUENCE.length; index += 1) {
      const modelName = MODEL_SEQUENCE[index];

      try {
        console.log(`Trying model: ${modelName}`);
        const text = await runModelWithRetry(prompt, modelName);

        return buildResponse({
          text,
          model: modelName,
          usedFallback: index > 0,
          unavailable: false,
        });
      } catch (error) {
        lastError = error;
        const status = Number(extractErrorStatus(error));
        const message = extractErrorMessage(error);
        console.warn(`Model failed: ${modelName}`, message);

        if (isQuotaError(error)) {
          console.warn("Quota exhausted - stopping all attempts");
          blockQuotaTemporarily();
          return buildResponse({
            text: QUOTA_EXHAUSTED_MESSAGE,
            model: modelName,
            usedFallback: index > 0,
            unavailable: true,
            error,
            quotaLimited: true,
          });
        }

        if (status === 503 || message.includes("503")) {
          console.warn("Model overloaded, trying next...");
          continue;
        }

        if (!shouldTryFallback(error)) {
          break;
        }
      }
    }

    return buildResponse({
      text:
        extractErrorCode(lastError) === "TRUNCATED_RESPONSE"
          ? MINIMUM_RESPONSE_MESSAGE
          : localFallback(fallbackInput) || fallbackMessage,
      model: MODEL_SEQUENCE.at(-1) || null,
      usedFallback: true,
      unavailable: true,
      error: lastError,
    });
  });
};
