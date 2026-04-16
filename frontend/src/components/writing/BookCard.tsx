import { PenMark } from "@/components/brand/PenMark";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BookCardMenu } from "./BookCardMenu";
import type { Book } from "./types";

interface BookCardProps {
  book: Book;
  onDelete: (bookId: string) => void;
  onDownloadDocx: (bookId: string) => void;
  onDownloadPdf: (bookId: string) => void;
  onOpenInfo: (bookId: string) => void;
  onTogglePin: (bookId: string) => void;
  onUpdateCover: (bookId: string) => void;
}

export function BookCard({
  book,
  onDelete,
  onDownloadDocx,
  onDownloadPdf,
  onOpenInfo,
  onTogglePin,
  onUpdateCover,
}: BookCardProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="relative aspect-[3/4] border-b border-border bg-muted/35">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={`${book.title} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/25 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-border bg-background">
              <PenMark className="h-8 w-8 opacity-80" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">No cover yet</p>
              <p className="text-xs leading-6 text-muted-foreground">
                Add artwork later when this book is ready for its shelf.
              </p>
            </div>
          </div>
        )}

        <BookCardMenu
          book={book}
          onDelete={onDelete}
          onDownloadDocx={onDownloadDocx}
          onDownloadPdf={onDownloadPdf}
          onOpenInfo={onOpenInfo}
          onTogglePin={onTogglePin}
          onUpdateCover={onUpdateCover}
        />
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-lg font-semibold tracking-[-0.02em]">
              {book.title}
            </h2>
            <p className="truncate text-sm text-muted-foreground">{book.author}</p>
          </div>

          {book.pinned ? (
            <Badge variant="outline" className="shrink-0 border-border bg-transparent">
              Pinned
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 text-xs leading-6 text-muted-foreground">
          <span>{book.chapters.length} chapters</span>
          <span>{book.updatedAt.toLocaleDateString()}</span>
        </div>
      </div>
    </Card>
  );
}
