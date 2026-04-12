export const AI_ROUTE = {
  LLM: "llm",
  RAG: "rag",
};

export const SIMPLE_AI_ROUTE = {
  LLM: "LLM",
  RAG: "RAG",
};

export const AI_INTENT = {
  GENERAL: "general",
  USER_DATA: "user-data",
};

const RAG_KEYWORDS = [
  "my draft",
  "my drafts",
  "my writing",
  "my character",
  "my characters",
  "my story",
  "my stories",
  "my notes",
  "my document",
  "my documents",
  "my data",
  "my workspace",
  "from my",
  "in my",
  "show me my",
  "list my",
  "search my",
  "summarize my",
  "continue my",
  "what did i write",
];

const EXPLICIT_RAG_PATTERNS = [
  /\bwhat did i write\b/i,
  /\bwhat (?:do|did|are) my\b/i,
  /\bshow me my\b/i,
  /\blist my\b/i,
  /\bsearch my\b/i,
  /\bsummarize my\b/i,
  /\bcontinue my\b/i,
  /\bin my workspace\b/i,
  /\bfrom my workspace\b/i,
];

const WRITING_CONTEXT_PATTERN =
  /\b(draft|drafts|writing|story|stories|character|characters|note|notes|document|documents|scene|scenes|plot|plots|world|workspace)\b/i;

const normalizeText = (value = "") => String(value).trim().toLowerCase();

const countMatches = (source, terms) =>
  terms.reduce((matches, term) => {
    if (source.includes(term)) {
      matches.push(term);
    }
    return matches;
  }, []);

const detectIntentDetails = ({
  message = "",
  contextHints = [],
} = {}) => {
  const normalizedMessage = normalizeText(message);
  const keywordMatches = countMatches(normalizedMessage, RAG_KEYWORDS);
  const explicitPatternMatch = EXPLICIT_RAG_PATTERNS.some((pattern) =>
    pattern.test(normalizedMessage),
  );
  const hintedUserData = contextHints.some(
    (hint) => normalizeText(hint) === AI_INTENT.USER_DATA,
  );
  const hintSupportsRag =
    hintedUserData && WRITING_CONTEXT_PATTERN.test(normalizedMessage);

  const shouldUseRag =
    explicitPatternMatch || keywordMatches.length > 0 || hintSupportsRag;

  if (shouldUseRag) {
    return {
      intent: AI_INTENT.USER_DATA,
      route: AI_ROUTE.RAG,
      confidence: Number(
        Math.min(
          hintSupportsRag ? 0.88 : explicitPatternMatch ? 0.92 : 0.82,
          0.98,
        ).toFixed(2),
      ),
      matchedKeywords: [
        ...new Set([
          ...keywordMatches,
          ...(explicitPatternMatch ? ["workspace-query"] : []),
          ...(hintSupportsRag ? ["user-data-hint"] : []),
        ]),
      ],
    };
  }

  return {
    intent: AI_INTENT.GENERAL,
    route: AI_ROUTE.LLM,
    confidence: 0.62,
      matchedKeywords: [],
  };
};

export const detectIntent = (queryOrOptions = "", contextHints = []) => {
  if (typeof queryOrOptions === "string") {
    const details = detectIntentDetails({
      message: queryOrOptions,
      contextHints,
    });

    return details.route === AI_ROUTE.RAG
      ? SIMPLE_AI_ROUTE.RAG
      : SIMPLE_AI_ROUTE.LLM;
  }

  return detectIntentDetails(queryOrOptions);
};

export const getIntentDetails = detectIntentDetails;
