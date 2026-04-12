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

  it("opens the new character form and keeps additional information stable once expanded", async () => {
    renderCharacterLab();

    fireEvent.click(screen.getByRole("button", { name: /new character/i }));

    expect(await screen.findByPlaceholderText(/character name/i)).toBeInTheDocument();
    expect(screen.queryByText(/add trait/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /additional information/i }));

    expect(await screen.findByText(/add trait/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/character name/i), {
      target: { value: "Nova Hart" },
    });

    expect(screen.getByDisplayValue("Nova Hart")).toBeInTheDocument();
    expect(screen.getByText(/add trait/i)).toBeInTheDocument();
  });

  it("starts edit mode with additional information collapsed and does not reset when the draft changes", async () => {
    renderCharacterLab("/character-lab/character-1/edit");

    expect(await screen.findByDisplayValue("Avery Vale")).toBeInTheDocument();
    expect(screen.queryByText(/add trait/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /additional information/i }));

    expect(await screen.findByText(/add trait/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/character name/i), {
      target: { value: "Avery Stone" },
    });

    expect(screen.getByDisplayValue("Avery Stone")).toBeInTheDocument();
    expect(screen.getByText(/add trait/i)).toBeInTheDocument();
  });

  it("opens the reader card for a character and scrolls it into view", async () => {
    renderCharacterLab();

    fireEvent.click(screen.getByText("Avery Vale"));

    expect(await screen.findByText(/character reader/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });
});
