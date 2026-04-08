import { getSnapshot } from "@/services/snapshotService.js";
import { DEFAULT_UNAVAILABLE_MESSAGE, safeGenerate } from "./modelManager";
import { buildRAGPrompt } from "./promptBuilder";

const MAX_RESULTS = 6;
const MAX_SEGMENTS_PER_RECORD = 24;
const MAX_CONTEXT_CHARACTERS = 3000;
const DEFAULT_RAG_ERROR_MESSAGE =
  "I couldn't retrieve your saved workspace right now.";
const DEFAULT_MISSING_CONTEXT_MESSAGE =
  "I couldn't find anything relevant in your saved workspace for that request yet.";

const SECTION_LABELS = {
  user: "Profile",
  taskRecords: "Task Records",
  customTasks: "Custom Tasks",
  taskTemplates: "Task Templates",
  characters: "Characters",
  characterRelationships: "Character Relationships",
  plotPoints: "Plot Points",
  drafts: "Drafts",
  worldElements: "World Elements",
  knowledgeBaseSections: "Knowledge Base",
};

const toReadableLabel = (value = "") =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const flattenValue = (
  value,
  {
    path = "",
    depth = 0,
    segments = [],
  } = {},
) => {
  if (segments.length >= MAX_SEGMENTS_PER_RECORD || depth > 3 || value == null) {
    return segments;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized) {
      segments.push(path ? `${toReadableLabel(path)}: ${normalized}` : normalized);
    }
    return segments;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    segments.push(path ? `${toReadableLabel(path)}: ${String(value)}` : String(value));
    return segments;
  }

  if (Array.isArray(value)) {
    value.slice(0, 8).forEach((entry, index) => {
      flattenValue(entry, {
        path: path ? `${path} ${index + 1}` : `${index + 1}`,
        depth: depth + 1,
        segments,
      });
    });
    return segments;
  }

  if (typeof value === "object") {
    Object.entries(value)
      .slice(0, 12)
      .forEach(([key, entry]) => {
        flattenValue(entry, {
          path: path ? `${path} ${key}` : key,
          depth: depth + 1,
          segments,
        });
      });
  }

  return segments;
};

const createDocument = ({
  section,
  sectionLabel,
  index,
  record,
}) => {
  const title =
    record?.title ||
    record?.name ||
    record?.displayName ||
    record?.label ||
    `${sectionLabel} ${index + 1}`;
  const content = flattenValue(record).join("\n");

  return {
    id: `${section}-${record?.id || index}`,
    section,
    sectionLabel,
    title,
    content,
    searchableText: `${title}\n${content}`.toLowerCase(),
  };
};

const buildDocumentsFromSnapshot = (snapshot) =>
  Object.entries(snapshot || {}).flatMap(([section, value]) => {
    const sectionLabel = SECTION_LABELS[section] || toReadableLabel(section);

    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .filter(Boolean)
        .map((record, index) =>
          createDocument({
            section,
            sectionLabel,
            index,
            record,
          }),
        )
        .filter((document) => document.content);
    }

    if (typeof value === "object") {
      const document = createDocument({
        section,
        sectionLabel,
        index: 0,
        record: value,
      });

      return document.content ? [document] : [];
    }

    return [];
  });

const tokenize = (value) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

const scoreDocument = (query, tokens, document) => {
  let score = 0;

  if (document.searchableText.includes(query)) {
    score += 6;
  }

  tokens.forEach((token) => {
    if (document.title.toLowerCase().includes(token)) {
      score += 3;
    }

    if (document.searchableText.includes(token)) {
      score += 1;
    }
  });

  return score;
};

const formatContextItem = (item) =>
  `${item.sectionLabel}: ${item.title}\n${item.content}`.trim();

const getRecentDraftContext = (snapshot) => {
  const recentDrafts = Array.isArray(snapshot?.drafts)
    ? snapshot.drafts.slice(-2)
    : [];

  if (!recentDrafts.length) {
    return "";
  }

  return recentDrafts
    .map((record, index) =>
      formatContextItem(
        createDocument({
          section: "drafts",
          sectionLabel: SECTION_LABELS.drafts,
          index,
          record,
        }),
      ),
    )
    .join("\n\n");
};

export const extractRelevantData = (snapshot, query = "") => {
  if (!snapshot) {
    return "";
  }

  const documents = buildDocumentsFromSnapshot(snapshot);
  const normalizedQuery = query.trim().toLowerCase();
  const queryTokens = tokenize(normalizedQuery);

  const matchedDocuments = normalizedQuery
    ? documents
        .map((document) => ({
          ...document,
          score: scoreDocument(normalizedQuery, queryTokens, document),
        }))
        .filter((document) => document.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, 4)
        .map(({ searchableText, score, ...document }) => document)
    : [];

  const formattedContext = matchedDocuments.length
    ? matchedDocuments.map(formatContextItem).join("\n\n")
    : getRecentDraftContext(snapshot) ||
      JSON.stringify(snapshot, null, 2).slice(0, MAX_CONTEXT_CHARACTERS);

  return formattedContext.slice(0, MAX_CONTEXT_CHARACTERS);
};

export const retrieveRelevantContext = async ({
  userId,
  query,
  limit = MAX_RESULTS,
} = {}) => {
  if (!userId) {
    throw new Error("A user id is required for retrieval.");
  }

  const snapshot = await getSnapshot(userId);

  if (!snapshot) {
    return {
      contextItems: [],
      documentsSearched: 0,
      snapshot,
      sources: [],
    };
  }

  const documents = buildDocumentsFromSnapshot(snapshot);
  const normalizedQuery = query.trim().toLowerCase();
  const queryTokens = tokenize(normalizedQuery);

  const contextItems = documents
    .map((document) => ({
      ...document,
      score: scoreDocument(normalizedQuery, queryTokens, document),
    }))
    .filter((document) => document.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ searchableText, score, ...document }) => document);

  return {
    contextItems,
    documentsSearched: documents.length,
    snapshot,
    sources: contextItems.map((item) => ({
      id: item.id,
      section: item.section,
      title: item.title,
    })),
  };
};

export const runRAG = async (userId, query) => {
  try {
    const snapshot = await getSnapshot(userId);
    const context = extractRelevantData(snapshot, query);

    if (!context) {
      return DEFAULT_MISSING_CONTEXT_MESSAGE;
    }

    const prompt = buildRAGPrompt(context, query);
    const response = await safeGenerate(prompt, {
      fallbackMessage: DEFAULT_UNAVAILABLE_MESSAGE,
      fallbackInput: query,
    });

    return response.text;
  } catch (error) {
    console.error("RAG request failed.", error);
    return DEFAULT_RAG_ERROR_MESSAGE;
  }
};
