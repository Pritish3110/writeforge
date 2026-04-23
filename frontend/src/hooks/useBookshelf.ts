import { useCallback } from "react";
import { useMemo } from "react";
import {
  createDefaultChapter,
  hydrateBooks,
  serializeBooks,
  type Book,
  type Chapter,
} from "@/components/writing/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { countWords } from "@/lib/writing/editor";
import { STORAGE_KEYS } from "@/lib/storageKeys";

export const useBookshelf = () => {
  const [storedBooks, setStoredBooks] = useLocalStorage<unknown[]>(
    STORAGE_KEYS.bookshelf,
    [],
  );

  const books = useMemo(() => hydrateBooks(storedBooks), [storedBooks]);

  const commitBooks = useCallback(
    (updater: Book[] | ((currentBooks: Book[]) => Book[])) => {
      setStoredBooks((currentStoredBooks) => {
        const currentBooks = hydrateBooks(currentStoredBooks);
        const nextBooks =
          typeof updater === "function" ? updater(currentBooks) : updater;

        return serializeBooks(nextBooks);
      });
    },
    [setStoredBooks],
  );

  const addChapter = useCallback(
    (bookId: string) => {
      let createdChapter: Chapter | null = null;

      commitBooks((currentBooks) =>
        currentBooks.map((book) => {
          if (book.id !== bookId) {
            return book;
          }

          createdChapter = createDefaultChapter(book.chapters.length + 1);

          return {
            ...book,
            updatedAt: createdChapter.updatedAt,
            chapters: [...book.chapters, createdChapter],
          };
        }),
      );

      return createdChapter;
    },
    [commitBooks],
  );

  const saveChapter = useCallback(
    (bookId: string, chapterId: string, values: { title: string; content: string }) => {
      const now = new Date();

      commitBooks((currentBooks) =>
        currentBooks.map((book) => {
          if (book.id !== bookId) {
            return book;
          }

          return {
            ...book,
            updatedAt: now,
            chapters: book.chapters.map((chapter) => {
              if (chapter.id !== chapterId) {
                return chapter;
              }

              const hasChanged =
                chapter.title !== values.title || chapter.content !== values.content;

              return {
                ...chapter,
                title: values.title,
                content: values.content,
                wordCount: countWords(values.content),
                isPublished: hasChanged ? false : chapter.isPublished,
                updatedAt: now,
              };
            }),
          };
        }),
      );
    },
    [commitBooks],
  );

  const publishChapter = useCallback(
    (bookId: string, chapterId: string, values?: { title: string; content: string }) => {
      const now = new Date();

      commitBooks((currentBooks) =>
        currentBooks.map((book) => {
          if (book.id !== bookId) {
            return book;
          }

          return {
            ...book,
            updatedAt: now,
            chapters: book.chapters.map((chapter) => {
              if (chapter.id !== chapterId) {
                return chapter;
              }

              const nextContent = values?.content ?? chapter.content;
              const nextTitle = values?.title ?? chapter.title;

              return {
                ...chapter,
                title: nextTitle,
                content: nextContent,
                lastPublishedContent: nextContent,
                wordCount: countWords(nextContent),
                isPublished: true,
                updatedAt: now,
              };
            }),
          };
        }),
      );
    },
    [commitBooks],
  );

  const publishAllChapters = useCallback(
    (bookId: string) => {
      const now = new Date();

      commitBooks((currentBooks) =>
        currentBooks.map((book) => {
          if (book.id !== bookId) {
            return book;
          }

          return {
            ...book,
            updatedAt: now,
            chapters: book.chapters.map((chapter) => ({
              ...chapter,
              lastPublishedContent: chapter.content,
              isPublished: true,
            })),
          };
        }),
      );
    },
    [commitBooks],
  );

  const deleteChapter = useCallback(
    (bookId: string, chapterId: string) => {
      const now = new Date();

      commitBooks((currentBooks) =>
        currentBooks.map((book) => {
          if (book.id !== bookId) {
            return book;
          }

          return {
            ...book,
            updatedAt: now,
            chapters: book.chapters.filter((chapter) => chapter.id !== chapterId),
          };
        }),
      );
    },
    [commitBooks],
  );

  const deleteAllChapters = useCallback(
    (bookId: string) => {
      const now = new Date();

      commitBooks((currentBooks) =>
        currentBooks.map((book) => {
          if (book.id !== bookId) {
            return book;
          }

          return {
            ...book,
            updatedAt: now,
            chapters: [],
          };
        }),
      );
    },
    [commitBooks],
  );

  return {
    books,
    addChapter,
    deleteAllChapters,
    deleteChapter,
    publishAllChapters,
    publishChapter,
    saveChapter,
  };
};
