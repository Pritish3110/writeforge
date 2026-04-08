import { auth } from "@/firebase/auth.js";
import {
  detectIntent,
  getIntentDetails,
  AI_INTENT,
  AI_ROUTE,
  SIMPLE_AI_ROUTE,
} from "./intentDetector";
import { generateGeneralResponse, runLLM } from "./llmService";
import {
  DEFAULT_UNAVAILABLE_MESSAGE,
  getSimpleReply,
  safeGenerate,
} from "./modelManager";
import { buildRagPrompt } from "./promptBuilder";
import { retrieveRelevantContext, runRAG } from "./ragService";

const WORKSPACE_ACCESS_MESSAGE =
  "I couldn't access your saved workspace right now. Please try again in a moment.";

const MISSING_CONTEXT_MESSAGE =
  "I couldn't find anything relevant in your saved workspace for that request yet.";

const LOGIN_REQUIRED_MESSAGE = "Please log in to access your saved workspace.";

export const handleAIQuery = async (
  query,
  {
    user = auth.currentUser,
    conversationHistory = [],
    contextHints = [],
    creativeMode = false,
  } = {},
) => {
  const simpleReply = getSimpleReply(query);

  if (simpleReply) {
    return simpleReply;
  }

  const intent = detectIntent(query, contextHints);

  if (import.meta.env.DEV) {
    console.log("AI CALLED", {
      intent,
      query,
      signedIn: Boolean(user?.uid),
      creativeMode,
      contextHints,
    });
  }

  if (intent === SIMPLE_AI_ROUTE.RAG) {
    if (!user?.uid) {
      return LOGIN_REQUIRED_MESSAGE;
    }

    return runRAG(user.uid, query);
  }

  return runLLM(query, {
    conversationHistory,
  });
};

export const routeAiRequest = async ({
  message,
  userId,
  conversationHistory = [],
  contextHints = [],
} = {}) => {
  if (!message?.trim()) {
    throw new Error("A message is required before routing an AI request.");
  }

  const simpleReply = getSimpleReply(message);

  if (simpleReply) {
    return {
      text: simpleReply,
      route: AI_ROUTE.LLM,
      intent: AI_INTENT.GENERAL,
      model: "local",
      usedFallback: false,
      sources: [],
    };
  }

  const routing = getIntentDetails({
    message,
    contextHints,
  });

  if (routing.route === AI_ROUTE.RAG) {
    if (!userId) {
      return {
        text: WORKSPACE_ACCESS_MESSAGE,
        route: routing.route,
        intent: routing.intent,
        model: null,
        usedFallback: false,
        sources: [],
      };
    }

    try {
      const retrieval = await retrieveRelevantContext({
        userId,
        query: message,
      });

      if (!retrieval.contextItems.length) {
        return {
          text: MISSING_CONTEXT_MESSAGE,
          route: routing.route,
          intent: routing.intent,
          model: null,
          usedFallback: false,
          sources: [],
          retrieval,
        };
      }

      const prompt = buildRagPrompt({
        message,
        conversationHistory,
        contextItems: retrieval.contextItems,
      });

      const response = await safeGenerate(prompt, {
        fallbackMessage: DEFAULT_UNAVAILABLE_MESSAGE,
        fallbackInput: message,
      });

      return {
        ...response,
        route: routing.route,
        intent: routing.intent,
        sources: retrieval.sources,
        retrieval,
      };
    } catch (error) {
      console.error("RAG request failed.", error);
      return {
        text: WORKSPACE_ACCESS_MESSAGE,
        route: routing.route,
        intent: routing.intent,
        model: null,
        usedFallback: false,
        sources: [],
        error,
      };
    }
  }

  const response = await generateGeneralResponse({
    message,
    conversationHistory,
  });

  return {
    ...response,
    route: routing.route,
    intent: routing.intent,
    sources: [],
  };
};

export default routeAiRequest;
