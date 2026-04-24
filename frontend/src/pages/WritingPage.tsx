import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { BookPlus, Download, Loader2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BookCard } from "@/components/writing/BookCard";
import {
  createDefaultBook,
  hydrateBooks,
  serializeBooks,
  type Book,
} from "@/components/writing/types";
import { PenMark } from "@/components/brand/PenMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useBackendSync } from "@/contexts/BackendSyncContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { getBookPreviewRoute } from "@/lib/writing/bookshelf";
import {
  deleteBookCover,
  getBookCoverUploadErrorMessage,
  loadBookCoverUrl,
  MAX_BOOK_COVER_FILE_BYTES,
  uploadBookCover,
} from "@/services/bookCoverStorage";
import { validateImageFile } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import { downloadBookAsPdf, downloadBookAsDocx } from "@/services/bookExportService";
import { getStoredDisplayName } from "@/lib/backend/workspaceSnapshot";

const getAuthorName = (value: string | null | undefined) => value?.trim() || "User";
const dialogClassName = "max-w-5xl overflow-hidden border-border bg-card p-0";
const sanitizeFileSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "book";
const inputClassName =
  "h-12 rounded-[12px] border-input bg-background/70 px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,background-color] duration-150 focus-visible:border-foreground/16";
const textareaClassName =
  "min-h-[220px] resize-none rounded-[16px] border-input bg-background/70 px-3.5 py-3 text-sm leading-7 text-foreground placeholder:text-muted-foreground transition-[border-color,background-color] duration-150 focus-visible:border-foreground/16";

const sortBooks = (books: Book[]) =>
  [...books].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return 0;
  });

const mergeBooksWithPersistedState = (
  _currentBooks: Book[],
  persistedBooks: Book[],
) => persistedBooks;

interface BookInfoDraft {
  title: string;
  author: string;
  description: string;
  genre: string;
  coverPreviewUrl: string | null;
  pendingCoverFile: File | null;
}

interface BookInfoErrors {
  title: string | null;
  author: string | null;
}

const emptyBookInfoErrors: BookInfoErrors = {
  title: null,
  author: null,
};

const getFileExtensionFromMimeType = (mimeType: string) => {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
};

const getFileExtensionFromName = (fileName: string) => {
  const extensionMatch = fileName.match(/\.[a-z0-9]+$/i);
  return extensionMatch?.[0]?.toLowerCase() || "";
};

const getFileExtensionFromUrl = (value: string) => {
  try {
    const pathname = new URL(value).pathname;
    const extensionMatch = pathname.match(/\.[a-z0-9]+$/i);
    return extensionMatch?.[0]?.toLowerCase() || "";
  } catch {
    return "";
  }
};

const getCoverDownloadFilename = (
  title: string,
  options?: {
    fileName?: string | null;
    mimeType?: string | null;
    url?: string | null;
  },
) => {
  const extension =
    (options?.fileName ? getFileExtensionFromName(options.fileName) : "") ||
    (options?.mimeType ? getFileExtensionFromMimeType(options.mimeType) : "") ||
    (options?.url ? getFileExtensionFromUrl(options.url) : "");

  return `${sanitizeFileSegment(title)}-cover${extension}`;
};

const BookshelfPage = () => {
  const navigate = useNavigate();
  const { displayName, user } = useAuth();
  const { enabled: isBackendSyncEnabled, syncTargetsNow } = useBackendSync();
  const [storedBooks, setStoredBooks] = useLocalStorage<unknown[]>(
    STORAGE_KEYS.bookshelf,
    [],
  );
  const [books, setBooks] = useState<Book[]>(() => hydrateBooks(storedBooks));
  const [bookInfoId, setBookInfoId] = useState<string | null>(null);
  const [bookInfoDraft, setBookInfoDraft] = useState<BookInfoDraft | null>(null);
  const [bookInfoErrors, setBookInfoErrors] = useState<BookInfoErrors>(emptyBookInfoErrors);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isCoverDragActive, setIsCoverDragActive] = useState(false);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [deleteConfirmationError, setDeleteConfirmationError] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCoverBookIdRef = useRef<string | null>(null);
  const draftCoverObjectUrlRef = useRef<string | null>(null);

  const lastPersistedBooksJsonRef = useRef(JSON.stringify(storedBooks));
  const lastHydratedUserIdRef = useRef<string | null>(user?.id || null);
  const resolvedCoverPathsRef = useRef(new Set<string>());
  const booksRef = useRef(books);

  const revokeDraftCoverObjectUrl = useCallback(() => {
    if (!draftCoverObjectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(draftCoverObjectUrlRef.current);
    draftCoverObjectUrlRef.current = null;
  }, []);

  const commitBooks = useCallback(
    (nextBooksOrUpdater: Book[] | ((currentBooks: Book[]) => Book[])) => {
      const nextBooks =
        typeof nextBooksOrUpdater === "function"
          ? nextBooksOrUpdater(booksRef.current)
          : nextBooksOrUpdater;
      const serializedBooks = serializeBooks(nextBooks);

      booksRef.current = nextBooks;
      lastPersistedBooksJsonRef.current = JSON.stringify(serializedBooks);
      setBooks(nextBooks);
      setStoredBooks(serializedBooks);
    },
    [setStoredBooks],
  );

  const handleAddBook = () => {
    const nextBook = createDefaultBook(getAuthorName(displayName));

    commitBooks((current) => [nextBook, ...current]);
  };

  const orderedBooks = useMemo(() => sortBooks(books), [books]);
  const activeBookInfo = useMemo(
    () => books.find((book) => book.id === bookInfoId) || null,
    [bookInfoId, books],
  );
  const bookPendingDelete = useMemo(
    () => books.find((book) => book.id === deleteBookId) || null,
    [books, deleteBookId],
  );
  const requiredDeletePhrase = bookPendingDelete
    ? `delete ${bookPendingDelete.title}`
    : "";



  useEffect(() => {
    const persistedBooks = hydrateBooks(storedBooks);
    const persistedBooksJson = JSON.stringify(storedBooks);
    lastPersistedBooksJsonRef.current = persistedBooksJson;

    if (lastHydratedUserIdRef.current !== (user?.id || null)) {
      lastHydratedUserIdRef.current = user?.id || null;
      booksRef.current = persistedBooks;
      setBooks(persistedBooks);
      return;
    }

    setBooks((currentBooks) => {
      const nextBooks = mergeBooksWithPersistedState(currentBooks, persistedBooks);
      booksRef.current = nextBooks;
      return nextBooks;
    });
  }, [storedBooks, user?.id]);

  useEffect(() => {
    const serializedBooks = serializeBooks(books);
    const serializedBooksJson = JSON.stringify(serializedBooks);

    if (serializedBooksJson === lastPersistedBooksJsonRef.current) {
      return;
    }

    lastPersistedBooksJsonRef.current = serializedBooksJson;
    setStoredBooks(serializedBooks);
  }, [books, setStoredBooks]);

  useEffect(() => {
    booksRef.current = books;
  }, [books, commitBooks]);



  useEffect(() => {
    const booksToResolve = books.filter(
      (book) =>
        book.coverStoragePath &&
        !book.coverUrl &&
        !resolvedCoverPathsRef.current.has(book.coverStoragePath),
    );

    if (booksToResolve.length === 0) {
      return;
    }

    let cancelled = false;

    const resolveMissingCovers = async () => {
      const results = await Promise.all(
        booksToResolve.map(async (book) => ({
          id: book.id,
          coverStoragePath: book.coverStoragePath!,
          coverUrl: await loadBookCoverUrl(book.coverStoragePath),
        })),
      );

      if (cancelled) {
        return;
      }

      // Mark paths as resolved only after a successful, non-cancelled load.
      for (const entry of results) {
        resolvedCoverPathsRef.current.add(entry.coverStoragePath);
      }

      const validResults = results.filter(
        (entry): entry is { id: string; coverStoragePath: string; coverUrl: string } =>
          entry.coverUrl !== null,
      );

      if (validResults.length === 0) {
        return;
      }

      const coverMap = new Map(
        validResults.map((entry) => [entry.id, entry.coverUrl]),
      );

      commitBooks((current) =>
        current.map((book) => {
          const resolvedUrl = coverMap.get(book.id);
          return resolvedUrl && !book.coverUrl
            ? { ...book, coverUrl: resolvedUrl }
            : book;
        }),
      );
    };

    void resolveMissingCovers();

    return () => {
      cancelled = true;
    };
  }, [books]);

  useEffect(() => {
    if (!bookInfoId || !activeBookInfo) {
      revokeDraftCoverObjectUrl();
      setBookInfoDraft(null);
      setBookInfoErrors(emptyBookInfoErrors);
      return;
    }

    revokeDraftCoverObjectUrl();
    setBookInfoDraft({
      title: activeBookInfo.title,
      author: activeBookInfo.author,
      description: activeBookInfo.description,
      genre: activeBookInfo.genre,
      coverPreviewUrl: activeBookInfo.coverUrl,
      pendingCoverFile: null,
    });
    setBookInfoErrors(emptyBookInfoErrors);
  }, [bookInfoId, activeBookInfo?.id, revokeDraftCoverObjectUrl]);

  useEffect(() => () => {
    revokeDraftCoverObjectUrl();
  }, [revokeDraftCoverObjectUrl]);

  const updateBook = (bookId: string, updater: (book: Book) => Book) => {
    commitBooks((current) =>
      current.map((book) => (book.id === bookId ? updater(book) : book)),
    );
  };

  const handleTogglePin = (bookId: string) => {
    updateBook(bookId, (book) => ({
      ...book,
      pinned: !book.pinned,
      updatedAt: new Date(),
    }));
  };

  const handleOpenBookInfo = (bookId: string) => {
    setBookInfoId(bookId);
  };

  const handleBookInfoChange = (
    field: keyof BookInfoDraft,
    value: string,
  ) => {
    setBookInfoDraft((current) => (current ? { ...current, [field]: value } : current));

    if (field === "title" || field === "author") {
      setBookInfoErrors((current) => ({ ...current, [field]: null }));
    }
  };

  const closeBookInfoDialog = () => {
    revokeDraftCoverObjectUrl();
    setBookInfoId(null);
    setBookInfoDraft(null);
    setBookInfoErrors(emptyBookInfoErrors);
    setIsSavingBook(false);
    setIsCoverDragActive(false);
  };

  const handleSaveBookInfo = async () => {
    if (!activeBookInfo || !bookInfoDraft) {
      return;
    }

    const trimmedTitle = bookInfoDraft.title.trim();
    const nextErrors: BookInfoErrors = {
      title: trimmedTitle ? null : "Title cannot be empty.",
      author: bookInfoDraft.author.trim() ? null : "Author cannot be empty.",
    };

    if (nextErrors.title || nextErrors.author) {
      setBookInfoErrors(nextErrors);
      return;
    }

    setBookInfoErrors(emptyBookInfoErrors);
    setIsSavingBook(true);

    try {
      let nextCoverUrl = activeBookInfo.coverUrl;
      let nextCoverStoragePath = activeBookInfo.coverStoragePath;
      let shouldSyncBookshelf = false;

      if (bookInfoDraft.pendingCoverFile) {
        if (!user?.id) {
          toast.error("Sign in required", {
            description: "Sign in to upload and sync book covers.",
          });
          return;
        }

        setIsCoverUploading(true);

        const uploadedCover = await uploadBookCover(
          user.id,
          activeBookInfo.id,
          bookInfoDraft.pendingCoverFile,
        );

        nextCoverUrl = uploadedCover.coverUrl;
        nextCoverStoragePath = uploadedCover.coverStoragePath;
        shouldSyncBookshelf = true;
      } else if (
        !bookInfoDraft.coverPreviewUrl &&
        (activeBookInfo.coverUrl || activeBookInfo.coverStoragePath)
      ) {
        setIsCoverUploading(true);
        await deleteBookCover(activeBookInfo.coverStoragePath);
        nextCoverUrl = null;
        nextCoverStoragePath = null;
        shouldSyncBookshelf = true;
      }

      updateBook(activeBookInfo.id, (book) => ({
        ...book,
        title: trimmedTitle,
        author: bookInfoDraft.author,
        description: bookInfoDraft.description,
        genre: bookInfoDraft.genre,
        coverUrl: nextCoverUrl,
        coverStoragePath: nextCoverStoragePath,
        updatedAt: new Date(),
      }));

      if (shouldSyncBookshelf && isBackendSyncEnabled) {
        try {
          await syncTargetsNow(["bookshelf"]);
        } catch (syncError) {
          console.error("Unable to sync the updated cover to the workspace.", syncError);
          toast.error("Cover saved locally", {
            description:
              "The cover changed here, but cloud sync still needs another try.",
          });
        }
      }

      closeBookInfoDialog();
    } catch (error) {
      console.error("Unable to save the book information.", error);
      toast.error("Book save failed", {
        description: getBookCoverUploadErrorMessage(error),
      });
    } finally {
      setIsSavingBook(false);
      setIsCoverUploading(false);
    }
  };

  const handleOpenDelete = (bookId: string) => {
    setDeleteBookId(bookId);
    setDeleteConfirmationInput("");
    setDeleteConfirmationError(null);
  };

  const closeDeleteDialog = () => {
    setDeleteBookId(null);
    setDeleteConfirmationInput("");
    setDeleteConfirmationError(null);
  };

  const handleDeleteBook = async () => {
    if (!bookPendingDelete) {
      return;
    }

    if (deleteConfirmationInput !== requiredDeletePhrase) {
      setDeleteConfirmationError(
        `Type exactly "${requiredDeletePhrase}" to delete this book.`,
      );
      return;
    }


    void deleteBookCover(bookPendingDelete.coverStoragePath);

    commitBooks((current) =>
      current.filter((book) => book.id !== bookPendingDelete.id),
    );
    closeDeleteDialog();
  };

  const handleUpdateCoverRequest = (bookId: string) => {
    pendingCoverBookIdRef.current = bookId;
    fileInputRef.current?.click();
  };

  const handleOpenPreview = (bookId: string) => {
    const selectedBook = books.find((book) => book.id === bookId);

    navigate(getBookPreviewRoute(bookId), {
      state: selectedBook ? { book: selectedBook } : undefined,
    });
  };

  const handleUploadCoverFile = async (bookId: string, file: File) => {
    const validationError = validateImageFile(file, MAX_BOOK_COVER_FILE_BYTES);

    if (validationError) {
      toast.error("Invalid cover file", {
        description: validationError,
      });
      return;
    }

    if (bookInfoId !== bookId) {
      return;
    }

    revokeDraftCoverObjectUrl();

    const previewUrl = URL.createObjectURL(file);
    draftCoverObjectUrlRef.current = previewUrl;

    setBookInfoDraft((current) =>
      current
        ? {
            ...current,
            coverPreviewUrl: previewUrl,
            pendingCoverFile: file,
          }
        : current,
    );
    setIsCoverDragActive(false);
  };

  const handleCoverSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const bookId = pendingCoverBookIdRef.current;

    event.target.value = "";
    pendingCoverBookIdRef.current = null;

    if (!file || !bookId) {
      return;
    }

    await handleUploadCoverFile(bookId, file);
  };

  const handleRemoveCover = async (bookId: string) => {
    if (bookInfoId !== bookId || !activeBookInfo || !bookInfoDraft) {
      return;
    }

    if (
      !bookInfoDraft.coverPreviewUrl &&
      !bookInfoDraft.pendingCoverFile &&
      !activeBookInfo.coverUrl &&
      !activeBookInfo.coverStoragePath
    ) {
      return;
    }

    revokeDraftCoverObjectUrl();
    setBookInfoDraft((current) =>
      current
        ? {
            ...current,
            coverPreviewUrl: null,
            pendingCoverFile: null,
          }
        : current,
    );
  };

  const handleCoverPanelKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    bookId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleUpdateCoverRequest(bookId);
    }
  };

  const handleCoverDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsCoverDragActive(true);
  };

  const handleCoverDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsCoverDragActive(false);
  };

  const handleCoverDrop = async (
    event: DragEvent<HTMLDivElement>,
    bookId: string,
  ) => {
    event.preventDefault();
    setIsCoverDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    await handleUploadCoverFile(bookId, file);
  };

  const handleDownloadPdf = async (bookId: string) => {
    const book = books.find((entry) => entry.id === bookId);
    if (!book) return;
    // Resolve cover URL if not yet loaded
    let coverUrl = book.coverUrl;
    if (!coverUrl && book.coverStoragePath) {
      coverUrl = await loadBookCoverUrl(book.coverStoragePath);
    }
    void downloadBookAsPdf(book, {
      displayName: getStoredDisplayName(),
      coverUrl,
    });
  };

  const handleDownloadDocx = async (bookId: string) => {
    const book = books.find((entry) => entry.id === bookId);
    if (!book) return;
    let coverUrl = book.coverUrl;
    if (!coverUrl && book.coverStoragePath) {
      coverUrl = await loadBookCoverUrl(book.coverStoragePath);
    }
    void downloadBookAsDocx(book, {
      displayName: getStoredDisplayName(),
      coverUrl,
    });
  };

  const handleDownloadCover = async (bookId: string) => {
    const book = books.find((entry) => entry.id === bookId);

    if (!book) {
      return;
    }

    const draftForBook = activeBookInfo?.id === bookId ? bookInfoDraft : null;

    try {
      let blobToDownload: Blob | null = null;
      let sourceUrl: string | null = null;
      let sourceFileName: string | null = null;

      if (draftForBook?.pendingCoverFile) {
        blobToDownload = draftForBook.pendingCoverFile;
        sourceFileName = draftForBook.pendingCoverFile.name;
      } else {
        sourceUrl = draftForBook?.coverPreviewUrl ?? book.coverUrl;

        if (!sourceUrl) {
          return;
        }

        const response = await fetch(sourceUrl);

        if (!response.ok) {
          throw new Error(`Cover download failed with status ${response.status}`);
        }

        blobToDownload = await response.blob();
      }

      const downloadUrl = URL.createObjectURL(blobToDownload);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = getCoverDownloadFilename(book.title, {
        fileName: sourceFileName,
        mimeType: blobToDownload.type,
        url: sourceUrl,
      });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 0);
    } catch (error) {
      console.error("Unable to download the cover image.", error);
      toast.error("Cover download failed", {
        description: "Please try again in a moment.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverSelected}
        className="hidden"
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Bookshelf</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Keep your books gathered in one calm shelf before chapters, covers, and publishing details take shape.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={handleAddBook}>
            <BookPlus className="h-4 w-4" />
            Add New Book
          </Button>
          <Button type="button" variant="outline" title="Import tools are coming soon.">
            <Download className="h-4 w-4" />
            Import Book
          </Button>
        </div>
      </div>

      {orderedBooks.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {orderedBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onDelete={handleOpenDelete}
              onDownloadDocx={handleDownloadDocx}
              onDownloadPdf={handleDownloadPdf}
              onOpenInfo={handleOpenBookInfo}
              onOpenPreview={handleOpenPreview}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      ) : (
        <Card hoverable={false} className="border-dashed p-8 sm:p-10">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-border bg-background">
              <PenMark className="h-8 w-8 opacity-80" />
            </span>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-[-0.03em]">
                Your shelf is ready
              </h2>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                Start with a blank book and build out the details as your manuscript takes shape.
              </p>
            </div>
            <Button type="button" onClick={handleAddBook}>
              <BookPlus className="h-4 w-4" />
              Add New Book
            </Button>
          </div>
        </Card>
      )}

      <Dialog
        open={Boolean(activeBookInfo)}
        onOpenChange={(open) => {
          if (!open) {
            closeBookInfoDialog();
          }
        }}
      >
        <DialogContent className={dialogClassName}>
          <div className="p-6 sm:p-8">
            <DialogHeader className="pr-12">
              <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
                Book Information
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl leading-7">
                Shape the cover, title, author line, genre, and story note for this book.
              </DialogDescription>
            </DialogHeader>

            {activeBookInfo && bookInfoDraft ? (
              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
                <div className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={
                      bookInfoDraft.coverPreviewUrl
                        ? `Cover panel for ${activeBookInfo.title}`
                        : `Upload cover for ${activeBookInfo.title}`
                    }
                    onClick={() => handleUpdateCoverRequest(activeBookInfo.id)}
                    onKeyDown={(event) => handleCoverPanelKeyDown(event, activeBookInfo.id)}
                    onDragOver={handleCoverDragOver}
                    onDragLeave={handleCoverDragLeave}
                    onDrop={(event) => void handleCoverDrop(event, activeBookInfo.id)}
                    className={cn(
                      "group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-xl border border-border bg-muted/25 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition-[transform,border-color,box-shadow] duration-200 hover:scale-[1.01] hover:border-foreground/12 hover:shadow-[0_22px_48px_-30px_rgba(15,23,42,0.55)] focus:outline-none focus:ring-1 focus:ring-ring",
                      isCoverDragActive && "scale-[1.01] border-foreground/16 bg-muted/35",
                    )}
                  >
                    {isCoverUploading ? (
                      <div className="absolute inset-0">
                        <Skeleton className="h-full w-full rounded-none bg-muted" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Updating cover...</p>
                        </div>
                      </div>
                    ) : bookInfoDraft.coverPreviewUrl ? (
                      <>
                        <img
                          src={bookInfoDraft.coverPreviewUrl}
                          alt={`${activeBookInfo.title} cover`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background via-background/40 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
                          <p className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground">
                            {activeBookInfo.title.trim() || "Untitled Book"}
                          </p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {activeBookInfo.author.trim() || "Author"}
                          </p>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-background/68 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <div className="flex gap-3">
                            <Button
                              type="button"
                              className="rounded-full px-4"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleUpdateCoverRequest(activeBookInfo.id);
                              }}
                            >
                              Change Cover
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full bg-background/90 px-4"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRemoveCover(activeBookInfo.id);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-border bg-background">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                            Upload Cover
                          </p>
                          <p className="text-sm leading-7 text-muted-foreground">
                            Drop an image here or tap to choose one from your library.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-background/55 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      A strong cover helps your book feel finished and shelf-ready.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDownloadCover(activeBookInfo.id)}
                      disabled={!bookInfoDraft.coverPreviewUrl && !bookInfoDraft.pendingCoverFile}
                      aria-label={`Download cover for ${activeBookInfo.title}`}
                      className="h-10 shrink-0 rounded-xl px-4"
                    >
                      Download
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="book-title"
                      className="text-[12px] font-medium tracking-[-0.01em] text-muted-foreground"
                    >
                      Book Title
                    </Label>
                    <Input
                      id="book-title"
                      value={bookInfoDraft.title}
                      aria-invalid={Boolean(bookInfoErrors.title)}
                      onChange={(event) =>
                        handleBookInfoChange("title", event.target.value)
                      }
                      placeholder="Untitled Book"
                      className={cn(
                        inputClassName,
                        "h-14 text-lg font-semibold tracking-[-0.03em]",
                        bookInfoErrors.title && "border-destructive/70",
                      )}
                    />
                    <p
                      className={cn(
                        "min-h-[1.25rem] text-xs leading-5",
                        bookInfoErrors.title ? "text-destructive" : "text-transparent",
                      )}
                    >
                      {bookInfoErrors.title || "Title looks good."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="book-author"
                      className="text-[12px] font-medium tracking-[-0.01em] text-muted-foreground"
                    >
                      Author
                    </Label>
                    <Input
                      id="book-author"
                      value={bookInfoDraft.author}
                      aria-invalid={Boolean(bookInfoErrors.author)}
                      onChange={(event) =>
                        handleBookInfoChange("author", event.target.value)
                      }
                      placeholder="Author name"
                      className={cn(
                        inputClassName,
                        bookInfoErrors.author && "border-destructive/70",
                      )}
                    />
                    <p
                      className={cn(
                        "min-h-[1.25rem] text-xs leading-5",
                        bookInfoErrors.author ? "text-destructive" : "text-transparent",
                      )}
                    >
                      {bookInfoErrors.author || "Author looks good."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="book-genre"
                      className="text-[12px] font-medium tracking-[-0.01em] text-muted-foreground"
                    >
                      Genre
                    </Label>
                    <Input
                      id="book-genre"
                      value={bookInfoDraft.genre}
                      onChange={(event) =>
                        handleBookInfoChange("genre", event.target.value)
                      }
                      placeholder="Fantasy, Romance, Mystery..."
                      className={inputClassName}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="book-description"
                      className="text-[12px] font-medium tracking-[-0.01em] text-muted-foreground"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="book-description"
                      value={bookInfoDraft.description}
                      onChange={(event) =>
                        handleBookInfoChange("description", event.target.value)
                      }
                      placeholder="Write a short invitation into the world of this book."
                      className={textareaClassName}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter className="mt-8 border-t border-border pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={closeBookInfoDialog}
                className="rounded-[10px] px-5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveBookInfo()}
                disabled={isSavingBook || isCoverUploading}
                className="rounded-[10px] px-5"
              >
                {isSavingBook ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSavingBook ? "Saving..." : "Save Book"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(bookPendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
      >
        <DialogContent className={dialogClassName}>
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
                Delete Book
              </DialogTitle>
              <DialogDescription className="mt-1 leading-7">
                This removes the book from the local bookshelf immediately.
              </DialogDescription>
            </DialogHeader>

            {bookPendingDelete ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-foreground">
                  <p className="font-medium">Type the confirmation phrase exactly.</p>
                  <p className="mt-2 text-muted-foreground">
                    Required phrase:
                    {" "}
                    <span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground">
                      {requiredDeletePhrase}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-book-confirmation">Confirmation</Label>
                  <Input
                    id="delete-book-confirmation"
                    value={deleteConfirmationInput}
                    onChange={(event) => {
                      setDeleteConfirmationInput(event.target.value);
                      setDeleteConfirmationError(null);
                    }}
                    placeholder={requiredDeletePhrase}
                    autoComplete="off"
                  />
                  <p
                    className={cn(
                      "min-h-[1.25rem] text-xs leading-5",
                      deleteConfirmationError ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {deleteConfirmationError ||
                      "Deletion stays locked until the phrase matches exactly."}
                  </p>
                </div>

                <DialogFooter className="mt-8">
                  <Button type="button" variant="outline" onClick={closeDeleteDialog}>
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleDeleteBook}>
                    Delete Book
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookshelfPage;
