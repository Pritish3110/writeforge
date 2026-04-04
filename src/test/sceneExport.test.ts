import { describe, expect, it } from "vitest";
import {
  hasExportableSceneText,
  normalizeExportText,
} from "@/lib/sceneExport";

describe("sceneExport helpers", () => {
  it("normalizes line endings and trims outer whitespace", () => {
    expect(normalizeExportText("\r\n  Hello world\r\n")).toBe("Hello world");
  });

  it("blocks empty export content", () => {
    expect(hasExportableSceneText("   \n\n   ")).toBe(false);
  });

  it("allows non-empty export content", () => {
    expect(hasExportableSceneText("A single line of text.")).toBe(true);
  });
});
