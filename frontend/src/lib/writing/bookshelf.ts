import type { Book, Chapter } from "@/components/writing/types";

export type ChapterSortOption = "sequence-asc" | "sequence-desc" | "title-asc";

export interface ChapterEntry {
  chapter: Chapter;
  chapterNumber: number;
  originalIndex: number;
}

export const CHAPTER_SORT_OPTIONS: Array<{
  label: string;
  value: ChapterSortOption;
}> = [
  { label: "Ascending", value: "sequence-asc" },
  { label: "Descending", value: "sequence-desc" },
  { label: "A to Z", value: "title-asc" },
];

export const getBookPreviewRoute = (bookId: string) => `/writing/${bookId}`;

export const getBookEditRoute = (bookId: string) => `/writing/${bookId}/edit`;

export const getBookChapterEditRoute = (bookId: string, chapterId: string) =>
  `/writing/${bookId}/edit/${chapterId}`;

export const getBookChapterRoute = (bookId: string, chapterId: string) =>
  `/writing/${bookId}/chapter/${chapterId}`;

export const getBookGenreLabel = (genre: string) => genre.trim() || "Not set";

export const getChapterDisplayTitle = (title: string) =>
  title.trim() || "Untitled Chapter";

export const getChapterFallbackTitle = (chapterNumber: number) =>
  `Chapter - ${chapterNumber}`;

const isDefaultChapterTitle = (title: string, chapterNumber: number) => {
  const trimmedTitle = title.trim();

  return [
    `Chapter ${chapterNumber}`,
    `Chapter - ${chapterNumber}`,
  ].some((candidate) =>
    trimmedTitle.localeCompare(candidate, undefined, {
      sensitivity: "base",
    }) === 0,
  );
};

export const getChapterTitleOrFallback = (
  title: string,
  chapterNumber: number,
) => {
  const trimmedTitle = title.trim();

  if (trimmedTitle && !isDefaultChapterTitle(trimmedTitle, chapterNumber)) {
    return trimmedTitle;
  }

  return getChapterFallbackTitle(chapterNumber);
};

export const createChapterEntries = (
  book: Book,
  options?: { publishedOnly?: boolean },
): ChapterEntry[] =>
  book.chapters.flatMap((chapter, index) => {
    if (options?.publishedOnly && !chapter.isPublished) {
      return [];
    }

    return [
      {
        chapter,
        chapterNumber: index + 1,
        originalIndex: index,
      },
    ];
  });

export const getReadableChapterContent = (chapter: Chapter) => {
  if (chapter.isPublished) {
    return chapter.content;
  }

  return chapter.lastPublishedContent.trim();
};

export const sortChapterEntries = (
  entries: ChapterEntry[],
  sortOption: ChapterSortOption,
) => {
  const sortedEntries = [...entries];

  switch (sortOption) {
    case "sequence-desc":
      return sortedEntries.sort((left, right) => right.originalIndex - left.originalIndex);
    case "title-asc":
      return sortedEntries.sort((left, right) =>
        getChapterDisplayTitle(left.chapter.title).localeCompare(
          getChapterDisplayTitle(right.chapter.title),
          undefined,
          { sensitivity: "base" },
        ),
      );
    case "sequence-asc":
    default:
      return sortedEntries.sort((left, right) => left.originalIndex - right.originalIndex);
  }
};

export const filterChapterEntries = (
  entries: ChapterEntry[],
  query: string,
) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return entries;
  }

  return entries.filter((entry) => {
    const title = getChapterDisplayTitle(entry.chapter.title).toLowerCase();
    const haystack = `${entry.chapterNumber} ${title}`;
    return haystack.includes(normalizedQuery);
  });
};
