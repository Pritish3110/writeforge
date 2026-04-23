import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getChapterDisplayTitle,
  getChapterTitleOrFallback,
  type ChapterEntry,
} from "@/lib/writing/bookshelf";
import { splitChapterEntriesByParity } from "@/lib/writing/editor";
import { cn } from "@/lib/utils";

const ChapterColumn = ({
  entries,
  isEntryDisabled,
  onDeleteChapter,
  onOpenChapter,
}: {
  entries: ChapterEntry[];
  isEntryDisabled?: (entry: ChapterEntry) => boolean;
  onDeleteChapter?: (chapterId: string) => void;
  onOpenChapter: (chapterId: string) => void;
}) => (
  <div className="space-y-2.5">
    {entries.length > 0 ? (
      entries.map((entry) => {
        const isDisabled = isEntryDisabled?.(entry) ?? false;
        const title = getChapterTitleOrFallback(
          entry.chapter.title,
          entry.chapterNumber,
        );

        return (
          <div key={entry.chapter.id} className="relative w-full">
            <Card
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              aria-disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onOpenChapter(entry.chapter.id);
                }
              }}
              onKeyDown={(event) => {
                if (isDisabled) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenChapter(entry.chapter.id);
                }
              }}
              hoverable={!isDisabled}
              className={cn(
                "w-full rounded-[14px] px-5 py-5 text-left",
                onDeleteChapter && "pr-16",
                isDisabled && "cursor-default opacity-80",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                    {title}
                  </h3>
                </div>

                <Badge
                  variant="outline"
                  className="shrink-0 border-transparent bg-background/60 text-[11px] shadow-none"
                >
                  {entry.chapter.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] leading-6 text-muted-foreground">
                <span>{entry.chapter.wordCount} words</span>
                <span>{entry.chapter.updatedAt.toLocaleString()}</span>
              </div>
            </Card>

            {onDeleteChapter ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Delete ${getChapterDisplayTitle(entry.chapter.title)}`}
                onClick={() => onDeleteChapter(entry.chapter.id)}
                className="absolute right-4 top-8 h-8 w-8 rounded-[10px] text-muted-foreground hover:bg-transparent hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        );
      })
    ) : (
      <div className="rounded-[12px] border border-dashed border-border/60 px-4 py-10 text-center text-sm leading-7 text-muted-foreground">
        No chapters in this column yet.
      </div>
    )}
  </div>
);

export const WritingChapterGrid = ({
  entries,
  isEntryDisabled,
  onDeleteChapter,
  onOpenChapter,
}: {
  entries: ChapterEntry[];
  isEntryDisabled?: (entry: ChapterEntry) => boolean;
  onDeleteChapter?: (chapterId: string) => void;
  onOpenChapter: (chapterId: string) => void;
}) => {
  const { oddEntries, evenEntries } = splitChapterEntriesByParity(entries);

  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-5">
        <ChapterColumn
          entries={oddEntries}
          isEntryDisabled={isEntryDisabled}
          onDeleteChapter={onDeleteChapter}
          onOpenChapter={onOpenChapter}
        />
        <ChapterColumn
          entries={evenEntries}
          isEntryDisabled={isEntryDisabled}
          onDeleteChapter={onDeleteChapter}
          onOpenChapter={onOpenChapter}
        />
      </div>
    </div>
  );
};

export default WritingChapterGrid;
