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

/**
 * Convert plain text content (from the old Textarea editor) to HTML that
 * TipTap can understand. If the content already contains HTML tags, return as-is.
 * Each line becomes its own <p> tag for reliable round-tripping.
 */
const normalizeContentForEditor = (content: string): string => {
  if (!content || !content.trim()) {
    return "";
  }

  // If content already has HTML tags, it's from TipTap — use as-is
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }

  // Plain text: split by newlines and wrap each line in <p> tags
  // Empty lines become empty <p></p> (visible blank lines in the editor)
  const lines = content.split("\n");
  return lines
    .map((line) => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<p>${escaped || ""}</p>`;
    })
    .join("");
};

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
    content: normalizeContentForEditor(value),
    editorProps: {
      attributes: {
        "data-placeholder": placeholder,
      },
      // Strip external formatting on paste — preserve newlines as paragraphs
      handlePaste: (view, event) => {
        const plainText = event.clipboardData?.getData("text/plain") ?? "";

        if (!plainText) {
          return false;
        }

        event.preventDefault();

        // Convert plain text lines to paragraph nodes
        const { schema, tr } = view.state;
        const lines = plainText.split("\n");
        const nodes: import("@tiptap/pm/model").Node[] = [];

        for (const line of lines) {
          if (line) {
            nodes.push(schema.nodes.paragraph.create(null, schema.text(line)));
          } else {
            // Empty line = empty paragraph (blank line)
            nodes.push(schema.nodes.paragraph.create());
          }
        }

        if (nodes.length > 0) {
          const fragment = schema.nodes.doc.create(null, nodes);
          const slice = fragment.slice(0, fragment.content.size);
          view.dispatch(tr.replaceSelection(slice).scrollIntoView());
        }

        return true;
      },
      // Enter creates a new <p> paragraph (TipTap default)
      // p { margin: 0 } gives textarea-like single-line spacing
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

    editor.commands.setContent(normalizeContentForEditor(value), { emitUpdate: false });
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
        /* Textarea-like spacing: each <p> is one line, no extra margin */
        .writing-chapter-editor .ProseMirror p {
          margin: 0;
          min-height: 1.5em;
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
