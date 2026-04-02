export type ExportFormatMode = "Minimal" | "Manuscript";

export interface SceneExportOptions {
  sessionTitle: string;
  text: string;
  wordCount: number;
  includeMetadata: boolean;
  formattingMode: ExportFormatMode;
}

const LETTER_WIDTH_PT = 612;
const LETTER_HEIGHT_PT = 792;
const DEFAULT_FILE_STEM = "writing-session";

const getParagraphs = (text: string): string[] =>
  text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean);

const sanitizeFileName = (value: string): string => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || DEFAULT_FILE_STEM;
};

const buildFileStem = (sessionTitle: string): string => {
  const datePart = new Date().toISOString().slice(0, 10);
  return `${sanitizeFileName(sessionTitle || DEFAULT_FILE_STEM)}-${datePart}`;
};

const buildMetadataLines = (sessionTitle: string, wordCount: number): string[] => [
  `Date: ${new Date().toLocaleString()}`,
  `Session: ${sessionTitle.trim() || "Untitled Session"}`,
  `Word Count: ${wordCount}`,
];

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportSceneAsPdf = async (options: SceneExportOptions): Promise<string> => {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    unit: "pt",
    format: "letter",
    compress: true,
  });

  const isManuscript = options.formattingMode === "Manuscript";
  const bodyFont = isManuscript ? "courier" : "times";
  const titleFont = isManuscript ? "courier" : "helvetica";
  const margin = isManuscript ? 72 : 54;
  const bodyFontSize = 12;
  const titleFontSize = isManuscript ? 18 : 20;
  const metaFontSize = 10;
  const bodyLineHeight = isManuscript ? 24 : 18;
  const paragraphGap = isManuscript ? 10 : 6;
  const pageWidth = pdf.internal.pageSize.getWidth?.() ?? LETTER_WIDTH_PT;
  const pageHeight = pdf.internal.pageSize.getHeight?.() ?? LETTER_HEIGHT_PT;
  const usableWidth = pageWidth - margin * 2;
  const fileName = `${buildFileStem(options.sessionTitle)}.pdf`;
  const paragraphs = getParagraphs(options.text);
  let cursorY = margin;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY + requiredHeight <= pageHeight - margin) return;

    pdf.addPage("letter", "portrait");
    cursorY = margin;
  };

  if (options.sessionTitle.trim()) {
    pdf.setFont(titleFont, "bold");
    pdf.setFontSize(titleFontSize);
    ensureSpace(titleFontSize + 16);
    pdf.text(options.sessionTitle.trim(), pageWidth / 2, cursorY, { align: "center" });
    cursorY += titleFontSize + 12;
  }

  if (options.includeMetadata) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(metaFontSize);

    for (const line of buildMetadataLines(options.sessionTitle, options.wordCount)) {
      ensureSpace(metaFontSize + 10);
      pdf.text(line, margin, cursorY);
      cursorY += metaFontSize + 6;
    }

    cursorY += 8;
  }

  pdf.setFont(bodyFont, "normal");
  pdf.setFontSize(bodyFontSize);

  for (const paragraph of paragraphs) {
    const lines = pdf.splitTextToSize(paragraph, usableWidth) as string[];

    for (const line of lines) {
      ensureSpace(bodyLineHeight);
      pdf.text(line, margin, cursorY);
      cursorY += bodyLineHeight;
    }

    cursorY += paragraphGap;
  }

  pdf.save(fileName);

  return fileName;
};

export const exportSceneAsDocx = async (options: SceneExportOptions): Promise<string> => {
  const {
    AlignmentType,
    Document,
    LineRuleType,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  const isManuscript = options.formattingMode === "Manuscript";
  const fileName = `${buildFileStem(options.sessionTitle)}.docx`;
  const paragraphs = getParagraphs(options.text);
  const bodyFont = isManuscript ? "Courier New" : "Times New Roman";
  const bodySize = 24;
  const titleSize = isManuscript ? 28 : 32;
  const lineSpacing = isManuscript ? 480 : 320;
  const paragraphAfter = isManuscript ? 180 : 120;
  const children: Paragraph[] = [];

  if (options.sessionTitle.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: options.sessionTitle.trim(),
            bold: true,
            font: bodyFont,
            size: titleSize,
          }),
        ],
      })
    );
  }

  if (options.includeMetadata) {
    for (const line of buildMetadataLines(options.sessionTitle, options.wordCount)) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: line,
              italics: true,
              font: bodyFont,
              size: 20,
            }),
          ],
        })
      );
    }

    children.push(new Paragraph({ spacing: { after: 140 } }));
  }

  for (const paragraph of paragraphs) {
    children.push(
      new Paragraph({
        spacing: {
          after: paragraphAfter,
          line: lineSpacing,
          lineRule: LineRuleType.AUTO,
        },
        children: [
          new TextRun({
            text: paragraph,
            font: bodyFont,
            size: bodySize,
          }),
        ],
      })
    );
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, fileName);

  return fileName;
};
