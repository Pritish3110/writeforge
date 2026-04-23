import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ChapterNavigationControls from "@/components/writing/ChapterNavigationControls";
import WritingScrollToTopButton from "@/components/writing/WritingScrollToTopButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBookshelf } from "@/hooks/useBookshelf";
import {
  createChapterEntries,
  getBookChapterEditRoute,
  getBookEditRoute,
  getBookPreviewRoute,
  getChapterTitleOrFallback,
} from "@/lib/writing/bookshelf";
import { countWords } from "@/lib/writing/editor";

const titleInputClassName =
  "h-14 w-full rounded-none border-0 border-b border-border/40 bg-transparent px-0 text-[17px] font-semibold tracking-[-0.02em] text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/10";
const contentTextareaClassName =
  "min-h-[780px] w-full resize-none rounded-[10px] border-0 bg-muted/58 px-5 py-5 text-[15px] leading-8 text-foreground placeholder:text-muted-foreground focus-visible:border-transparent";

const WritingChapterEditorPage = () => {
  const navigate = useNavigate();
  const { bookId, chapterId } = useParams<{
    bookId: string;
    chapterId: string;
  }>();
  const { addChapter, books, publishChapter, saveChapter } = useBookshelf();
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

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

  useEffect(() => {
    if (!activeChapterEntry) {
      return;
    }

    setDraftTitle(activeChapterEntry.chapter.title);
    setDraftContent(activeChapterEntry.chapter.content);
  }, [activeChapterEntry]);

  const liveWordCount = useMemo(() => countWords(draftContent), [draftContent]);
  const hasPendingChanges = activeChapterEntry
    ? draftTitle !== activeChapterEntry.chapter.title ||
      draftContent !== activeChapterEntry.chapter.content
    : false;
  const isEffectivelyPublished =
    Boolean(activeChapterEntry?.chapter.isPublished) && !hasPendingChanges;

  const handleSelectChapter = (nextSelectedChapterId: string) => {
    if (!book) {
      return;
    }

    navigate(getBookChapterEditRoute(book.id, nextSelectedChapterId));
  };

  const handlePrevious = () => {
    if (!book || !previousChapterId) {
      return;
    }

    navigate(getBookChapterEditRoute(book.id, previousChapterId));
  };

  const handleNext = () => {
    if (!book || !nextChapterId) {
      return;
    }

    navigate(getBookChapterEditRoute(book.id, nextChapterId));
  };

  const handleSave = () => {
    if (!book || !activeChapterEntry) {
      return;
    }

    saveChapter(book.id, activeChapterEntry.chapter.id, {
      title: draftTitle,
      content: draftContent,
    });
  };

  const handlePublish = () => {
    if (!book || !activeChapterEntry) {
      return;
    }

    publishChapter(book.id, activeChapterEntry.chapter.id, {
      title: draftTitle,
      content: draftContent,
    });
  };

  const handleAddChapter = () => {
    if (!book) {
      return;
    }

    const nextChapter = addChapter(book.id);

    if (nextChapter) {
      navigate(getBookChapterEditRoute(book.id, nextChapter.id));
    }
  };

  if (!book || !activeChapterEntry) {
    return (
      <div className="space-y-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(bookId ? getBookEditRoute(bookId) : "/writing")}
          className="rounded-[10px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="rounded-[16px] border border-dashed border-border p-8 sm:p-10">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Chapter not found</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              This editor route no longer matches a chapter in your writing space.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeChapterLabel = getChapterTitleOrFallback(
    activeChapterEntry.chapter.title,
    activeChapterEntry.chapterNumber,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(getBookEditRoute(book.id))}
          className="rounded-[10px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(getBookPreviewRoute(book.id))}
          >
            View Chapter List
          </Button>
          <Button type="button" variant="outline" onClick={handleAddChapter}>
            <Plus className="h-4 w-4" />
            New Chapter
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePublish}
            disabled={isEffectivelyPublished}
          >
            {isEffectivelyPublished ? "Published" : "Publish"}
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <ChapterNavigationControls
          activeChapterLabel={activeChapterLabel}
          activeChapterId={activeChapterEntry.chapter.id}
          chapters={chapterEntries}
          previousChapterId={previousChapterId}
          nextChapterId={nextChapterId}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSelectChapter={handleSelectChapter}
        />

        <div className="mx-auto w-full max-w-[1040px]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Chapter {activeChapterEntry.chapterNumber}
            </p>
            <Badge
              variant="outline"
              className="border-transparent bg-background/60 text-[11px] shadow-none"
            >
              {isEffectivelyPublished ? "Published" : "Draft"}
            </Badge>
          </div>

          <div className="mt-4">
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Chapter title"
              className={titleInputClassName}
            />
          </div>

          <div className="mt-5">
            <Textarea
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              placeholder="Start writing..."
              className={contentTextareaClassName}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <p className="text-xs text-muted-foreground/80">Words: {liveWordCount}</p>
          </div>
        </div>
      </div>

      <WritingScrollToTopButton />
    </div>
  );
};

export default WritingChapterEditorPage;
