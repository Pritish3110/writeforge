import { useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, Search } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PenMark } from "@/components/brand/PenMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WritingChapterGrid from "@/components/writing/WritingChapterGrid";
import WritingScrollToTopButton from "@/components/writing/WritingScrollToTopButton";
import { useBookshelf } from "@/hooks/useBookshelf";
import {
  CHAPTER_SORT_OPTIONS,
  createChapterEntries,
  filterChapterEntries,
  getBookChapterRoute,
  getBookEditRoute,
  getBookGenreLabel,
  type ChapterSortOption,
  sortChapterEntries,
} from "@/lib/writing/bookshelf";

const searchInputClassName =
  "h-11 rounded-[10px] border-input bg-background/70 pl-10 text-sm placeholder:text-muted-foreground";

const WritingBookPreviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookId } = useParams<{ bookId: string }>();
  const { books } = useBookshelf();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<ChapterSortOption>("sequence-asc");

  const locationStateBook =
    (location.state as { book?: (typeof books)[number] } | null)?.book ?? null;
  const book = useMemo(
    () => books.find((entry) => entry.id === bookId) ?? locationStateBook,
    [bookId, books, locationStateBook],
  );

  const chapterEntries = useMemo(
    () => (book ? createChapterEntries(book) : []),
    [book],
  );
  const publishedChapterEntries = useMemo(
    () => (book ? createChapterEntries(book, { publishedOnly: true }) : []),
    [book],
  );
  const visibleChapterEntries = useMemo(
    () =>
      sortChapterEntries(
        filterChapterEntries(publishedChapterEntries, searchQuery),
        sortOption,
      ),
    [publishedChapterEntries, searchQuery, sortOption],
  );

  const handleContinueWriting = () => {
    if (!book) {
      return;
    }

    navigate(getBookEditRoute(book.id));
  };

  const handleOpenChapter = (chapterId: string) => {
    if (!book) {
      return;
    }

    navigate(getBookChapterRoute(book.id, chapterId));
  };

  if (!book) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/writing")}
            className="rounded-[10px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <Card hoverable={false} className="border-dashed p-8 sm:p-10">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Book not found</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              This preview link no longer matches a book on your shelf.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/writing")}
          className="rounded-[10px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button type="button" onClick={handleContinueWriting}>
          Continue Writing
        </Button>
      </div>

      <Card hoverable={false} className="p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
          <div className="mx-auto flex w-full max-w-[280px] items-center justify-center">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[18px] border border-border bg-muted/25 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={`${book.title} cover`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-8 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-border bg-background">
                    <PenMark className="h-8 w-8 opacity-80" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">No cover yet</p>
                    <p className="text-xs leading-6 text-muted-foreground">
                      This book is still waiting for its shelf-ready artwork.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Book Preview
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em]">{book.title}</h1>
              <p className="text-sm leading-7 text-muted-foreground">{book.author}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card hoverable={false} level="secondary" className="p-4">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Genre
                </p>
                <p className="mt-2 text-sm leading-7 text-foreground">
                  {getBookGenreLabel(book.genre)}
                </p>
              </Card>

              <Card hoverable={false} level="secondary" className="p-4">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Published Chapters
                </p>
                <p className="mt-2 text-sm leading-7 text-foreground">
                  {publishedChapterEntries.length} of {chapterEntries.length}
                </p>
              </Card>
            </div>

            <Card hoverable={false} level="secondary" className="p-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Description
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground">
                {book.description.trim() ||
                  "No description yet. Add one from the book information modal when you're ready."}
              </p>
            </Card>
          </div>
        </div>
      </Card>

      <Card hoverable={false} className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpenText className="h-4 w-4 text-muted-foreground" />
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Chapters
              </p>
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">
              Read-only chapter view
            </h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Published chapters show live content, while drafts open the latest published
              version when available.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full sm:w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search chapter name or number"
                className={searchInputClassName}
              />
            </div>

            <Select
              value={sortOption}
              onValueChange={(value) => setSortOption(value as ChapterSortOption)}
            >
              <SelectTrigger className="w-full rounded-[10px] sm:w-[180px]">
                <SelectValue placeholder="Sort chapters" />
              </SelectTrigger>
              <SelectContent>
                {CHAPTER_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {publishedChapterEntries.length > 0 ? (
          <div className="mt-6">
            <WritingChapterGrid
              entries={visibleChapterEntries}
              onOpenChapter={handleOpenChapter}
            />
          </div>
        ) : (
          <div className="mt-6 rounded-[14px] border border-dashed border-border/80 px-6 py-10 text-center">
            <p className="text-base font-medium tracking-[-0.02em] text-foreground">
              No chapters yet
            </p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Chapters will appear here once they are published.
            </p>
          </div>
        )}
      </Card>

      <WritingScrollToTopButton />
    </div>
  );
};

export default WritingBookPreviewPage;
