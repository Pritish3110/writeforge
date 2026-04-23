import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkspaceSyncTargetForStorageKey, WORKSPACE_COLLECTIONS } from "@/lib/backend/workspaceSnapshot";
import { resetStorageAdapter } from "@/lib/backend/storageAdapter";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { deleteBookCover, uploadBookCover } from "@/services/bookCoverStorage";
import BookshelfPage from "@/pages/WritingPage";

const { syncTargetsNowMock } = vi.hoisted(() => ({
  syncTargetsNowMock: vi.fn(async () => {}),
}));

vi.mock("@/services/bookCoverStorage", () => ({
  MAX_BOOK_COVER_FILE_BYTES: 2_000_000,
  uploadBookCover: vi.fn(async () => ({
    coverUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/cover-preview",
    coverStoragePath: "covers/firebase-user-001/book-1/cover-123",
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
    syncTargetsNow: syncTargetsNowMock,
  }),
}));

describe("BookshelfPage", () => {
  const createObjectURLMock = vi.fn(() => "https://firebasestorage.googleapis.com/v0/b/test/o/cover-preview");
  const revokeObjectURLMock = vi.fn();
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalFetch = globalThis.fetch;
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    blob: async () => new Blob(["cover"], { type: "image/png" }),
  }));

  beforeEach(() => {
    resetStorageAdapter();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
  });

  afterEach(() => {
    resetStorageAdapter();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: originalFetch,
    });
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <BookshelfPage />
      </MemoryRouter>,
    );

  const addBook = () => {
    fireEvent.click(screen.getAllByRole("button", { name: /add new book/i })[0]);
  };

  const openBookMenu = (index = 0) => {
    const button = screen.getAllByRole("button", { name: /book actions for .+/i })[index];
    button.focus();
    fireEvent.keyDown(button, { key: "Enter" });
  };

  it("adds a new default book to the shelf immediately", () => {
    renderPage();

    expect(screen.getByText("Your shelf is ready")).toBeInTheDocument();

    addBook();

    expect(screen.getByText("Untitled Book")).toBeInTheDocument();
    expect(screen.getByText("Iris Vale")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /book actions for untitled book/i })).toBeInTheDocument();
  });

  it("registers the bookshelf collection for workspace sync", () => {
    expect(
      WORKSPACE_COLLECTIONS.some(({ snapshotKey, collectionName, storageKey }) =>
        snapshotKey === "bookshelf" &&
        collectionName === "bookshelf" &&
        storageKey === STORAGE_KEYS.bookshelf,
      ),
    ).toBe(true);
    expect(getWorkspaceSyncTargetForStorageKey(STORAGE_KEYS.bookshelf)).toBe("bookshelf");
  });

  it("pins a book to the top and opens the placeholder information modal", async () => {
    renderPage();
    addBook();

    openBookMenu();
    fireEvent.click(screen.getByText("Pin to Top"));

    expect(screen.getByText("Pinned")).toBeInTheDocument();

    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));

    expect(screen.getByText("Book Information")).toBeInTheDocument();
    expect(screen.getByLabelText("Book Title")).toHaveValue("Untitled Book");
    expect(screen.getByLabelText("Author")).toHaveValue("Iris Vale");
    expect(screen.getByLabelText("Description")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Book Title")).not.toBeInTheDocument(),
    );
  });

  it("saves book information fields only after the user confirms", async () => {
    renderPage();
    addBook();

    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));

    fireEvent.change(screen.getByLabelText("Book Title"), {
      target: { value: "  Moonlit Draft  " },
    });
    fireEvent.change(screen.getByLabelText("Author"), {
      target: { value: "Avery Lane" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A mystery set in a rain-soaked city." },
    });

    expect(screen.getByDisplayValue("Moonlit Draft")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Avery Lane")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A mystery set in a rain-soaked city.")).toBeInTheDocument();
    expect(screen.queryByText("Moonlit Draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Avery Lane")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    await waitFor(() => expect(screen.getByText("Moonlit Draft")).toBeInTheDocument());
    expect(screen.getByText("Avery Lane")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByLabelText("Book Title")).not.toBeInTheDocument(),
    );
  });

  it("keeps saved book data and cover after a reload", async () => {
    const firstRender = renderPage();
    addBook();

    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));

    fireEvent.change(screen.getByLabelText("Book Title"), {
      target: { value: "  Ember Archive  " },
    });
    fireEvent.change(screen.getByLabelText("Author"), {
      target: { value: "Lena Hart" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Notes for a long-form fantasy project." },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload cover for untitled book/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["cover"], "cover.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    await waitFor(() =>
      expect(screen.getByAltText("Untitled Book cover")).toHaveAttribute(
        "src",
        "https://firebasestorage.googleapis.com/v0/b/test/o/cover-preview",
      ),
    );
    expect(uploadBookCover).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    await waitFor(() => expect(uploadBookCover).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByLabelText("Book Title")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Ember Archive")).toBeInTheDocument();

    firstRender.unmount();
    renderPage();

    expect(screen.getByText("Ember Archive")).toBeInTheDocument();
    expect(screen.getByText("Lena Hart")).toBeInTheDocument();
    expect(screen.getByAltText("Ember Archive cover")).toBeInTheDocument();
  });

  it("shows inline errors and blocks saving when title or author are invalid", async () => {
    renderPage();
    addBook();

    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));

    fireEvent.change(screen.getByLabelText("Book Title"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("Author"), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    expect(screen.getByText("Title cannot be empty.")).toBeInTheDocument();
    expect(screen.getByText("Author cannot be empty.")).toBeInTheDocument();
    expect(screen.getByLabelText("Book Title")).toHaveValue("   ");
    expect(screen.getByText("Untitled Book")).toBeInTheDocument();
    expect(screen.getByText("Iris Vale")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Book Title"), {
      target: { value: "Saved Title" },
    });

    await waitFor(() =>
      expect(screen.queryByText("Title cannot be empty.")).not.toBeInTheDocument(),
    );
  });

  it("keeps cover changes in the modal draft until the user saves", async () => {
    renderPage();
    addBook();

    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));
    fireEvent.click(screen.getByRole("button", { name: /upload cover for untitled book/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["cover"], "cover.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    await waitFor(() =>
      expect(screen.getByAltText("Untitled Book cover")).toHaveAttribute(
        "src",
        "https://firebasestorage.googleapis.com/v0/b/test/o/cover-preview",
      ),
    );
    expect(uploadBookCover).not.toHaveBeenCalled();
    expect(syncTargetsNowMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Book Title")).not.toBeInTheDocument(),
    );
    expect(screen.queryAllByAltText("Untitled Book cover")).toHaveLength(0);
  });

  it("downloads the uploaded cover from the book information modal", async () => {
    renderPage();
    addBook();

    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));
    fireEvent.click(screen.getByRole("button", { name: /upload cover for untitled book/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["cover"], "cover.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    await waitFor(() => expect(uploadBookCover).toHaveBeenCalled());
    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));

    const anchorClickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
        const element = originalCreateElement(tagName, options);

        if (tagName === "a") {
          Object.defineProperty(element, "click", {
            configurable: true,
            value: anchorClickMock,
          });
        }

        return element;
      }) as typeof document.createElement);

    fireEvent.click(screen.getByRole("button", { name: /download cover for untitled book/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "https://firebasestorage.googleapis.com/v0/b/test/o/cover-preview",
      ),
    );
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    createElementSpy.mockRestore();
  });

  it("updates only the targeted book without overwriting pinned or cover data on other books", async () => {
    renderPage();
    addBook();
    addBook();

    openBookMenu(0);
    fireEvent.click(screen.getByText("Book Information"));
    fireEvent.click(screen.getByRole("button", { name: /upload cover for untitled book/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["cover"], "cover.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    await waitFor(() => expect(uploadBookCover).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByLabelText("Book Title")).not.toBeInTheDocument(),
    );

    openBookMenu(0);
    fireEvent.click(screen.getByText("Pin to Top"));
    expect(screen.getAllByText("Pinned")).toHaveLength(1);

    openBookMenu(1);
    fireEvent.click(screen.getByText("Book Information"));

    fireEvent.change(screen.getByLabelText("Book Title"), {
      target: { value: "  River Notes  " },
    });
    fireEvent.change(screen.getByLabelText("Author"), {
      target: { value: "Mara Skye" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    await waitFor(() => expect(screen.getByText("River Notes")).toBeInTheDocument());
    expect(screen.getByText("Mara Skye")).toBeInTheDocument();
    expect(screen.getAllByText("Untitled Book")).toHaveLength(1);
    expect(screen.getAllByText("Pinned")).toHaveLength(1);
    expect(screen.getByAltText("Untitled Book cover")).toBeInTheDocument();
  });

  it("requires an exact confirmation phrase before deleting a book", async () => {
    renderPage();
    addBook();

    openBookMenu();
    fireEvent.click(screen.getByText("Delete Book"));

    fireEvent.click(screen.getByRole("button", { name: /^delete book$/i }));
    expect(
      screen.getByText('Type exactly "delete Untitled Book" to delete this book.'),
    ).toBeInTheDocument();
    expect(screen.getByText("Untitled Book")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Confirmation"), {
      target: {
        value: "delete Untitled Book",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /^delete book$/i }));

    await waitFor(() =>
      expect(screen.queryByText("Untitled Book")).not.toBeInTheDocument(),
    );
  });

  it("removes an uploaded cover from the modal", async () => {
    renderPage();
    addBook();

    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));
    fireEvent.click(screen.getByRole("button", { name: /upload cover for untitled book/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["cover"], "cover.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    await waitFor(() => expect(uploadBookCover).toHaveBeenCalled());
    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(screen.getByText("Upload Cover")).toBeInTheDocument();
    expect(screen.getAllByAltText("Untitled Book cover")).toHaveLength(1);
    expect(deleteBookCover).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    await waitFor(() =>
      expect(screen.queryAllByAltText("Untitled Book cover")).toHaveLength(0),
    );
    expect(deleteBookCover).toHaveBeenCalled();
    expect(syncTargetsNowMock).toHaveBeenCalledWith(["bookshelf"]);
  });

  it("keeps a removed cover gone after a reload", async () => {
    const firstRender = renderPage();
    addBook();

    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));
    fireEvent.click(screen.getByRole("button", { name: /upload cover for untitled book/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["cover"], "cover.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    await waitFor(() => expect(uploadBookCover).toHaveBeenCalled());
    openBookMenu();
    fireEvent.click(screen.getByText("Book Information"));

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(screen.getByText("Upload Cover")).toBeInTheDocument();
    expect(screen.getAllByAltText("Untitled Book cover")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /save book/i }));

    await waitFor(() =>
      expect(screen.queryAllByAltText("Untitled Book cover")).toHaveLength(0),
    );

    firstRender.unmount();
    renderPage();

    expect(screen.queryAllByAltText("Untitled Book cover")).toHaveLength(0);
  });
});
