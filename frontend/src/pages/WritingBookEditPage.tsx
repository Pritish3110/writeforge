import { useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationProvider";
import { useBackendSync } from "@/contexts/BackendSyncContext";
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
  getBookChapterEditRoute,
  getBookPreviewRoute,
  type ChapterSortOption,
  sortChapterEntries,
} from "@/lib/writing/bookshelf";
import { cn } from "@/lib/utils";

const searchInputClassName =
  "h-11 rounded-[10px] border-input bg-background/70 pl-10 text-sm placeholder:text-muted-foreground";
const deleteDialogClassName = "max-w-2xl border-border bg-card";

const WritingBookEditPage = () => {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const confirmDelete = useDeleteConfirmation();
  const {
    addChapter,
    books,
    deleteAllChapters,
    deleteChapter,
    publishAllChapters,
  } = useBookshelf();
  const { syncTargetsNow } = useBackendSync();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<ChapterSortOption>("sequence-asc");
  const [deleteAllInput, setDeleteAllInput] = useState("");
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  const book = useMemo(
    () => books.find((entry) => entry.id === bookId) || null,
    [bookId, books],
  );
  const chapterEntries = useMemo(
    () =>
      (book ? createChapterEntries(book) : []).filter(
        (entry) => entry.chapter.title.trim() || entry.chapter.content.trim(),
      ),
    [book],
  );
  const visibleChapterEntries = useMemo(
    () => sortChapterEntries(filterChapterEntries(chapterEntries, searchQuery), sortOption),
    [chapterEntries, searchQuery, sortOption],
  );
  const requiredDeletePhrase = book ? `delete all chapters in ${book.title}` : "";

  const handleAddChapter = () => {
    if (!book) {
      return;
    }

    const nextChapter = addChapter(book.id);

    if (nextChapter) {
      navigate(getBookChapterEditRoute(book.id, nextChapter.id));
    }
  };

  const handleOpenChapter = (chapterId: string) => {
    if (!book) {
      return;
    }

    navigate(getBookChapterEditRoute(book.id, chapterId));
  };

  const handlePublishAll = () => {
    if (!book || chapterEntries.length === 0) {
      return;
    }

    publishAllChapters(book.id);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!book) {
      return;
    }

    const shouldDelete = await confirmDelete({
      title: "Delete Chapter",
      description:
        "This chapter will be removed from the writing list immediately.",
      confirmLabel: "Delete Chapter",
      badgeLabel: "Chapter Delete",
    });

    if (!shouldDelete) {
      return;
    }

    deleteChapter(book.id, chapterId);
    void syncTargetsNow(["bookshelf"]);
  };

  const closeDeleteAllDialog = () => {
    setIsDeleteAllOpen(false);
    setDeleteAllInput("");
    setDeleteAllError(null);
  };

  const handleDeleteAllChapters = () => {
    if (!book) {
      return;
    }

    if (deleteAllInput !== requiredDeletePhrase) {
      setDeleteAllError("Type the phrase exactly to unlock chapter deletion.");
      return;
    }

    deleteAllChapters(book.id);
    void syncTargetsNow(["bookshelf"]);
    closeDeleteAllDialog();
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
              This writing route no longer matches a book on your shelf.
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
          onClick={() => navigate(getBookPreviewRoute(book.id))}
          className="rounded-[10px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIsDeleteAllOpen(true)}
            disabled={chapterEntries.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            Delete All
          </Button>
          <Button type="button" variant="outline" onClick={handleAddChapter}>
            <Plus className="h-4 w-4" />
            Add Chapter
          </Button>
          <Button
            type="button"
            onClick={handlePublishAll}
            disabled={chapterEntries.length === 0}
          >
            Publish All
          </Button>
        </div>
      </div>

      {chapterEntries.length === 0 ? (
        <Card hoverable={false} className="p-6 sm:p-8">
          <div className="flex min-h-[340px] items-center justify-center">
            <div className="w-full max-w-md rounded-[14px] border border-dashed border-border/80 px-6 py-10 text-center">
              <p className="text-base font-medium tracking-[-0.02em] text-foreground">
                No chapters yet. Start writing your story.
              </p>
              <Button type="button" onClick={handleAddChapter} className="mt-5">
                <Plus className="h-4 w-4" />
                Add Chapter
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card hoverable={false} className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-muted-foreground" />
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Writing Home
                </p>
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">{book.title}</h1>
              <p className="text-sm leading-7 text-muted-foreground">
                Open any chapter to continue editing, or start a new one.
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

          <div className="mt-6">
            <WritingChapterGrid
              entries={visibleChapterEntries}
              onDeleteChapter={handleDeleteChapter}
              onOpenChapter={handleOpenChapter}
            />
          </div>
        </Card>
      )}

      <Dialog
        open={isDeleteAllOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteAllDialog();
          } else {
            setIsDeleteAllOpen(true);
          }
        }}
      >
        <DialogContent className={deleteDialogClassName}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
              Delete All Chapters
            </DialogTitle>
            <DialogDescription className="mt-1 leading-7">
              This clears every chapter from this book. The action happens immediately in the
              local writing space after the phrase matches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-foreground">
              <p className="font-medium">Type the confirmation phrase exactly.</p>
              <p className="mt-2 text-muted-foreground">
                Required phrase:{" "}
                <span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground">
                  {requiredDeletePhrase}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-all-chapters-confirmation">Confirmation</Label>
              <Input
                id="delete-all-chapters-confirmation"
                value={deleteAllInput}
                onChange={(event) => {
                  setDeleteAllInput(event.target.value);
                  setDeleteAllError(null);
                }}
                placeholder={requiredDeletePhrase}
                autoComplete="off"
              />
              <p
                className={cn(
                  "min-h-[1.25rem] text-xs leading-5",
                  deleteAllError ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {deleteAllError ||
                  "Deletion stays locked until the phrase matches exactly."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteAllDialog}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteAllChapters}>
              Delete All Chapters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WritingScrollToTopButton />
    </div>
  );
};

export default WritingBookEditPage;
