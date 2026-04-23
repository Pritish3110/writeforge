import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getChapterTitleOrFallback,
  type ChapterEntry,
} from "@/lib/writing/bookshelf";

interface ChapterNavigationControlsProps {
  activeChapterLabel?: string;
  activeChapterId: string;
  chapters: ChapterEntry[];
  nextChapterId: string | null;
  previousChapterId: string | null;
  onNext: () => void;
  onPrevious: () => void;
  onSelectChapter: (chapterId: string) => void;
}

export const ChapterNavigationControls = ({
  activeChapterLabel,
  activeChapterId,
  chapters,
  nextChapterId,
  previousChapterId,
  onNext,
  onPrevious,
  onSelectChapter,
}: ChapterNavigationControlsProps) => (
  <div className="flex w-full flex-wrap items-center justify-center gap-3">
    <Button
      type="button"
      variant="outline"
      onClick={onPrevious}
      disabled={!previousChapterId}
      className="min-w-[140px] rounded-[10px]"
    >
      <ChevronLeft className="h-4 w-4" />
      Prev
    </Button>

    <Select value={activeChapterId} onValueChange={onSelectChapter}>
      <SelectTrigger className="w-full rounded-[10px] sm:w-[320px]">
        {activeChapterLabel ? (
          <span className="truncate">{activeChapterLabel}</span>
        ) : (
          <SelectValue placeholder="Select chapter" />
        )}
      </SelectTrigger>
      <SelectContent>
        {chapters.map((entry) => (
          <SelectItem key={entry.chapter.id} value={entry.chapter.id}>
            {getChapterTitleOrFallback(entry.chapter.title, entry.chapterNumber)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Button
      type="button"
      onClick={onNext}
      disabled={!nextChapterId}
      className="min-w-[140px] rounded-[10px]"
    >
      Next
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
);

export default ChapterNavigationControls;
