import { Extension, InputRule } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

import { buildAutoDashReplacement } from "@/lib/writing/richText";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const ChapterFontSize = Extension.create({
  name: "chapterFontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

export const AutoDashSequence = Extension.create({
  name: "autoDashSequence",

  addInputRules() {
    return [
      new InputRule({
        find: /(-{2,})$/,
        handler: ({ state, range, match }) => {
          const hyphenRun = match[1] ?? match[0];
          const replacement = buildAutoDashReplacement(hyphenRun);

          if (replacement === hyphenRun) {
            return null;
          }

          state.tr.insertText(replacement, range.from, range.to);
        },
      }),
    ];
  },
});

const isWordCharacter = (value: string) => /[A-Za-z0-9]/.test(value);
const isQuoteOpenContext = (value: string) =>
  !value || /[\s([{<\-—"“'‘]/.test(value);

const createQuotePairHandler =
  (quoteCharacter: '"' | "'") =>
  ({ editor }: { editor: { state: any; view: any } }) => {
    const { state, view } = editor;
    const { from, to, empty } = state.selection;
    const previousCharacter = state.doc.textBetween(Math.max(0, from - 1), from, "", "");
    const nextCharacter = state.doc.textBetween(
      to,
      Math.min(state.doc.content.size, to + 1),
      "",
      "",
    );

    if (empty && nextCharacter === quoteCharacter) {
      view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from + 1)));
      return true;
    }

    if (
      empty &&
      ((quoteCharacter === "'" && isWordCharacter(previousCharacter)) ||
        (!isQuoteOpenContext(previousCharacter) && !nextCharacter))
    ) {
      return false;
    }

    const selectedText = state.doc.textBetween(from, to, "\n", "\n");
    const wrappedText = `${quoteCharacter}${selectedText}${quoteCharacter}`;
    const nextCursorPosition = empty ? from + 1 : from + wrappedText.length;
    const transaction = state.tr.insertText(wrappedText, from, to);

    transaction.setSelection(TextSelection.create(transaction.doc, nextCursorPosition));
    transaction.scrollIntoView();

    view.dispatch(transaction);
    return true;
  };

export const AutoPairQuotes = Extension.create({
  name: "autoPairQuotes",

  addKeyboardShortcuts() {
    return {
      '"': () => createQuotePairHandler('"')({ editor: this.editor }),
      "'": () => createQuotePairHandler("'")({ editor: this.editor }),
    };
  },
});
