import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import type { Book } from "@/components/writing/types";

/**
 * Strip HTML tags and decode entities to get readable plain text.
 * Converts <p> and <br> to newlines for proper formatting.
 */
const htmlToPlainText = (html: string): string => {
  if (!html || !html.trim()) return "";

  // If it's already plain text (no HTML tags), return as-is
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;

  let text = html;
  // Convert </p><p> boundaries to double newlines (paragraph breaks)
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, "\n");
  // Convert <br> tags to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Remove opening <p> and closing </p> at start/end
  text = text.replace(/<\/?p[^>]*>/gi, "");
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");

  return text.trim();
};

/**
 * Sanitize a filename by removing special characters.
 */
const sanitizeFilename = (name: string): string =>
  name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "book";

// ─── PDF Export ───────────────────────────────────────────────────────────────

/**
 * Download all chapters of a book as a PDF file.
 * Each chapter starts on a new page with its title as a heading.
 */
export const downloadBookAsPdf = (book: Book): void => {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 25;
  const marginRight = 25;
  const marginTop = 30;
  const marginBottom = 25;
  const maxTextWidth = pageWidth - marginLeft - marginRight;

  const titleFontSize = 22;
  const chapterTitleFontSize = 16;
  const bodyFontSize = 11;
  const lineSpacing = 6;

  // ── Book title page ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleFontSize);
  const bookTitleLines = doc.splitTextToSize(book.title, maxTextWidth);
  const titleY = pageHeight / 3;
  doc.text(bookTitleLines, pageWidth / 2, titleY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(book.author, pageWidth / 2, titleY + bookTitleLines.length * 10 + 10, {
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

    // Chapter title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(chapterTitleFontSize);
    const chapterTitle = chapter.title || `Chapter ${i + 1}`;
    const titleLines = doc.splitTextToSize(chapterTitle, maxTextWidth);
    doc.text(titleLines, marginLeft, cursorY);
    cursorY += titleLines.length * 8 + 10;

    // Chapter content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(bodyFontSize);

    const plainText = htmlToPlainText(chapter.content);
    const paragraphs = plainText.split("\n");

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        // Empty line = paragraph break
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

      // Small gap after a paragraph
      cursorY += 2;
    }
  }

  const filename = `${sanitizeFilename(book.title)}.pdf`;
  doc.save(filename);
};

// ─── DOCX Export ──────────────────────────────────────────────────────────────

/**
 * Download all chapters of a book as a DOCX file.
 * Each chapter starts on a new page with its title as a heading.
 */
export const downloadBookAsDocx = async (book: Book): Promise<void> => {
  const publishedChapters = book.chapters.filter(
    (ch) => ch.title.trim() || ch.content.trim(),
  );

  const sections: Paragraph[] = [];

  // ── Book title page ──
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
          text: book.author,
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

    // Page break before each chapter
    sections.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    );

    // Chapter title
    sections.push(
      new Paragraph({
        text: chapterTitle,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      }),
    );

    // Chapter content paragraphs
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

  const doc = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${sanitizeFilename(book.title)}.docx`;
  saveAs(blob, filename);
};
