import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ChapterNavigationControls from "@/components/writing/ChapterNavigationControls";
import WritingScrollToTopButton from "@/components/writing/WritingScrollToTopButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBookshelf } from "@/hooks/useBookshelf";
import {
  createChapterEntries,
  getBookChapterRoute,
  getBookPreviewRoute,
  getChapterDisplayTitle,
  getReadableChapterContent,
} from "@/lib/writing/bookshelf";

const WritingChapterPage = () => {
  const navigate = useNavigate();
  const { bookId, chapterId } = useParams<{
    bookId: string;
    chapterId: string;
  }>();
  const { books } = useBookshelf();

  const book = useMemo(
    () => books.find((entry) => entry.id === bookId) || null,
    [bookId, books],
  );
  const chapterEntries = useMemo(
    () => (book ? createChapterEntries(book) : []),
    [book],
  );
  const activeChapterIndex = chapterEntries.findIndex(
    (entry) => entry.chapter.id === chapterId,
  );
  const activeChapterEntry =
    activeChapterIndex >= 0 ? chapterEntries[activeChapterIndex] : null;
  const previousChapterId =
    activeChapterIndex > 0 ? chapterEntries[activeChapterIndex - 1].chapter.id : null;
  const nextChapterId =
    activeChapterIndex >= 0 && activeChapterIndex < chapterEntries.length - 1
      ? chapterEntries[activeChapterIndex + 1].chapter.id
      : null;

  const handleSelectChapter = (nextSelectedChapterId: string) => {
    if (!book) {
      return;
    }

    navigate(getBookChapterRoute(book.id, nextSelectedChapterId));
  };

  const handlePrevious = () => {
    if (!book || !previousChapterId) {
      return;
    }

    navigate(getBookChapterRoute(book.id, previousChapterId));
  };

  const handleNext = () => {
    if (!book || !nextChapterId) {
      return;
    }

    navigate(getBookChapterRoute(book.id, nextChapterId));
  };

  if (!book || !activeChapterEntry) {
    return (
      <div className="space-y-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(bookId ? getBookPreviewRoute(bookId) : "/writing")}
          className="rounded-[10px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card hoverable={false} className="border-dashed p-8 sm:p-10">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Chapter not found</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              This reading route no longer matches a chapter in your book.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const readableContent = getReadableChapterContent(activeChapterEntry.chapter);
  const contentParagraphs = readableContent
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(getBookPreviewRoute(book.id))}
          className="rounded-[10px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Book
        </Button>

        <p className="hidden text-sm text-muted-foreground md:block">{book.title}</p>
      </div>

      <Card hoverable={false} className="p-6 sm:p-8">
        <div className="space-y-8">
          <ChapterNavigationControls
            activeChapterId={activeChapterEntry.chapter.id}
            chapters={chapterEntries}
            previousChapterId={previousChapterId}
            nextChapterId={nextChapterId}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSelectChapter={handleSelectChapter}
          />

          <div className="mx-auto w-full max-w-[1040px] space-y-6">
            <div className="space-y-2">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Chapter {activeChapterEntry.chapterNumber}
              </p>
              <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
                {getChapterDisplayTitle(activeChapterEntry.chapter.title)}
              </h1>
            </div>

            <div className="space-y-5 text-[15px] leading-8 text-foreground">
              {contentParagraphs.length > 0 ? (
                contentParagraphs.map((paragraph, index) => (
                  <p key={`${activeChapterEntry.chapter.id}-${index}`} className="whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground">
                  This chapter is not published yet.
                </p>
              )}
            </div>
          </div>

          <ChapterNavigationControls
            activeChapterId={activeChapterEntry.chapter.id}
            chapters={chapterEntries}
            previousChapterId={previousChapterId}
            nextChapterId={nextChapterId}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSelectChapter={handleSelectChapter}
          />
        </div>
      </Card>

      <WritingScrollToTopButton />
    </div>
  );
};

export default WritingChapterPage;
