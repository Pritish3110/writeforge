import type { Book, Chapter } from "@/components/writing/types";
import type { ChapterEntry } from "@/lib/writing/bookshelf";

export const countWords = (value: string) => {
  const trimmed = value.trim();

  return trimmed ? trimmed.split(/\s+/).length : 0;
};

export const getLatestUpdatedChapter = (book: Book | null | undefined): Chapter | null => {
  if (!book || book.chapters.length === 0) {
    return null;
  }

  return book.chapters.reduce<Chapter>((latestChapter, chapter) =>
    chapter.updatedAt.getTime() > latestChapter.updatedAt.getTime()
      ? chapter
      : latestChapter,
  );
};

export const splitChapterEntriesByParity = (entries: ChapterEntry[]) => ({
  oddEntries: entries.filter((entry) => entry.chapterNumber % 2 === 1),
  evenEntries: entries.filter((entry) => entry.chapterNumber % 2 === 0),
});
