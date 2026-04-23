import { describe, expect, it } from "vitest";

import { convertPlainTextToRichTextHtml, getPlainTextFromRichText } from "@/lib/writing/richText";

describe("rich text helpers", () => {
  it("preserves blank lines when converting plain text for the editor", () => {
    const value = "First line\nSecond line\n\nFourth line";

    expect(convertPlainTextToRichTextHtml(value)).toBe(
      "<p>First line<br />Second line</p><p><br /></p><p>Fourth line</p>",
    );
  });

  it("keeps paragraph breaks readable when extracting plain text", () => {
    const value = "<p>First line<br />Second line</p><p><br /></p><p>Fourth line</p>";

    expect(getPlainTextFromRichText(value)).toBe("First line\nSecond line\n\nFourth line");
  });
});
