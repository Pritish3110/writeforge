import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";

import {
  ChapterFontSize,
  AutoDashSequence,
  AutoPairQuotes,
} from "@/lib/writing/richTextExtensions";
import { WritingEditorToolbar } from "@/components/writing/WritingEditorToolbar";

interface WritingChapterEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}


export const WritingChapterEditor = ({
  value,
  onChange,
  placeholder = "Start writing...",
}: WritingChapterEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading — this is a text editor, not a document editor
        heading: false,
        // Disable code/codeBlock — not needed for creative writing
        code: false,
        codeBlock: false,
        // Disable blockquote — keep it simple
        blockquote: false,
        // Disable lists — keep it simple
        bulletList: false,
        orderedList: false,
        listItem: false,
        // Disable horizontal rule
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      ChapterFontSize,
      AutoDashSequence,
      AutoPairQuotes,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        "data-placeholder": placeholder,
      },
      // Strip external formatting on paste — behave like a textarea
      handlePaste: (_view, event) => {
        const plainText = event.clipboardData?.getData("text/plain") ?? "";

        if (!plainText) {
          return false;
        }

        // Let TipTap handle it as plain text insertion
        event.preventDefault();
        _view.dispatch(
          _view.state.tr.insertText(plainText).scrollIntoView(),
        );
        return true;
      },
      // Make Enter insert a hard break (<br>) instead of a new paragraph
      // This gives single-line spacing like a textarea
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          // Insert a hard break (same as Shift+Enter)
          const { state, dispatch } = _view;
          const { tr } = state;
          const hardBreakType = state.schema.nodes.hardBreak;

          if (hardBreakType) {
            dispatch(tr.replaceSelectionWith(hardBreakType.create()).scrollIntoView());
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  // Sync external value changes into the editor
  useEffect(() => {
    if (!editor) {
      return;
    }

    // Only update if the value actually differs from current editor content
    // (prevents cursor jumping on every keystroke)
    const currentHtml = editor.getHTML();

    if (currentHtml === value) {
      return;
    }

    // Also check if both are "empty" to avoid unnecessary updates
    const isEditorEmpty = currentHtml === "<p></p>" || currentHtml === "";
    const isValueEmpty = !value || value === "<p></p>" || value === "";

    if (isEditorEmpty && isValueEmpty) {
      return;
    }

    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  return (
    <div>
      <WritingEditorToolbar editor={editor} />
      <div
        className="writing-chapter-editor h-[calc(100vh-440px)] min-h-[300px] w-full overflow-y-auto rounded-[10px] px-5 py-5"
        style={{ backgroundColor: "hsl(var(--muted) / 0.58)" }}
      >
        <EditorContent editor={editor} />
      </div>

      <style>{`
        /* Textarea-like spacing: remove paragraph margins */
        .writing-chapter-editor .ProseMirror p {
          margin: 0;
          min-height: 2rem;
          white-space: pre-wrap;
        }

        /* Editor text styling matching the original textarea */
        .writing-chapter-editor .ProseMirror {
          font-size: 15px;
          line-height: 2rem;
          color: hsl(var(--foreground));
          outline: none;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        /* Preserve inline formatting styles */
        .writing-chapter-editor .ProseMirror strong { font-weight: 600; }
        .writing-chapter-editor .ProseMirror em { font-style: italic; }
        .writing-chapter-editor .ProseMirror u { text-decoration: underline; }

        /* Placeholder: "Start writing..." text when editor is empty */
        .writing-chapter-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          float: left;
          height: 0;
          font-size: 15px;
          line-height: 2rem;
        }

        /* Focus outline removal (matching the textarea) */
        .writing-chapter-editor .ProseMirror:focus {
          outline: none;
        }

        .writing-chapter-editor .ProseMirror:focus-visible {
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default WritingChapterEditor;
