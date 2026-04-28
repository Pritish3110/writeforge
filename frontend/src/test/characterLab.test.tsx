import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DeleteConfirmationProvider } from "@/components/DeleteConfirmationProvider";
import CharacterLab from "@/pages/CharacterLab";
import { resetStorageAdapter, writeStoredJsonValue } from "@/lib/backend/storageAdapter";

const scrollIntoViewMock = vi.fn();

const sampleCharacters = [
  {
    id: "character-1",
    name: "Avery Vale",
    type: "Main Character",
    logline: "A strategist trying to outrun a family legacy.",
    ghost: "",
    lie: "",
    want: "",
    need: "",
    truth: "",
    designing_principle: "",
    moral_problem: "",
    worthy_cause: "",
    personality_traits: [],
    theme: {
      lie_based: "",
      truth_based: "",
    },
    contradictions: [],
    pinned: false,
    order: 0,
  },
];

const renderCharacterLab = (initialEntry = "/character-lab") =>
  render(
    <DeleteConfirmationProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/character-lab/*" element={<CharacterLab />} />
        </Routes>
      </MemoryRouter>
    </DeleteConfirmationProvider>,
  );

describe("CharacterLab", () => {
  beforeEach(() => {
    resetStorageAdapter();
    writeStoredJsonValue("writeforge-characters", sampleCharacters);
    scrollIntoViewMock.mockReset();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  it("opens the dedicated create page and advances through the step flow", async () => {
    renderCharacterLab();

    fireEvent.click(screen.getByRole("button", { name: /new character/i }));

    expect(await screen.findByLabelText(/character name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view character lab/i })).toBeEnabled();
    expect(screen.getByText(/step 1\. basics/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /step 2\. identity/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /step 3\. personality/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^next step$/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/character name/i), {
      target: { value: "Nova Hart" },
    });
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /main character/i }));
    expect(screen.getByRole("button", { name: /view character lab/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /step 2\. identity/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^next step$/i })).toBeEnabled();

    expect(await screen.findByLabelText(/^ghost$/i)).toBeInTheDocument();
    expect(screen.getByText(/^example$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous ghost example/i })).toBeDisabled();
    const nextGhostExampleButton = screen.getByRole("button", { name: /next ghost example/i });
    expect(nextGhostExampleButton).toBeEnabled();
    fireEvent.click(nextGhostExampleButton);
    fireEvent.click(nextGhostExampleButton);
    expect(nextGhostExampleButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /next card/i }));
    expect(await screen.findByLabelText(/^lie$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next card/i }));
    expect(await screen.findByLabelText(/^want$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next card/i }));
    expect(await screen.findByLabelText(/^need$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next card/i }));
    expect(await screen.findByLabelText(/^truth$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^next step$/i }));

    expect(await screen.findByLabelText(/designing principle/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /step 3\. personality/i }));
    expect(screen.getByText(/personality traits/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add trait/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^save character$/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /^save character$/i }));

    expect(await screen.findByText("Nova Hart")).toBeInTheDocument();
  });

  it("starts edit mode on the full-page form and preserves the draft across steps", async () => {
    renderCharacterLab("/character-lab/character-1/edit");

    expect(await screen.findByDisplayValue("Avery Vale")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/character name/i), {
      target: { value: "Avery Stone" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^next step$/i }));

    expect(await screen.findByLabelText(/designing principle/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /step 1\. basics/i }));

    expect(screen.getByDisplayValue("Avery Stone")).toBeInTheDocument();
  });

  it("opens the reader card for a character and scrolls it into view", async () => {
    renderCharacterLab();

    fireEvent.click(screen.getByRole("button", { name: /open profile/i }));

    expect(await screen.findByText(/character reader/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });
});
