import { describe, expect, it } from "vitest";
import {
  buildEpubBlob,
  escapeHtml,
  extractHeadings,
  getDocumentStats,
  markdownToPlainText,
  searchWorkspace,
  slugifyHeading,
} from "./markdown";
import type { WorkspaceFile } from "../types";

describe("markdown helpers", () => {
  it("extracts stable heading IDs and levels", () => {
    expect(extractHeadings("# Intro\n\n## Next step\n\n## Next step")).toEqual([
      { id: "intro", depth: 1, text: "Intro", line: 1 },
      { id: "next-step", depth: 2, text: "Next step", line: 3 },
      { id: "next-step-2", depth: 2, text: "Next step", line: 5 },
    ]);
  });

  it("ignores heading-looking text inside fenced code blocks", () => {
    expect(
      extractHeadings("# Real\n\n```md\n# Not a heading\n```\n\n## Also real"),
    ).toEqual([
      { id: "real", depth: 1, text: "Real", line: 1 },
      { id: "also-real", depth: 2, text: "Also real", line: 7 },
    ]);
  });

  it("keeps useful IDs for non-English headings", () => {
    expect(slugifyHeading("مرحبا بالعالم")).toBe("مرحبا-بالعالم");
  });

  it("counts document words without markdown punctuation", () => {
    const stats = getDocumentStats(
      "# Title\n\nHello **portable** files.\n\n- [x] Done",
    );

    expect(stats.words).toBe(6);
    expect(stats.paragraphs).toBe(2);
    expect(stats.readingMinutes).toBe(1);
  });

  it("converts markdown to plain text for copy and search summaries", () => {
    expect(
      markdownToPlainText(
        "[Tenbase](https://example.com) keeps `files` portable.",
      ),
    ).toBe("Tenbase keeps portable.");
  });

  it("searches both paths and content", () => {
    const files: WorkspaceFile[] = [
      {
        id: "a",
        name: "Alpha.md",
        path: "Notes/Alpha.md",
        content: "Plain note",
        savedContent: "Plain note",
        updatedAt: 1,
      },
      {
        id: "b",
        name: "Beta.md",
        path: "Notes/Beta.md",
        content: "A table about publishing",
        savedContent: "A table about publishing",
        updatedAt: 1,
      },
    ];

    expect(searchWorkspace(files, "publishing")).toHaveLength(1);
    expect(searchWorkspace(files, "alpha")[0].titleMatch).toBe(true);
  });

  it("escapes HTML before building export documents", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("builds an ePub blob", async () => {
    const blob = await buildEpubBlob("Test", "<h1>Test</h1>");

    expect(blob.type).toBe("application/epub+zip");
    expect(blob.size).toBeGreaterThan(100);
  });

  it("adds required ePub metadata and serializes XHTML-friendly content", async () => {
    const { default: JSZip } = await import("jszip");
    const blob = await buildEpubBlob(
      "Test",
      '<h1>Test</h1><img src="cover.png"><input type="checkbox" checked="">',
    );
    const zip = await JSZip.loadAsync(blob);
    const opf = await zip.file("OEBPS/content.opf")?.async("text");
    const nav = await zip.file("OEBPS/nav.xhtml")?.async("text");
    const chapter = await zip.file("OEBPS/chapter.xhtml")?.async("text");

    expect(opf).toContain('property="dcterms:modified"');
    expect(nav).toContain('xmlns:epub="http://www.idpf.org/2007/ops"');
    expect(chapter).toContain('<img src="cover.png" />');
    expect(chapter).toContain("<span>[x]</span>");
  });
});
