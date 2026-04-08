import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DeleteConfirmationProvider } from "@/components/DeleteConfirmationProvider";
import WorldElementDesigner from "@/components/tasks/WorldElementDesigner";
import { WORLD_ELEMENTS_STORAGE_KEY } from "@/lib/worldElements";
import {
  readStoredJsonValue,
  resetStorageAdapter,
  writeStoredJsonValue,
} from "@/lib/backend/storageAdapter";

const { mockGenerateWorldElementPrompt, mockedPrompt } = vi.hoisted(() => ({
  mockGenerateWorldElementPrompt: vi.fn(),
  mockedPrompt: {
    prompt:
      "Create a magic element where ley-line flow operates via ritual activation, affecting institutional control and resulting in ritual collapse.",
    title: "Artifacts: Ley-line Flow",
    category: "magic",
    element: "artifacts",
    core: "ley-line flow",
    mechanic: "ritual activation",
    impact: "institutional control",
    consequence: "ritual collapse",
    recycledPool: false,
    usedCount: 1,
  },
}));

vi.mock("@/data/worldEngine", async () => {
  const actual = await vi.importActual<typeof import("@/data/worldEngine")>("@/data/worldEngine");

  return {
    ...actual,
    generateWorldElementPrompt: mockGenerateWorldElementPrompt,
  };
});

describe("WorldElementDesigner", () => {
  beforeEach(() => {
    resetStorageAdapter();
    mockGenerateWorldElementPrompt.mockReset();
    mockGenerateWorldElementPrompt.mockReturnValue(mockedPrompt);
  });

  const renderDesigner = () =>
    render(
      <DeleteConfirmationProvider>
        <MemoryRouter>
          <WorldElementDesigner />
        </MemoryRouter>
      </DeleteConfirmationProvider>,
    );

  it("fills the generated breakdown when prompt sync is unlocked", () => {
    renderDesigner();

    fireEvent.click(screen.getByRole("button", { name: /generate prompt/i }));

    expect(mockGenerateWorldElementPrompt).toHaveBeenCalledWith({
      category: "physical",
      element: "weather",
    });
    expect(screen.getByPlaceholderText("Auto-suggested from Core Concept")).toHaveValue(mockedPrompt.title);
    expect(screen.getByPlaceholderText("What is this element?")).toHaveValue(mockedPrompt.core);
    expect(screen.getByPlaceholderText("How does it work?")).toHaveValue(mockedPrompt.mechanic);
    expect(screen.getByPlaceholderText("Who does it affect?")).toHaveValue(mockedPrompt.impact);
    expect(screen.getByPlaceholderText("What are the costs, risks, or consequences?")).toHaveValue(
      mockedPrompt.consequence,
    );
  });

  it("only syncs title, category, and element when prompt sync is locked", async () => {
    renderDesigner();

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: /generate prompt/i }));

    expect(screen.getByPlaceholderText("Auto-suggested from Core Concept")).toHaveValue(mockedPrompt.title);
    expect(screen.getByPlaceholderText("What is this element?")).toHaveValue("");
    expect(screen.getByPlaceholderText("How does it work?")).toHaveValue("");
    expect(screen.getByPlaceholderText("Who does it affect?")).toHaveValue("");
    expect(screen.getByPlaceholderText("What are the costs, risks, or consequences?")).toHaveValue("");

    fireEvent.change(screen.getByPlaceholderText("How can this be used in a narrative?"), {
      target: { value: "Use this as the pressure point in a political scene." },
    });
    fireEvent.click(screen.getByRole("button", { name: /save element/i }));

    await waitFor(() => {
      const records = readStoredJsonValue(WORLD_ELEMENTS_STORAGE_KEY, []);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        title: mockedPrompt.title,
        category: mockedPrompt.category,
        element: mockedPrompt.element,
      });
    });
  });

  it("deletes a saved world element after confirmation", async () => {
    writeStoredJsonValue(
      WORLD_ELEMENTS_STORAGE_KEY,
      [
        {
          id: "world-artifact-1",
          category: "magic",
          element: "artifacts",
          title: "Artifacts: Ley-line Flow",
          content: {
            concept: "ley-line flow",
            mechanics: "ritual activation",
            impact: "institutional control",
            tradeoffs: "ritual collapse",
            storyUse: "Use this to destabilize court politics.",
          },
          createdAt: "2026-04-04T00:00:00.000Z",
          updatedAt: "2026-04-04T00:00:00.000Z",
          prompt: mockedPrompt.prompt,
        },
      ],
    );

    renderDesigner();

    fireEvent.click(screen.getByRole("button", { name: /delete artifacts: ley-line flow/i }));
    expect(screen.getByText('Delete "Artifacts: Ley-line Flow"?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delete element/i }));

    await waitFor(() => {
      expect(screen.queryByText("Artifacts: Ley-line Flow")).not.toBeInTheDocument();
      expect(readStoredJsonValue(WORLD_ELEMENTS_STORAGE_KEY, [])).toHaveLength(0);
    });
  });
});
