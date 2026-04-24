import DOMPurify from "dompurify";

export const CHAPTER_FONT_SIZE_OPTIONS = [
  "8",
  "9",
  "10",
  "11",
  "12",
  "14",
  "16",
  "18",
  "24",
  "26",
  "28",
  "36",
  "48",
  "72",
] as const;

const ALLOWED_FONT_SIZES = new Set(
  CHAPTER_FONT_SIZE_OPTIONS.map((size) => `${size}px`),
);
const DEFAULT_FONT_SIZE = "12";
const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

const createContainer = () => {
  if (typeof document === "undefined") {
    return null;
  }

  return document.createElement("div");
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeFontSizeValue = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d+)(px)?$/i);

  if (!match) {
    return null;
  }

  const numericValue = Number.parseInt(match[1], 10);

  if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 999) {
    return null;
  }

  return `${numericValue}px`;
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

const normalizeInlineStyles = (container: HTMLElement) => {
  container.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    const normalizedFontSize = normalizeFontSizeValue(element.style.fontSize);

    element.removeAttribute("style");

    if (normalizedFontSize) {
      element.style.fontSize = normalizedFontSize;
    }
  });

  container.querySelectorAll<HTMLElement>("span").forEach((span) => {
    if (!span.getAttribute("style")) {
      unwrapElement(span);
    }
  });
};

const extractPlainTextFromNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  if (node.tagName === "BR") {
    return "\n";
  }

  const childText = Array.from(node.childNodes)
    .map((child) => extractPlainTextFromNode(child))
    .join("");

  if (node.tagName === "P") {
    return `${childText}\n\n`;
  }

  return childText;
};

const sanitizeRichTextHtml = (value: string) => {
  const sanitized = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "span"],
    ALLOWED_ATTR: ["style"],
  });
  const container = createContainer();

  if (!container) {
    return sanitized.trim();
  }

  container.innerHTML = sanitized;
  normalizeInlineStyles(container);

  return container.innerHTML.trim();
};

export const normalizePastedRichTextHtml = (value: string) => {
  const container = createContainer();

  if (!container) {
    return sanitizeRichTextHtml(value);
  }

  container.innerHTML = value;

  container
    .querySelectorAll<HTMLElement>("div, h1, h2, h3, h4, h5, h6")
    .forEach((element) => {
      const paragraph = document.createElement("p");

      while (element.firstChild) {
        paragraph.appendChild(element.firstChild);
      }

      element.replaceWith(paragraph);
    });

  const sanitized = sanitizeRichTextHtml(container.innerHTML);
  const normalizedContainer = createContainer();

  if (!normalizedContainer) {
    return sanitized;
  }

  normalizedContainer.innerHTML = sanitized;

  normalizedContainer.querySelectorAll<HTMLParagraphElement>("p").forEach((paragraph) => {
    const normalizedText = paragraph.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
    const containsLineBreak = Boolean(paragraph.querySelector("br"));

    if (!normalizedText && !containsLineBreak) {
      paragraph.remove();
    }
  });

  return normalizedContainer.innerHTML.trim();
};

const hasRichFormatting = (value: string) => {
  const container = createContainer();

  if (!container) {
    return /<(strong|em|u|span)\b/i.test(value);
  }

  container.innerHTML = value;

  return Boolean(container.querySelector("strong, em, u, span[style*='font-size']"));
};

export const normalizeChapterFontSize = (value: string | null | undefined) =>
  normalizeFontSizeValue(value)?.replace("px", "") ?? DEFAULT_FONT_SIZE;

export const clampChapterFontSize = (value: string) => {
  const normalized = value.replace(/[^\d]/g, "");

  if (!normalized) {
    return DEFAULT_FONT_SIZE;
  }

  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_FONT_SIZE;
  }

  return String(Math.max(1, parsed));
};

export const buildAutoDashReplacement = (hyphenRun: string): string => {
  const count = hyphenRun.length;
  if (count < 2) return hyphenRun;
  // 2 hyphens → 1 em dash, 3 → 2, 4 → 3, etc.
  return "—".repeat(count - 1);
};

export const convertPlainTextToRichTextHtml = (value: string) => {
  const normalizedValue = value.replace(/\r\n?/g, "\n");

  if (!normalizedValue.trim()) {
    return "";
  }

  const paragraphs: string[] = [];
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length === 0) {
      return;
    }

    paragraphs.push(
      `<p>${currentParagraphLines.map((line) => escapeHtml(line)).join("<br />")}</p>`,
    );
    currentParagraphLines = [];
  };

  normalizedValue.split("\n").forEach((line) => {
    if (line === "") {
      flushParagraph();
      paragraphs.push("<p><br /></p>");
      return;
    }

    currentParagraphLines.push(line);
  });

  flushParagraph();

  return paragraphs.join("");
};

export const getPlainTextFromRichText = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (!HTML_TAG_PATTERN.test(trimmedValue)) {
    return trimmedValue;
  }

  const container = createContainer();

  if (!container) {
    return trimmedValue.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  container.innerHTML = sanitizeRichTextHtml(trimmedValue);

  return extractPlainTextFromNode(container)
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const toRichTextEditorHtml = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (!HTML_TAG_PATTERN.test(value)) {
    return convertPlainTextToRichTextHtml(value);
  }

  return sanitizeRichTextHtml(value);
};

export const serializeRichTextForStorage = (value: string) => {
  const normalizedHtml = toRichTextEditorHtml(value);

  if (!normalizedHtml) {
    return "";
  }

  return hasRichFormatting(normalizedHtml)
    ? normalizedHtml
    : getPlainTextFromRichText(normalizedHtml);
};

export const areChapterContentsEqual = (left: string, right: string) =>
  serializeRichTextForStorage(left) === serializeRichTextForStorage(right);

export const getReadableChapterHtml = (value: string) => toRichTextEditorHtml(value);
