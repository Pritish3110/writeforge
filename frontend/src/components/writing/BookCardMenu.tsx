import {
  Download,
  FileText,
  Info,
  MoreHorizontal,
  Pin,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Book } from "./types";

interface BookCardMenuProps {
  book: Book;
  onDelete: (bookId: string) => void;
  onDownloadDocx: (bookId: string) => void;
  onDownloadPdf: (bookId: string) => void;
  onOpenInfo: (bookId: string) => void;
  onTogglePin: (bookId: string) => void;
}

export function BookCardMenu({
  book,
  onDelete,
  onDownloadDocx,
  onDownloadPdf,
  onOpenInfo,
  onTogglePin,
}: BookCardMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Book actions for ${book.title}`}
          className="absolute right-3 top-3 h-9 w-9 rounded-[10px] bg-card/92 text-muted-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onTogglePin(book.id)}>
          <Pin className="mr-2 h-4 w-4" />
          {book.pinned ? "Unpin from Top" : "Pin to Top"}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onOpenInfo(book.id)}>
          <Info className="mr-2 h-4 w-4" />
          Book Information
        </DropdownMenuItem>



        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuItem onClick={() => onDownloadPdf(book.id)}>
              <FileText className="mr-2 h-4 w-4" />
              Download as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownloadDocx(book.id)}>
              <FileText className="mr-2 h-4 w-4" />
              Download as DOCX
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onDelete(book.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Book
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
