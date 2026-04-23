import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteConfirmationProvider } from "@/components/DeleteConfirmationProvider";
import BookshelfPage from "@/pages/WritingPage";
import WritingBookEditPage from "@/pages/WritingBookEditPage";
import WritingBookPreviewPage from "@/pages/WritingBookPreviewPage";
import WritingChapterPage from "@/pages/WritingChapterPage";
import WritingChapterEditorPage from "@/pages/WritingChapterEditorPage";
import {
  readStoredJsonValue,
  resetStorageAdapter,
  writeStoredJsonValue,
} from "@/lib/backend/storageAdapter";
import { STORAGE_KEYS } from "@/lib/storageKeys";

vi.mock("@/services/bookCoverStorage", () => ({
  MAX_BOOK_COVER_FILE_BYTES: 2_000_000,
  uploadBookCover: vi.fn(async () => ({
    coverUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/cover-preview",
    coverStoragePath: "books/firebase-user-001/book-1/cover",
  })),
  deleteBookCover: vi.fn(async () => {}),
  loadBookCoverUrl: vi.fn(async () => null),
  getBookCoverUploadErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error && error.message.trim()
      ? error.message
      : "Please try again with a different image on this device.",
  ),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    displayName: "Iris Vale",
    user: { id: "firebase-user-001" },
  }),
}));

vi.mock("@/contexts/BackendSyncContext", () => ({
  useBackendSync: () => ({
    enabled: true,
    lastSyncedAt: null,
    status: "ready",
    syncNow: vi.fn(async () => {}),
    syncTargetsNow: vi.fn(async () => {}),
  }),
}));

const buildStoredBook = () => {
  const timestamp = "2026-04-23T12:00:00.000Z";

  return [
    {
      id: "book-1",
      title: "Moonlit Archive",
      author: "Avery Lane",
      description: "A rain-soaked mystery hidden behind an old observatory.",
      genre: "Mystery",
      coverUrl: null,
      coverStoragePath: null,
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      chapters: [
        {
          id: "chapter-1",
          title: "Introduction",
          content: "The city kept its secrets close.",
          lastPublishedContent: "The city kept its secrets close.",
          wordCount: 6,
          isPublished: true,
          updatedAt: timestamp,
        },
        {
          id: "chapter-2",
          title: "Prologue",
          content: "A draft chapter that should stay out of reader mode.",
          lastPublishedContent: "",
          wordCount: 10,
          isPublished: false,
          updatedAt: timestamp,
        },
        {
          id: "chapter-3",
          title: "The Beginning",
          content: "Night opened like a door.\n\nThe truth stepped through it.",
          lastPublishedContent: "Night opened like a door.\n\nThe truth stepped through it.",
          wordCount: 10,
          isPublished: true,
          updatedAt: timestamp,
        },
      ],
    },
  ];
};

const renderWithProviders = (ui: ReactElement) =>
  render(<DeleteConfirmationProvider>{ui}</DeleteConfirmationProvider>);

describe("Writing preview routes", () => {
  beforeEach(() => {
    resetStorageAdapter();
  });

  it("opens the preview route when a user clicks a book card", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/writing"]}>
        <Routes>
          <Route path="/writing" element={<BookshelfPage />} />
          <Route path="/writing/:bookId" element={<WritingBookPreviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /add new book/i })[0]);
    fireEvent.click(screen.getByRole("link", { name: /open preview for untitled book/i }));

    await waitFor(() =>
      expect(screen.getByText("Book Preview")).toBeInTheDocument(),
    );
    expect(screen.getByText("Untitled Book")).toBeInTheDocument();
  });

  it("keeps the three-dot menu actions from redirecting into preview mode", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/writing"]}>
        <Routes>
          <Route path="/writing" element={<BookshelfPage />} />
          <Route path="/writing/:bookId" element={<WritingBookPreviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /add new book/i })[0]);

    const menuButton = screen.getByRole("button", {
      name: /book actions for untitled book/i,
    });
    menuButton.focus();
    fireEvent.keyDown(menuButton, { key: "Enter" });
    fireEvent.click(screen.getByText("Book Information"));

    await waitFor(() =>
      expect(screen.getByText("Book Information")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Book Preview")).not.toBeInTheDocument();
  });

  it("renders saved book metadata and chapter list in preview mode", () => {
    writeStoredJsonValue(STORAGE_KEYS.bookshelf, buildStoredBook());

    renderWithProviders(
      <MemoryRouter initialEntries={["/writing/book-1"]}>
        <Routes>
          <Route path="/writing/:bookId" element={<WritingBookPreviewPage />} />
          <Route path="/writing/:bookId/chapter/:chapterId" element={<WritingChapterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Moonlit Archive")).toBeInTheDocument();
    expect(screen.getByText("Avery Lane")).toBeInTheDocument();
    expect(screen.getByText("Mystery")).toBeInTheDocument();
    expect(
      screen.getByText("A rain-soaked mystery hidden behind an old observatory."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /introduction/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /the beginning/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /prologue/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /prologue/i }));

    expect(screen.getByText("This chapter is not published yet.")).toBeInTheDocument();
  });

  it("renders draft chapters in reader mode using last published content when available", async () => {
    writeStoredJsonValue(STORAGE_KEYS.bookshelf, buildStoredBook());

    renderWithProviders(
      <MemoryRouter initialEntries={["/writing/book-1/chapter/chapter-1"]}>
        <Routes>
          <Route path="/writing/:bookId/chapter/:chapterId" element={<WritingChapterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Chapter 1")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Introduction" }),
    ).toBeInTheDocument();
    expect(screen.getByText("The city kept its secrets close.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /^next$/i })[0]);

    await waitFor(() =>
      expect(screen.getByText("Chapter 2")).toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { name: "Prologue" })).toBeInTheDocument();
    expect(screen.getByText("This chapter is not published yet.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /^next$/i })[0]);

    await waitFor(() =>
      expect(screen.getByText("Chapter 3")).toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { name: "The Beginning" })).toBeInTheDocument();
    expect(screen.getByText("Night opened like a door.")).toBeInTheDocument();
  });

  it("routes continue writing to the chapter list edit page", async () => {
    const books = buildStoredBook();
    writeStoredJsonValue(STORAGE_KEYS.bookshelf, books);

    renderWithProviders(
      <MemoryRouter initialEntries={["/writing/book-1"]}>
        <Routes>
          <Route path="/writing/:bookId" element={<WritingBookPreviewPage />} />
          <Route path="/writing/:bookId/edit" element={<WritingBookEditPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue writing/i }));

    await waitFor(() =>
      expect(screen.getByText("Writing Home")).toBeInTheDocument(),
    );
    expect(screen.getByText("Moonlit Archive")).toBeInTheDocument();
  });

  it("routes continue writing to writing home when a book has no chapters", async () => {
    const books = buildStoredBook();
    books[0].chapters = [];
    writeStoredJsonValue(STORAGE_KEYS.bookshelf, books);

    renderWithProviders(
      <MemoryRouter initialEntries={["/writing/book-1"]}>
        <Routes>
          <Route path="/writing/:bookId" element={<WritingBookPreviewPage />} />
          <Route path="/writing/:bookId/edit" element={<WritingBookEditPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue writing/i }));

    await waitFor(() =>
      expect(
        screen.getByText("No chapters yet. Start writing your story."),
      ).toBeInTheDocument(),
    );
  });

  it("creates, saves, and publishes chapters in the editor flow without breaking preview data", async () => {
    const books = buildStoredBook();
    books[0].chapters = [];
    writeStoredJsonValue(STORAGE_KEYS.bookshelf, books);

    renderWithProviders(
      <MemoryRouter initialEntries={["/writing/book-1/edit"]}>
        <Routes>
          <Route path="/writing/:bookId/edit" element={<WritingBookEditPage />} />
          <Route path="/writing/:bookId/edit/:chapterId" element={<WritingChapterEditorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /add chapter/i })[0]);

    await waitFor(() =>
      expect(screen.getByDisplayValue("Chapter - 1")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByDisplayValue("Chapter - 1"), {
      target: { value: "Arrival" },
    });
    fireEvent.change(screen.getByPlaceholderText("Start writing..."), {
      target: { value: "The lantern flickered once before dawn." },
    });

    expect(screen.getByText("Words: 6")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      const storedBooks = readStoredJsonValue(STORAGE_KEYS.bookshelf, []) as Array<{
        chapters?: Array<{ title?: string; wordCount?: number; isPublished?: boolean }>;
      }>;
      expect(storedBooks[0]?.chapters?.[0]?.title).toBe("Arrival");
      expect(storedBooks[0]?.chapters?.[0]?.wordCount).toBe(6);
      expect(storedBooks[0]?.chapters?.[0]?.isPublished).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      const storedBooks = readStoredJsonValue(STORAGE_KEYS.bookshelf, []) as Array<{
        chapters?: Array<{ isPublished?: boolean; content?: string }>;
      }>;
      expect(storedBooks[0]?.chapters?.[0]?.isPublished).toBe(true);
      expect(storedBooks[0]?.chapters?.[0]?.content).toBe(
        "The lantern flickered once before dawn.",
      );
    });

    fireEvent.change(screen.getByDisplayValue("Arrival"), {
      target: { value: "Arrival Again" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      const storedBooks = readStoredJsonValue(STORAGE_KEYS.bookshelf, []) as Array<{
        chapters?: Array<{ title?: string; isPublished?: boolean }>;
      }>;
      expect(storedBooks[0]?.chapters?.[0]?.title).toBe("Arrival Again");
      expect(storedBooks[0]?.chapters?.[0]?.isPublished).toBe(false);
    });
  });

  it("can delete a single chapter and bulk delete all chapters from the edit page", async () => {
    writeStoredJsonValue(STORAGE_KEYS.bookshelf, buildStoredBook());

    renderWithProviders(
      <MemoryRouter initialEntries={["/writing/book-1/edit"]}>
        <Routes>
          <Route path="/writing/:bookId/edit" element={<WritingBookEditPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /delete introduction/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete chapter/i }));

    await waitFor(() => {
      const storedBooks = readStoredJsonValue(STORAGE_KEYS.bookshelf, []) as Array<{
        chapters?: Array<{ title?: string }>;
      }>;
      expect(storedBooks[0]?.chapters?.map((chapter) => chapter.title)).toEqual([
        "Prologue",
        "The Beginning",
      ]);
    });

    fireEvent.click(screen.getByRole("button", { name: /delete all/i }));
    fireEvent.change(screen.getByLabelText("Confirmation"), {
      target: { value: "delete all chapters in Moonlit Archive" },
    });
    fireEvent.click(screen.getByRole("button", { name: /delete all chapters/i }));

    await waitFor(() => {
      const storedBooks = readStoredJsonValue(STORAGE_KEYS.bookshelf, []) as Array<{
        chapters?: Array<unknown>;
      }>;
      expect(storedBooks[0]?.chapters).toEqual([]);
    });
  });
});
