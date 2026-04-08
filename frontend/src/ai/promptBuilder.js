const MAX_CONTEXT_CHARACTERS = 3000;

const limitContext = (context = "") =>
  String(context).trim().slice(0, MAX_CONTEXT_CHARACTERS);

const formatConversationHistory = (conversationHistory = []) => {
  if (!conversationHistory.length) {
    return "No prior conversation context.";
  }

  return conversationHistory
    .slice(-6)
    .map((entry, index) => {
      const role = entry?.role === "assistant" ? "Assistant" : "User";
      const content = entry?.content?.trim() || "";
      return `${index + 1}. ${role}: ${content}`;
    })
    .join("\n");
};

const formatRagContext = (contextItems = []) => {
  if (!contextItems.length) {
    return "No relevant writing context was found.";
  }

  return contextItems
    .map((item, index) => {
      const header = `${index + 1}. ${item.sectionLabel}: ${item.title}`;
      return `${header}\n${item.content}`;
    })
    .join("\n\n");
};

const formatConversationBlock = (conversationHistory = []) => {
  const history = formatConversationHistory(conversationHistory);
  return history === "No prior conversation context."
    ? ""
    : `\nIf it helps, here is the recent exchange:\n${history}\n`;
};

export const buildLLMPrompt = (
  query,
  {
    conversationHistory = [],
  } = {},
) => `You are WriterZ AI — a minimal, fast writing companion for authors.

Style:
- Natural, conversational, human-like
- No robotic phrasing
- No generic assistant tone
- No teaching unless the user asks for it
- Keep responses SHORT: 1 to 2 lines max
- Be insightful, casual, and precise${formatConversationBlock(conversationHistory)}

User:
"${query}"

Respond like a thoughtful writing partner sitting beside the user.
Give the shortest helpful answer you can.`;

export const buildRAGPrompt = (
  context,
  query,
  {
    conversationHistory = [],
  } = {},
) => `You are WriterZ AI.

The user is asking about their own writing.${formatConversationBlock(conversationHistory)}

Here is their writing:
${limitContext(context) || "No relevant writing context was found."}

User:
"${query}"

Instructions:
- Speak naturally, not like a system
- Refer to their writing like a human would
- Avoid phrases like "based on the provided context"
- Keep the reply short, clear, and insightful
- If the writing does not answer the question, say that simply`;

export const buildGeneralPrompt = ({
  message,
  conversationHistory = [],
} = {}) =>
  buildLLMPrompt(message, {
    conversationHistory,
  });

export const buildRagPrompt = ({
  message,
  contextItems = [],
  conversationHistory = [],
} = {}) =>
  buildRAGPrompt(formatRagContext(contextItems), message, {
    conversationHistory,
  });
