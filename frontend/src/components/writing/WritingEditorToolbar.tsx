import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { Bold, ChevronDown, Italic, Minus, Plus, Underline } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CHAPTER_FONT_SIZE_OPTIONS,
  clampChapterFontSize,
  normalizeChapterFontSize,
} from "@/lib/writing/richText";
import { cn } from "@/lib/utils";

const toolbarButtonClassName =
  "h-10 rounded-[10px] border border-input bg-transparent px-3 text-foreground hover:border-foreground/14 hover:bg-accent/70 hover:text-accent-foreground";

export const WritingEditorToolbar = ({ editor }: { editor: Editor | null }) => {
  const fontSizeControlRef = useRef<HTMLDivElement | null>(null);
  const editorState = useEditorState({
    editor,
    selector: (snapshot) => {
      if (!snapshot.editor) {
        return {
          fontSize: "12",
          isBold: false,
          isItalic: false,
          isUnderline: false,
        };
      }

      return {
        fontSize: normalizeChapterFontSize(
          snapshot.editor.getAttributes("textStyle").fontSize,
        ),
        isBold: snapshot.editor.isActive("bold"),
        isItalic: snapshot.editor.isActive("italic"),
        isUnderline: snapshot.editor.isActive("underline"),
      };
    },
  });
  const [fontSizeInput, setFontSizeInput] = useState(editorState?.fontSize ?? "12");
  const [isFontSizeMenuOpen, setIsFontSizeMenuOpen] = useState(false);

  useEffect(() => {
    setFontSizeInput(editorState?.fontSize ?? "12");
  }, [editorState?.fontSize]);

  useEffect(() => {
    const handlePointerDown = (event: globalThis.MouseEvent) => {
      if (!fontSizeControlRef.current) {
        return;
      }

      if (fontSizeControlRef.current.contains(event.target as Node)) {
        return;
      }

      setIsFontSizeMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const applyFontSize = (value: string) => {
    const normalizedValue = clampChapterFontSize(value);

    setFontSizeInput(normalizedValue);
    editor?.chain().focus().setFontSize(`${normalizedValue}px`).run();
  };

  const adjustFontSize = (delta: number) => {
    const currentFontSize = Number.parseInt(clampChapterFontSize(fontSizeInput), 10);
    const nextFontSize = String(Math.max(1, Math.min(72, currentFontSize + delta)));

    applyFontSize(nextFontSize);
  };

  const handleToolbarMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-input bg-transparent px-3 py-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => adjustFontSize(-1)}
        disabled={!editor}
        className="h-10 w-10 rounded-[10px] px-0"
        aria-label="Decrease font size"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <div ref={fontSizeControlRef} className="relative w-[92px] shrink-0">
        <div className="relative">
          <Input
            value={fontSizeInput}
            onChange={(event) => {
              setFontSizeInput(event.target.value.replace(/[^\d]/g, ""));
            }}
            onFocus={(event) => {
              setIsFontSizeMenuOpen(true);
              event.target.select();
            }}
            onClick={() => setIsFontSizeMenuOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyFontSize(fontSizeInput);
                setIsFontSizeMenuOpen(false);
              }

              if (event.key === "Escape") {
                setIsFontSizeMenuOpen(false);
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIsFontSizeMenuOpen(true);
              }
            }}
            onBlur={() => {
              window.setTimeout(() => {
                if (!fontSizeControlRef.current?.contains(document.activeElement)) {
                  applyFontSize(fontSizeInput);
                  setIsFontSizeMenuOpen(false);
                }
              }, 0);
            }}
            inputMode="numeric"
            aria-label="Font size"
            className="h-10 rounded-[10px] border-input pr-9 text-center"
          />

          <button
            type="button"
            aria-label="Toggle font size options"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setIsFontSizeMenuOpen((currentValue) => !currentValue)}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {isFontSizeMenuOpen ? (
          <div className="absolute left-0 top-[calc(100%+0.4rem)] z-30 w-[92px] rounded-[10px] border border-input bg-popover p-1 shadow-md">
            {CHAPTER_FONT_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  applyFontSize(size);
                  setIsFontSizeMenuOpen(false);
                }}
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-[8px] text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  fontSizeInput === size && "bg-accent text-foreground",
                )}
              >
                {size}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => adjustFontSize(1)}
        disabled={!editor}
        className="h-10 w-10 rounded-[10px] px-0"
        aria-label="Increase font size"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        disabled={!editor}
        className={cn(
          toolbarButtonClassName,
          editorState?.isBold && "bg-accent text-foreground",
        )}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        disabled={!editor}
        className={cn(
          toolbarButtonClassName,
          editorState?.isItalic && "bg-accent text-foreground",
        )}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        disabled={!editor}
        className={cn(
          toolbarButtonClassName,
          editorState?.isUnderline && "bg-accent text-foreground",
        )}
        aria-label="Underline"
      >
        <Underline className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default WritingEditorToolbar;
