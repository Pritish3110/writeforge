import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractRelevantData,
  retrieveRelevantContext,
  runRAG,
} from "@/ai/ragService";

const snapshotServiceMock = vi.hoisted(() => ({
  getSnapshot: vi.fn(),
}));

const modelManagerMock = vi.hoisted(() => ({
  DEFAULT_UNAVAILABLE_MESSAGE:
    "WriterZ AI is taking a short pause. Try again in a moment.",
  safeGenerate: vi.fn(),
}));

vi.mock("@/services/snapshotService.js", () => ({
  getSnapshot: snapshotServiceMock.getSnapshot,
}));

vi.mock("@/ai/modelManager.js", () => ({
  DEFAULT_UNAVAILABLE_MESSAGE: modelManagerMock.DEFAULT_UNAVAILABLE_MESSAGE,
  safeGenerate: modelManagerMock.safeGenerate,
}));

describe("ragService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns relevant workspace records for a user-data query", async () => {
    snapshotServiceMock.getSnapshot.mockResolvedValueOnce({
      drafts: [
        {
          id: "draft-1",
          title: "Ash Harbor",
          content:
            "A storm rolls over the harbor while Mira hides the map inside her coat.",
        },
      ],
      characters: [
        {
          id: "char-1",
          name: "Mira",
          role: "Smuggler",
        },
      ],
    });

    const result = await retrieveRelevantContext({
      userId: "user-1",
      query: "What happens in my Ash Harbor draft?",
    });

    expect(snapshotServiceMock.getSnapshot).toHaveBeenCalledWith("user-1");
    expect(result.contextItems[0]?.title).toContain("Ash Harbor");
    expect(result.sources[0]?.section).toBe("drafts");
  });

  it("returns an empty result when no snapshot is available", async () => {
    snapshotServiceMock.getSnapshot.mockResolvedValueOnce(null);

    const result = await retrieveRelevantContext({
      userId: "user-1",
      query: "What characters do I have?",
    });

    expect(result.contextItems).toEqual([]);
    expect(result.sources).toEqual([]);
    expect(result.documentsSearched).toBe(0);
  });

  it("extracts a compact context window and prefers recent drafts as a fallback", () => {
    const context = extractRelevantData({
      drafts: [
        { id: "draft-1", title: "Old Draft", content: "Old notes." },
        { id: "draft-2", title: "Harbor Night", content: "The harbor is sealed." },
        { id: "draft-3", title: "Glass Archive", content: "The archive doors crack open." },
      ],
    });

    expect(context).toContain("Harbor Night");
    expect(context).toContain("Glass Archive");
    expect(context).not.toContain("Old Draft");
    expect(context.length).toBeLessThanOrEqual(3000);
  });

  it("runs a RAG prompt against saved workspace context", async () => {
    snapshotServiceMock.getSnapshot.mockResolvedValueOnce({
      drafts: [
        {
          id: "draft-1",
          title: "Ash Harbor",
          content:
            "A storm rolls over the harbor while Mira hides the map inside her coat.",
        },
      ],
    });
    modelManagerMock.safeGenerate.mockResolvedValueOnce({
      text: "In Ash Harbor, Mira hides the map as the storm closes in.",
    });

    const result = await runRAG("user-1", "Summarize my Ash Harbor draft.");

    expect(result).toBe(
      "In Ash Harbor, Mira hides the map as the storm closes in.",
    );
    expect(modelManagerMock.safeGenerate).toHaveBeenCalledTimes(1);
    expect(modelManagerMock.safeGenerate.mock.calls[0][0]).toContain(
      "Here is their writing:",
    );
    expect(modelManagerMock.safeGenerate.mock.calls[0][0]).toContain("Ash Harbor");
  });

  it("returns a safe message when workspace retrieval fails", async () => {
    snapshotServiceMock.getSnapshot.mockRejectedValueOnce(new Error("offline"));

    const result = await runRAG("user-1", "What did I write?");

    expect(result).toContain("couldn't retrieve your saved workspace");
  });
});
