import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Bold, ChevronDown, Italic, Minus, Plus, Underline } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CHAPTER_FONT_SIZE_OPTIONS,
  buildAutoDashReplacement,
  convertPlainTextToRichTextHtml,
  normalizePastedRichTextHtml,
  serializeRichTextForStorage,
  toRichTextEditorHtml,
} from "@/lib/writing/richText";
import { cn } from "@/lib/utils";

const DEFAULT_EDITOR_FONT_SIZE = "15";

const toolbarButtonClassName =
  "h-10 rounded-[10px] border border-input bg-transparent px-3 text-foreground hover:border-foreground/14 hover:bg-accent/70 hover:text-accent-foreground";
const toolbarIconButtonClassName = "h-10 w-10 rounded-[10px] px-0";
const editorClassName =
  "relative min-h-[780px] w-full rounded-[10px] bg-muted/58 px-5 py-5 text-[15px] leading-8 text-foreground outline-none whitespace-pre-wrap before:pointer-events-none before:absolute before:left-5 before:top-5 before:text-[15px] before:leading-8 before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_em]:italic [&_p]:min-h-[2rem] [&_p]:whitespace-pre-wrap [&_strong]:font-semibold [&_u]:underline";

interface WritingCanvasEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const isWordCharacter = (value: string) => /[A-Za-z0-9]/.test(value);
const isQuoteOpenContext = (value: string) => !value || /[\s([{<\-—"“'‘]/.test(value);

const createContainer = () => {
  if (typeof document === "undefined") {
    return null;
  }

  return document.createElement("div");
};

const unwrapElement = (element: HTMLElement) => {
  const parent = element.parentNode;

  if (!parent) {
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
};

const normalizeBrowserGeneratedHtml = (value: string) => {
  const container = createContainer();

  if (!container) {
    return value;
  }

  container.innerHTML = value;

  container.querySelectorAll<HTMLElement>("b").forEach((element) => {
    const strong = document.createElement("strong");
    strong.innerHTML = element.innerHTML;
    element.replaceWith(strong);
  });

  container.querySelectorAll<HTMLElement>("i").forEach((element) => {
    const emphasis = document.createElement("em");
    emphasis.innerHTML = element.innerHTML;
    element.replaceWith(emphasis);
  });

  container.querySelectorAll<HTMLElement>("font[size]").forEach((element) => {
    const size = Number.parseInt(element.getAttribute("size") ?? "", 10);
    const span = document.createElement("span");

    if (Number.isFinite(size)) {
      const pxByFontTagSize: Record<number, string> = {
        1: "10px",
        2: "13px",
        3: "16px",
        4: "18px",
        5: "24px",
        6: "32px",
        7: "48px",
      };

      span.style.fontSize = pxByFontTagSize[size] ?? `${size}px`;
    }

    while (element.firstChild) {
      span.appendChild(element.firstChild);
    }

    element.replaceWith(span);
  });

  container.querySelectorAll<HTMLElement>("span[style]").forEach((element) => {
    const { fontWeight, fontStyle, textDecorationLine } = element.style;

    if (fontWeight === "bold" || Number.parseInt(fontWeight, 10) >= 600) {
      const strong = document.createElement("strong");
      strong.innerHTML = element.innerHTML;
      element.replaceWith(strong);
      return;
    }

    if (fontStyle === "italic") {
      const emphasis = document.createElement("em");
      emphasis.innerHTML = element.innerHTML;
      element.replaceWith(emphasis);
      return;
    }

    if (textDecorationLine.includes("underline")) {
      const underline = document.createElement("u");
      underline.innerHTML = element.innerHTML;
      element.replaceWith(underline);
    }
  });

  container.querySelectorAll<HTMLElement>("span").forEach((element) => {
    if (element.getAttribute("style")) {
      return;
    }

    unwrapElement(element);
  });

  return container.innerHTML;
};

const normalizeEditorHtml = (value: string) =>
  normalizeBrowserGeneratedHtml(value)
    .replace(/<(\/?)div\b/gi, "<$1p")
    .replace(/<br><\/p><p>/gi, "</p><p>");

const serializeEditorContent = (value: string) => {
  const normalizedHtml = normalizeEditorHtml(value).trim();

  if (!normalizedHtml) {
    return "";
  }

  return serializeRichTextForStorage(normalizedHtml);
};

const getSelectionRange = (editorElement: HTMLDivElement | null) => {
  if (!editorElement || typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!editorElement.contains(range.commonAncestorContainer)) {
    return null;
  }

  return range;
};

const getSelectionContext = (editorElement: HTMLDivElement | null) => {
  const range = getSelectionRange(editorElement);

  if (!editorElement || !range) {
    return null;
  }

  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(editorElement);
  prefixRange.setEnd(range.startContainer, range.startOffset);

  const suffixRange = range.cloneRange();
  suffixRange.selectNodeContents(editorElement);
  suffixRange.setStart(range.endContainer, range.endOffset);

  const prefixText = prefixRange.toString();
  const suffixText = suffixRange.toString();

  return {
    range,
    prefixText,
    suffixText,
    previousCharacter: prefixText.slice(-1),
    nextCharacter: suffixText.slice(0, 1),
  };
};

const placeCaretAtTextOffset = (node: Text, offset: number) => {
  if (typeof window === "undefined") {
    return;
  }

  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

const getSelectionContainer = (editorElement: HTMLDivElement | null, range?: Range | null) => {
  if (!editorElement || typeof window === "undefined") {
    return editorElement;
  }

  const anchorNode = range?.startContainer ?? window.getSelection()?.anchorNode;

  if (!anchorNode || !editorElement.contains(anchorNode)) {
    return editorElement;
  }

  if (anchorNode instanceof HTMLElement) {
    return anchorNode;
  }

  return anchorNode.parentElement ?? editorElement;
};

const getCurrentFontSize = (editorElement: HTMLDivElement | null, range?: Range | null) => {
  if (!editorElement || typeof window === "undefined") {
    return DEFAULT_EDITOR_FONT_SIZE;
  }

  const element = getSelectionContainer(editorElement, range);
  const computedFontSize = Number.parseFloat(window.getComputedStyle(element).fontSize);

  if (!Number.isFinite(computedFontSize)) {
    return DEFAULT_EDITOR_FONT_SIZE;
  }

  return String(Math.max(1, Math.round(computedFontSize)));
};

const getCommandState = (command: "bold" | "italic" | "underline") => {
  if (typeof document === "undefined" || typeof document.queryCommandState !== "function") {
    return false;
  }

  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
};

const updateSelectionAfterNode = (node: Node, offset = 0) => {
  if (typeof window === "undefined") {
    return;
  }

  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

const replaceTrailingDashSequence = (
  range: Range,
  replacement: string,
  trailingSequenceLength: number,
) => {
  if (!(range.startContainer instanceof Text)) {
    return false;
  }

  const textNode = range.startContainer;
  const startOffset = range.startOffset - trailingSequenceLength;

  if (startOffset < 0) {
    return false;
  }

  textNode.deleteData(startOffset, trailingSequenceLength);
  textNode.insertData(startOffset, replacement);
  placeCaretAtTextOffset(textNode, startOffset + replacement.length);
  return true;
};

export const WritingCanvasEditor = ({
  value,
  onChange,
  placeholder = "Start writing...",
}: WritingCanvasEditorProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fontSizeControlRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const isApplyingFontSizeRef = useRef(false);
  const [isFontSizeMenuOpen, setIsFontSizeMenuOpen] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState(DEFAULT_EDITOR_FONT_SIZE);
  const [formatState, setFormatState] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
  });

  const hasContent = useMemo(() => value.trim().length > 0, [value]);

  useEffect(() => {
    const editorElement = editorRef.current;

    if (!editorElement) {
      return;
    }

    const currentSerializedValue = serializeEditorContent(editorElement.innerHTML);

    if (currentSerializedValue === value) {
      return;
    }

    editorElement.innerHTML = value ? toRichTextEditorHtml(value) : "";
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event: globalThis.MouseEvent) => {
      if (!fontSizeControlRef.current?.contains(event.target as Node)) {
        setIsFontSizeMenuOpen(false);
      }
    };

    const updateToolbarState = () => {
      const editorElement = editorRef.current;
      const currentSelectionRange = getSelectionRange(editorElement);
      const wrapperElement = wrapperRef.current;
      const activeElement = typeof document !== "undefined" ? document.activeElement : null;
      const isInteractingInsideWrapper =
        Boolean(wrapperElement) &&
        Boolean(activeElement) &&
        wrapperElement.contains(activeElement);

      if (currentSelectionRange) {
        savedSelectionRef.current = currentSelectionRange.cloneRange();
      }

      const range = currentSelectionRange ?? savedSelectionRef.current;

      if (!editorElement || !range) {
        if (isInteractingInsideWrapper) {
          return;
        }

        setFormatState({
          isBold: false,
          isItalic: false,
          isUnderline: false,
        });
        setFontSizeInput(DEFAULT_EDITOR_FONT_SIZE);
        return;
      }

      const selection = typeof window !== "undefined" ? window.getSelection() : null;
      const isSelectionLiveInEditor =
        Boolean(selection) &&
        selection.rangeCount > 0 &&
        editorElement.contains(selection.getRangeAt(0).commonAncestorContainer);

      if (isSelectionLiveInEditor) {
        setFormatState({
          isBold: getCommandState("bold"),
          isItalic: getCommandState("italic"),
          isUnderline: getCommandState("underline"),
        });
      }

      if (!isApplyingFontSizeRef.current) {
        setFontSizeInput(getCurrentFontSize(editorElement, range));
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("selectionchange", updateToolbarState);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("selectionchange", updateToolbarState);
    };
  }, []);

  const restoreSavedSelection = () => {
    const range = savedSelectionRef.current;

    if (!range || typeof window === "undefined") {
      return false;
    }

    const selection = window.getSelection();

    if (!selection) {
      return false;
    }

    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const refreshToolbarState = (overrides?: Partial<typeof formatState> & { fontSize?: string }) => {
    const editorElement = editorRef.current;
    const range = getSelectionRange(editorElement) ?? savedSelectionRef.current;

    if (!editorElement || !range) {
      setFormatState({
        isBold: false,
        isItalic: false,
        isUnderline: false,
      });
      setFontSizeInput(DEFAULT_EDITOR_FONT_SIZE);
      return;
    }

    setFormatState({
      isBold: overrides?.isBold ?? getCommandState("bold"),
      isItalic: overrides?.isItalic ?? getCommandState("italic"),
      isUnderline: overrides?.isUnderline ?? getCommandState("underline"),
    });
    setFontSizeInput(overrides?.fontSize ?? getCurrentFontSize(editorElement, range));
  };

  const syncEditorValue = () => {
    const editorElement = editorRef.current;

    if (!editorElement) {
      return;
    }

    const nextValue = serializeEditorContent(editorElement.innerHTML);

    onChange(nextValue);
  };

  const handleInput = (_event: FormEvent<HTMLDivElement>) => {
    syncEditorValue();
    refreshToolbarState();
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const handleToolbarMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const runCommand = (command: "bold" | "italic" | "underline") => {
    const stateKey =
      command === "bold" ? "isBold" : command === "italic" ? "isItalic" : "isUnderline";
    const nextState = !formatState[stateKey];

    focusEditor();
    restoreSavedSelection();

    if (typeof document.execCommand === "function") {
      document.execCommand(command, false);
    }

    savedSelectionRef.current =
      getSelectionRange(editorRef.current)?.cloneRange() ?? savedSelectionRef.current;
    setFormatState((currentValue) => ({
      ...currentValue,
      [stateKey]: nextState,
    }));
    syncEditorValue();
  };

  const applyFontSize = (valueToApply: string) => {
    const normalizedValue = valueToApply.replace(/[^\d]/g, "");
    const nextFontSize = normalizedValue
      ? String(Math.max(1, Math.min(72, Number.parseInt(normalizedValue, 10))))
      : "1";

    isApplyingFontSizeRef.current = true;
    setFontSizeInput(nextFontSize);
    focusEditor();
    restoreSavedSelection();

    const editorElement = editorRef.current;

    if (!editorElement) {
      isApplyingFontSizeRef.current = false;
      return;
    }

    if (typeof document.execCommand === "function") {
      // Disable styleWithCSS so execCommand("fontSize") creates <font> tags
      // which are predictable and easy to find-and-replace.
      // With styleWithCSS=true, browsers create inconsistent CSS spans
      // (e.g. "xxx-large", "-webkit-xxx-large") that are hard to catch reliably.
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("fontSize", false, "7");
    }

    // Replace all <font> elements created by execCommand with properly styled spans.
    // We match ALL <font> elements (not just size="7") as a safety measure — normal
    // editor content should never contain <font> tags after serialization.
    editorElement.querySelectorAll<HTMLElement>("font").forEach((fontElement) => {
      const span = document.createElement("span");
      span.style.fontSize = `${nextFontSize}px`;

      while (fontElement.firstChild) {
        span.appendChild(fontElement.firstChild);
      }

      fontElement.replaceWith(span);
    });

    // Fallback: also correct any span that still has the browser's font-size-7 equivalent
    // (e.g. from a prior styleWithCSS=true run or browser-specific behavior)
    editorElement.querySelectorAll<HTMLElement>("span[style]").forEach((element) => {
      const inlineFontSize = element.style.fontSize;

      if (!inlineFontSize || inlineFontSize === `${nextFontSize}px`) {
        return;
      }

      const parsed = Number.parseFloat(inlineFontSize);

      if (
        parsed === 48 ||
        inlineFontSize === "-webkit-xxx-large" ||
        inlineFontSize === "xxx-large"
      ) {
        element.style.fontSize = `${nextFontSize}px`;
      }
    });

    savedSelectionRef.current =
      getSelectionRange(editorElement)?.cloneRange() ?? savedSelectionRef.current;
    setFontSizeInput(nextFontSize);
    syncEditorValue();
    setIsFontSizeMenuOpen(false);
    isApplyingFontSizeRef.current = false;
  };

  const adjustFontSize = (delta: number) => {
    // Read the current font size from the DOM selection for accuracy,
    // falling back to the input value or the default
    const editorElement = editorRef.current;
    const range = getSelectionRange(editorElement) ?? savedSelectionRef.current;
    const domFontSize = getCurrentFontSize(editorElement, range);
    const baseFontSize = Number.parseInt(
      domFontSize || fontSizeInput || DEFAULT_EDITOR_FONT_SIZE,
      10,
    );
    const currentFontSize = Number.isFinite(baseFontSize)
      ? baseFontSize
      : Number.parseInt(DEFAULT_EDITOR_FONT_SIZE, 10);
    const nextFontSize = String(Math.max(1, Math.min(72, currentFontSize + delta)));

    applyFontSize(nextFontSize);
  };

  const insertQuotePair = (quoteCharacter: '"' | "'") => {
    const editorElement = editorRef.current;
    const selectionContext = getSelectionContext(editorElement);

    if (!editorElement || !selectionContext) {
      return false;
    }

    const { range, previousCharacter, nextCharacter } = selectionContext;

    if (range.collapsed && nextCharacter === quoteCharacter) {
      const selection = window.getSelection();

      if (!selection) {
        return false;
      }

      const nextRange = range.cloneRange();
      nextRange.setStart(range.endContainer, range.endOffset + 1);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      return true;
    }

    if (
      range.collapsed &&
      ((quoteCharacter === "'" && isWordCharacter(previousCharacter)) ||
        (!isQuoteOpenContext(previousCharacter) && !nextCharacter))
    ) {
      return false;
    }

    if (range.collapsed) {
      const quoteNode = document.createTextNode(`${quoteCharacter}${quoteCharacter}`);
      range.insertNode(quoteNode);
      updateSelectionAfterNode(quoteNode, 1);
      syncEditorValue();
      refreshToolbarState();
      return true;
    }

    const selectedContents = range.extractContents();
    const fragment = document.createDocumentFragment();
    const openingQuote = document.createTextNode(quoteCharacter);
    const closingQuote = document.createTextNode(quoteCharacter);

    fragment.append(openingQuote, selectedContents, closingQuote);
    range.insertNode(fragment);
    updateSelectionAfterNode(closingQuote);
    syncEditorValue();
    refreshToolbarState();
    return true;
  };

  const handleBeforeInput = (event: InputEvent & { currentTarget: HTMLDivElement }) => {
    const editorElement = editorRef.current;
    const selectionContext = getSelectionContext(editorElement);

    if (!editorElement || !selectionContext || event.inputType !== "insertText") {
      return;
    }

    const { range } = selectionContext;

    if (event.data === "-") {
      const textBeforeCursor =
        range.collapsed && range.startContainer instanceof Text
          ? range.startContainer.data.slice(0, range.startOffset)
          : "";
      const trailingHyphenRun = textBeforeCursor.match(/-+$/)?.[0];
      const trailingEmDashRun = textBeforeCursor.match(/—+$/)?.[0];

      if (trailingHyphenRun || trailingEmDashRun) {
        event.preventDefault();

        const sourceRun = trailingHyphenRun ?? trailingEmDashRun ?? "";
        const replacement = trailingHyphenRun
          ? buildAutoDashReplacement(`${sourceRun}-`)
          : "—".repeat(sourceRun.length + 1);

        if (replaceTrailingDashSequence(range, replacement, sourceRun.length)) {
          syncEditorValue();
          refreshToolbarState();
        }
      }

      return;
    }

    if (event.data === '"' || event.data === "'") {
      if (insertQuotePair(event.data)) {
        event.preventDefault();
      }
    }
  };

  const handlePaste = (event: ClipboardEvent & { currentTarget: HTMLDivElement }) => {
    event.preventDefault();

    const html = event.clipboardData?.getData("text/html") ?? "";
    const plainText = event.clipboardData?.getData("text/plain") ?? "";

    if (typeof document.execCommand !== "function") {
      return;
    }

    if (html.trim()) {
      document.execCommand("insertHTML", false, normalizePastedRichTextHtml(html));
    } else {
      const normalizedPlainText = plainText.replace(/\r\n?/g, "\n");

      if (normalizedPlainText.includes("\n")) {
        document.execCommand(
          "insertHTML",
          false,
          convertPlainTextToRichTextHtml(normalizedPlainText),
        );
      } else {
        document.execCommand("insertText", false, plainText);
      }
    }

    syncEditorValue();
    refreshToolbarState();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      runCommand("bold");
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      runCommand("italic");
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "u") {
      event.preventDefault();
      runCommand("underline");
    }
  };

  return (
    <div ref={wrapperRef}>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-input bg-transparent px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => adjustFontSize(-1)}
          className={cn(toolbarButtonClassName, toolbarIconButtonClassName)}
          aria-label="Decrease font size"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div ref={fontSizeControlRef} className="relative w-[76px] shrink-0">
          <div className="relative">
            <Input
              value={fontSizeInput}
              onChange={(event) => setFontSizeInput(event.target.value.replace(/[^\d]/g, ""))}
              onFocus={(event) => {
                setIsFontSizeMenuOpen(true);
                event.target.select();
              }}
              onClick={() => setIsFontSizeMenuOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyFontSize(fontSizeInput);
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
                  }
                }, 0);
              }}
              inputMode="numeric"
              aria-label="Font size"
              className="h-10 rounded-[10px] border-input pr-8 text-center"
            />

            <button
              type="button"
              aria-label="Toggle font size options"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsFontSizeMenuOpen((currentValue) => !currentValue)}
              className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {isFontSizeMenuOpen ? (
            <div className="absolute left-0 top-[calc(100%+0.35rem)] z-30 w-[76px] rounded-[10px] border border-input bg-popover p-1 shadow-md">
              {CHAPTER_FONT_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyFontSize(size)}
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
          className={cn(toolbarButtonClassName, toolbarIconButtonClassName)}
          aria-label="Increase font size"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => runCommand("bold")}
          className={cn(toolbarButtonClassName, formatState.isBold && "bg-accent text-foreground")}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => runCommand("italic")}
          className={cn(toolbarButtonClassName, formatState.isItalic && "bg-accent text-foreground")}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => runCommand("underline")}
          className={cn(
            toolbarButtonClassName,
            formatState.isUnderline && "bg-accent text-foreground",
          )}
          aria-label="Underline"
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          role="textbox"
          aria-label="Chapter content"
          aria-multiline="true"
          contentEditable
          data-placeholder={!hasContent ? placeholder : ""}
          suppressContentEditableWarning
          className={editorClassName}
          onFocus={() => refreshToolbarState()}
          onBlur={() => {
            savedSelectionRef.current = getSelectionRange(editorRef.current)?.cloneRange() ?? savedSelectionRef.current;
          }}
          onMouseUp={() => refreshToolbarState()}
          onKeyUp={() => refreshToolbarState()}
          onInput={handleInput}
          onBeforeInput={(event) =>
            handleBeforeInput(event.nativeEvent as InputEvent & { currentTarget: HTMLDivElement })
          }
          onPaste={(event) =>
            handlePaste(event.nativeEvent as ClipboardEvent & { currentTarget: HTMLDivElement })
          }
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};

export default WritingCanvasEditor;
