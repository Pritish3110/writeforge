import { DEFAULT_UNAVAILABLE_MESSAGE, safeGenerate } from "./modelManager";
import { buildGeneralPrompt, buildLLMPrompt } from "./promptBuilder";

export const generateGeneralResponse = async ({
  message,
  conversationHistory = [],
} = {}) => {
  const prompt = buildGeneralPrompt({
    message,
    conversationHistory,
  });

  return safeGenerate(prompt, {
    fallbackMessage: DEFAULT_UNAVAILABLE_MESSAGE,
    fallbackInput: message,
  });
};

export const runLLM = async (
  query,
  {
    conversationHistory = [],
  } = {},
) => {
  const prompt = buildLLMPrompt(query, {
    conversationHistory,
  });
  const response = await safeGenerate(prompt, {
    fallbackMessage: DEFAULT_UNAVAILABLE_MESSAGE,
    fallbackInput: query,
  });

  return response.text;
};
