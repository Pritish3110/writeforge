import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleAIQuery, routeAiRequest } from "@/ai/aiRouter";
import { AI_INTENT, AI_ROUTE } from "@/ai/intentDetector";

const llmServiceMock = vi.hoisted(() => ({
  generateGeneralResponse: vi.fn(),
  runLLM: vi.fn(),
}));

const ragServiceMock = vi.hoisted(() => ({
  retrieveRelevantContext: vi.fn(),
  runRAG: vi.fn(),
}));

const modelManagerMock = vi.hoisted(() => ({
  DEFAULT_UNAVAILABLE_MESSAGE:
    "I'm a bit busy right now. Try again in a moment.",
  getSimpleReply: vi.fn(),
  safeGenerate: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  auth: {
    currentUser: null as { uid: string } | null,
  },
}));

vi.mock("../ai/llmService.js", () => ({
  generateGeneralResponse: llmServiceMock.generateGeneralResponse,
  runLLM: llmServiceMock.runLLM,
}));

vi.mock("../ai/ragService.js", () => ({
  retrieveRelevantContext: ragServiceMock.retrieveRelevantContext,
  runRAG: ragServiceMock.runRAG,
}));

vi.mock("../ai/modelManager.js", () => ({
  DEFAULT_UNAVAILABLE_MESSAGE: modelManagerMock.DEFAULT_UNAVAILABLE_MESSAGE,
  getSimpleReply: modelManagerMock.getSimpleReply,
  safeGenerate: modelManagerMock.safeGenerate,
}));

vi.mock("@/firebase/auth.js", () => authMock);

describe("aiRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.auth.currentUser = null;
    modelManagerMock.getSimpleReply.mockReturnValue(null);
  });

  it("handles general dashboard queries through the LLM path", async () => {
    llmServiceMock.runLLM.mockResolvedValueOnce(
      "Start with a line that creates pressure before explanation.",
    );

    const result = await handleAIQuery(
      "Help me write a stronger first line for a mystery novel.",
    );

    expect(llmServiceMock.runLLM).toHaveBeenCalledWith(
      "Help me write a stronger first line for a mystery novel.",
      { conversationHistory: [] },
    );
    expect(ragServiceMock.runRAG).not.toHaveBeenCalled();
    expect(result).toBe(
      "Start with a line that creates pressure before explanation.",
    );
  });

  it("answers simple greetings locally without calling the AI services", async () => {
    modelManagerMock.getSimpleReply.mockReturnValueOnce("Hey 👋");

    const result = await handleAIQuery("hello");

    expect(llmServiceMock.runLLM).not.toHaveBeenCalled();
    expect(ragServiceMock.runRAG).not.toHaveBeenCalled();
    expect(result).toBe("Hey 👋");
  });

  it("routes capability questions through the LLM instead of local reply shortcuts", async () => {
    llmServiceMock.runLLM.mockResolvedValueOnce(
      "I can help with writing, ideas, revision, and your saved drafts.",
    );

    const result = await handleAIQuery("What can you do for me?");

    expect(modelManagerMock.getSimpleReply).toHaveBeenCalledWith(
      "What can you do for me?",
    );
    expect(llmServiceMock.runLLM).toHaveBeenCalledWith(
      "What can you do for me?",
      { conversationHistory: [] },
    );
    expect(ragServiceMock.runRAG).not.toHaveBeenCalled();
    expect(result).toBe(
      "I can help with writing, ideas, revision, and your saved drafts.",
    );
  });

  it("keeps creative requests on the LLM path even when a writing-context hint is present", async () => {
    llmServiceMock.runLLM.mockResolvedValueOnce(
      "Here are three punchline directions you could use.",
    );

    const result = await handleAIQuery("write me punchline", {
      contextHints: [AI_INTENT.USER_DATA],
    });

    expect(llmServiceMock.runLLM).toHaveBeenCalledWith("write me punchline", {
      conversationHistory: [],
    });
    expect(ragServiceMock.runRAG).not.toHaveBeenCalled();
    expect(result).toBe("Here are three punchline directions you could use.");
  });

  it("asks the user to sign in for workspace-aware queries when needed", async () => {
    const result = await handleAIQuery("What did I write in my draft notes?");

    expect(ragServiceMock.runRAG).not.toHaveBeenCalled();
    expect(result).toContain("Please log in");
  });

  it("uses the RAG path for signed-in workspace-aware queries", async () => {
    authMock.auth.currentUser = { uid: "user-123" };
    ragServiceMock.runRAG.mockResolvedValueOnce(
      "Your saved draft says Mira hides the map during the storm.",
    );

    const result = await handleAIQuery("Summarize my Ash Harbor draft.");

    expect(ragServiceMock.runRAG).toHaveBeenCalledWith(
      "user-123",
      "Summarize my Ash Harbor draft.",
    );
    expect(result).toBe(
      "Your saved draft says Mira hides the map during the storm.",
    );
  });

  it("lets context hints push a general query through the workspace path", async () => {
    authMock.auth.currentUser = { uid: "user-123" };
    ragServiceMock.runRAG.mockResolvedValueOnce(
      "Your saved workspace has three versions of that scene.",
    );

    const result = await handleAIQuery("Help me compare this scene.", {
      contextHints: [AI_INTENT.USER_DATA],
    });

    expect(ragServiceMock.runRAG).toHaveBeenCalledWith(
      "user-123",
      "Help me compare this scene.",
    );
    expect(result).toBe("Your saved workspace has three versions of that scene.");
  });

  it("routes general requests through the LLM service", async () => {
    llmServiceMock.generateGeneralResponse.mockResolvedValueOnce({
      text: "Try opening with motion and a grounded image.",
      model: "models/gemini-2.5-flash",
      usedFallback: false,
      unavailable: false,
    });

    const result = await routeAiRequest({
      message: "Help me write a stronger first line for a mystery novel.",
    });

    expect(llmServiceMock.generateGeneralResponse).toHaveBeenCalledWith({
      message: "Help me write a stronger first line for a mystery novel.",
      conversationHistory: [],
    });
    expect(result.route).toBe(AI_ROUTE.LLM);
    expect(result.intent).toBe(AI_INTENT.GENERAL);
    expect(result.sources).toEqual([]);
  });

  it("routes capability questions through the structured LLM path", async () => {
    llmServiceMock.generateGeneralResponse.mockResolvedValueOnce({
      text: "I can help with writing, ideas, revision, and your saved drafts.",
      model: "models/gemini-2.5-flash",
      usedFallback: false,
      unavailable: false,
    });

    const result = await routeAiRequest({
      message: "what can you do",
    });

    expect(llmServiceMock.generateGeneralResponse).toHaveBeenCalledWith({
      message: "what can you do",
      conversationHistory: [],
    });
    expect(ragServiceMock.retrieveRelevantContext).not.toHaveBeenCalled();
    expect(modelManagerMock.getSimpleReply).toHaveBeenCalledWith("what can you do");
    expect(result.text).toBe(
      "I can help with writing, ideas, revision, and your saved drafts.",
    );
    expect(result.model).toBe("models/gemini-2.5-flash");
    expect(result.route).toBe(AI_ROUTE.LLM);
    expect(result.intent).toBe(AI_INTENT.GENERAL);
  });

  it("returns a workspace access message when RAG is needed without a user id", async () => {
    const result = await routeAiRequest({
      message: "What are my saved drafts in this workspace?",
    });

    expect(ragServiceMock.retrieveRelevantContext).not.toHaveBeenCalled();
    expect(modelManagerMock.safeGenerate).not.toHaveBeenCalled();
    expect(result.route).toBe(AI_ROUTE.RAG);
    expect(result.intent).toBe(AI_INTENT.USER_DATA);
    expect(result.text).toContain("couldn't access your saved workspace");
  });

  it("uses retrieved workspace context for RAG responses", async () => {
    ragServiceMock.retrieveRelevantContext.mockResolvedValueOnce({
      contextItems: [
        {
          id: "drafts-draft-1",
          section: "drafts",
          sectionLabel: "Drafts",
          title: "Ash Harbor",
          content:
            "Title: Ash Harbor\nContent: Mira hides the map while the harbor storm closes in.",
        },
      ],
      documentsSearched: 3,
      snapshot: { drafts: [{ id: "draft-1", title: "Ash Harbor" }] },
      sources: [
        {
          id: "drafts-draft-1",
          section: "drafts",
          title: "Ash Harbor",
        },
      ],
    });

    modelManagerMock.safeGenerate.mockResolvedValueOnce({
      text: "In Ash Harbor, Mira hides the map while the storm closes in.",
      model: "models/gemini-2.5-flash",
      usedFallback: false,
      unavailable: false,
    });

    const result = await routeAiRequest({
      message: "What happens in my Ash Harbor draft?",
      userId: "user-123",
    });

    expect(ragServiceMock.retrieveRelevantContext).toHaveBeenCalledWith({
      userId: "user-123",
      query: "What happens in my Ash Harbor draft?",
    });
    expect(modelManagerMock.safeGenerate).toHaveBeenCalledTimes(1);
    expect(modelManagerMock.safeGenerate.mock.calls[0][0]).toContain("Ash Harbor");
    expect(result.route).toBe(AI_ROUTE.RAG);
    expect(result.intent).toBe(AI_INTENT.USER_DATA);
    expect(result.sources).toEqual([
      {
        id: "drafts-draft-1",
        section: "drafts",
        title: "Ash Harbor",
      },
    ]);
  });

  it("returns a clear message when no relevant workspace context is found", async () => {
    ragServiceMock.retrieveRelevantContext.mockResolvedValueOnce({
      contextItems: [],
      documentsSearched: 4,
      snapshot: {},
      sources: [],
    });

    const result = await routeAiRequest({
      message: "What notes do I have in my workspace about the silver archive?",
      userId: "user-123",
    });

    expect(modelManagerMock.safeGenerate).not.toHaveBeenCalled();
    expect(result.route).toBe(AI_ROUTE.RAG);
    expect(result.text).toContain("couldn't find anything relevant");
    expect(result.sources).toEqual([]);
  });
});
