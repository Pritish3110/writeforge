import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  PageBreak,
  AlignmentType,
  ImageRun,
} from "docx";
import { saveAs } from "file-saver";
import type { Book } from "@/components/writing/types";

/**
 * Options for book export.
 */
export interface BookExportOptions {
  /** The account display name to use as the author on the title page */
  displayName: string;
  /** The cover image download URL (Firebase Storage) */
  coverUrl?: string | null;
}

/**
 * Strip HTML tags and decode entities to get readable plain text.
 */
const htmlToPlainText = (html: string): string => {
  if (!html || !html.trim()) return "";
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;

  let text = html;
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?p[^>]*>/gi, "");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");

  return text.trim();
};

const sanitizeFilename = (name: string): string =>
  name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "book";

/**
 * Fetch an image via the backend proxy to bypass CORS.
 * Returns a base64 data URI string or null on failure.
 */
const fetchImageViaProxy = async (
  imageUrl: string,
): Promise<string | null> => {
  try {
    const apiBase = import.meta.env.VITE_API_URL || "";
    const proxyUrl = `${apiBase}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) return null;

    const data = await response.json();
    return data.base64 || null;
  } catch {
    return null;
  }
};

/**
 * Get image dimensions from a base64 data URI.
 */
const getImageDimensions = (
  base64: string,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = base64;
  });

/**
 * Convert a base64 data URI to a Uint8Array (for DOCX ImageRun).
 */
const base64ToUint8Array = (base64DataUri: string): Uint8Array => {
  const base64 = base64DataUri.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

// ─── PDF Export ───────────────────────────────────────────────────────────────

export const downloadBookAsPdf = async (
  book: Book,
  options: BookExportOptions,
): Promise<void> => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 25;
  const marginRight = 25;
  const marginTop = 30;
  const marginBottom = 25;
  const maxTextWidth = pageWidth - marginLeft - marginRight;
  const lineSpacing = 6;

  // ── Page 1: Cover image (if available) ──
  let hasCoverPage = false;

  if (options.coverUrl) {
    const base64 = await fetchImageViaProxy(options.coverUrl);

    if (base64) {
      try {
        const dimensions = await getImageDimensions(base64);
        const format = base64.includes("image/png") ? "PNG" : "JPEG";

        hasCoverPage = true;

        const maxCoverWidth = pageWidth - 40;
        const maxCoverHeight = pageHeight - 40;
        const scale = Math.min(
          maxCoverWidth / dimensions.width,
          maxCoverHeight / dimensions.height,
        );
        const renderWidth = dimensions.width * scale;
        const renderHeight = dimensions.height * scale;
        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        doc.addImage(base64, format, x, y, renderWidth, renderHeight);
      } catch {
        // Cover processing failed, skip it
      }
    }
  }

  // ── Page 2: Title page ──
  if (hasCoverPage) {
    doc.addPage();
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const bookTitleLines = doc.splitTextToSize(book.title, maxTextWidth);
  const titleY = pageHeight / 3;
  doc.text(bookTitleLines, pageWidth / 2, titleY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(options.displayName, pageWidth / 2, titleY + bookTitleLines.length * 10 + 10, {
    align: "center",
  });

  if (book.description) {
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(book.description, maxTextWidth - 20);
    doc.text(descLines, pageWidth / 2, titleY + bookTitleLines.length * 10 + 25, {
      align: "center",
    });
  }

  // ── Chapters ──
  const publishedChapters = book.chapters.filter(
    (ch) => ch.title.trim() || ch.content.trim(),
  );

  for (let i = 0; i < publishedChapters.length; i++) {
    const chapter = publishedChapters[i];
    doc.addPage();

    let cursorY = marginTop;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const chapterTitle = chapter.title || `Chapter ${i + 1}`;
    const chapterTitleLines = doc.splitTextToSize(chapterTitle, maxTextWidth);
    doc.text(chapterTitleLines, marginLeft, cursorY);
    cursorY += chapterTitleLines.length * 8 + 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const plainText = htmlToPlainText(chapter.content);
    const paragraphs = plainText.split("\n");

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        cursorY += lineSpacing;
        if (cursorY > pageHeight - marginBottom) {
          doc.addPage();
          cursorY = marginTop;
        }
        continue;
      }

      const wrappedLines = doc.splitTextToSize(paragraph, maxTextWidth);

      for (const line of wrappedLines) {
        if (cursorY > pageHeight - marginBottom) {
          doc.addPage();
          cursorY = marginTop;
        }
        doc.text(line, marginLeft, cursorY);
        cursorY += lineSpacing;
      }

      cursorY += 2;
    }
  }

  const filename = `${sanitizeFilename(book.title)}.pdf`;
  doc.save(filename);
};

// ─── DOCX Export ──────────────────────────────────────────────────────────────

export const downloadBookAsDocx = async (
  book: Book,
  options: BookExportOptions,
): Promise<void> => {
  const publishedChapters = book.chapters.filter(
    (ch) => ch.title.trim() || ch.content.trim(),
  );

  const sections: Paragraph[] = [];

  // ── Page 1: Cover image (if available) ──
  if (options.coverUrl) {
    const base64 = await fetchImageViaProxy(options.coverUrl);

    if (base64) {
      try {
        const uint8 = base64ToUint8Array(base64);
        const dimensions = await getImageDimensions(base64);
        const isPng = base64.includes("image/png");

        const maxWidth = 432;
        const maxHeight = 648;
        const scale = Math.min(maxWidth / dimensions.width, maxHeight / dimensions.height);
        const renderWidth = Math.round(dimensions.width * scale);
        const renderHeight = Math.round(dimensions.height * scale);

        sections.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: uint8,
                transformation: { width: renderWidth, height: renderHeight },
                type: isPng ? "png" : "jpg",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
          }),
          new Paragraph({ children: [new PageBreak()] }),
        );
      } catch {
        // Cover processing failed, skip it
      }
    }
  }

  // ── Page 2: Title page ──
  sections.push(
    new Paragraph({
      children: [new TextRun("")],
      spacing: { before: 4000 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: book.title,
          bold: true,
          size: 52,
          font: "Georgia",
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: options.displayName,
          size: 28,
          font: "Georgia",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    }),
  );

  if (book.description) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: book.description,
            size: 22,
            font: "Georgia",
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
      }),
    );
  }

  // ── Chapters ──
  for (let i = 0; i < publishedChapters.length; i++) {
    const chapter = publishedChapters[i];
    const chapterTitle = chapter.title || `Chapter ${i + 1}`;
    const plainText = htmlToPlainText(chapter.content);
    const paragraphs = plainText.split("\n");

    sections.push(new Paragraph({ children: [new PageBreak()] }));

    // Chapter title — black text, NOT the blue Heading style
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: chapterTitle,
            bold: true,
            size: 32,
            font: "Georgia",
            color: "000000",
          }),
        ],
        spacing: { after: 400 },
      }),
    );

    for (const paragraph of paragraphs) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: paragraph,
              size: 24,
              font: "Georgia",
            }),
          ],
          spacing: { after: 120, line: 360 },
        }),
      );
    }
  }

  const docFile = new Document({
    sections: [{ children: sections }],
  });

  const blobResult = await Packer.toBlob(docFile);
  const filename = `${sanitizeFilename(book.title)}.docx`;
  saveAs(blobResult, filename);
};
