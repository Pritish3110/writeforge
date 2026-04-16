export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  isPublished: boolean;
  updatedAt: Date;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string | null;
  coverStoragePath: string | null;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  chapters: Chapter[];
}

export interface SerializedChapter
  extends Omit<Chapter, "updatedAt"> {
  updatedAt: string;
}

export interface SerializedBook
  extends Omit<Book, "createdAt" | "updatedAt" | "chapters"> {
  createdAt: string;
  updatedAt: string;
  chapters: SerializedChapter[];
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseDate = (value: unknown, fallback = new Date()) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
};

const getPersistedCoverUrl = (value: string | null) =>
  value && !value.startsWith("blob:") ? value : null;

export const createDefaultBook = (author: string): Book => {
  const now = new Date();

  return {
    id: createId("book"),
    title: "Untitled Book",
    author: author.trim() || "User",
    description: "",
    coverUrl: null,
    coverStoragePath: null,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    chapters: [],
  };
};

export const serializeBook = (book: Book): SerializedBook => ({
  ...book,
  coverUrl: getPersistedCoverUrl(book.coverUrl),
  createdAt: book.createdAt.toISOString(),
  updatedAt: book.updatedAt.toISOString(),
  chapters: book.chapters.map((chapter) => ({
    ...chapter,
    updatedAt: chapter.updatedAt.toISOString(),
  })),
});

export const serializeBooks = (books: Book[]) => books.map(serializeBook);

export const hydrateBook = (value: unknown): Book | null => {
  if (!isRecord(value)) {
    return null;
  }

  const createdAt = parseDate(value.createdAt);
  const updatedAt = parseDate(value.updatedAt, createdAt);

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : createId("book"),
    title: typeof value.title === "string" ? value.title : "Untitled Book",
    author: typeof value.author === "string" ? value.author : "User",
    description: typeof value.description === "string" ? value.description : "",
    coverUrl:
      typeof value.coverUrl === "string" && value.coverUrl.trim()
        ? getPersistedCoverUrl(value.coverUrl)
        : null,
    coverStoragePath:
      typeof value.coverStoragePath === "string" && value.coverStoragePath.trim()
        ? value.coverStoragePath
        : null,
    pinned: Boolean(value.pinned),
    createdAt,
    updatedAt,
    chapters: Array.isArray(value.chapters)
      ? value.chapters.flatMap((chapterValue) => {
          if (!isRecord(chapterValue)) {
            return [];
          }

          const chapterUpdatedAt = parseDate(chapterValue.updatedAt, updatedAt);

          return [
            {
              id:
                typeof chapterValue.id === "string" && chapterValue.id.trim()
                  ? chapterValue.id
                  : createId("chapter"),
              title:
                typeof chapterValue.title === "string"
                  ? chapterValue.title
                  : "Untitled Chapter",
              content:
                typeof chapterValue.content === "string" ? chapterValue.content : "",
              wordCount:
                typeof chapterValue.wordCount === "number" &&
                Number.isFinite(chapterValue.wordCount)
                  ? chapterValue.wordCount
                  : 0,
              isPublished: Boolean(chapterValue.isPublished),
              updatedAt: chapterUpdatedAt,
            },
          ];
        })
      : [],
  };
};

export const hydrateBooks = (value: unknown): Book[] =>
  (Array.isArray(value) ? value : []).flatMap((entry) => {
    const book = hydrateBook(entry);
    return book ? [book] : [];
  });
