import type {
  DocumentStats,
  HeadingItem,
  SearchResult,
  WorkspaceFile,
} from "../types";

const markdownNoise =
  /(```[\s\S]*?```|`[^`]*`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|[#>*_\-~|:[\]()])/g;
const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hName?: string;
  };
}

function splitInlineFeatures(value: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  const pattern = /(==([^=\n]+)==|\+\+([^+\n]+)\+\+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }

    nodes.push({
      type: "text",
      value: match[2] ?? match[3],
      data: { hName: match[2] ? "mark" : "u" },
    });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }

  return nodes.length ? nodes : [{ type: "text", value }];
}

function transformInlineFeatures(node: MarkdownNode) {
  if (!node.children) return;

  node.children = node.children.flatMap((child) => {
    if (child.type === "text" && child.value) {
      return splitInlineFeatures(child.value);
    }

    transformInlineFeatures(child);
    return child;
  });
}

export function remarkInlineFeatures() {
  return (tree: MarkdownNode) => {
    transformInlineFeatures(tree);
  };
}

export function slugifyHeading(text: string, taken = new Set<string>()) {
  const base =
    text
      .toLowerCase()
      .trim()
      .normalize("NFKD")
      .replace(/<[^>]+>/g, "")
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section";

  let candidate = base;
  let index = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  taken.add(candidate);
  return candidate;
}

export function extractHeadings(markdown: string): HeadingItem[] {
  const taken = new Set<string>();
  const headings: HeadingItem[] = [];
  let inFence = false;

  markdown.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const match = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (!match) return;

    const text = match[2]
      .replace(/\s+#+$/, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_`]/g, "")
      .trim();

    headings.push({
      id: slugifyHeading(text, taken),
      depth: match[1].length,
      text,
      line: index + 1,
    });
  });

  return headings;
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/==([^=\n]+)==/g, "$1")
    .replace(/\+\+([^+\n]+)\+\+/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(markdownNoise, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDocumentStats(markdown: string): DocumentStats {
  const plainText = markdownToPlainText(markdown);
  const words = plainText ? plainText.split(/\s+/).length : 0;
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !paragraph.startsWith("#")).length;

  return {
    words,
    characters: plainText.length,
    paragraphs,
    readingMinutes: Math.max(1, Math.ceil(words / 225)),
  };
}

export function searchWorkspace(
  files: WorkspaceFile[],
  query: string,
): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return files
    .map((file) => {
      const titleMatch = file.path.toLowerCase().includes(normalizedQuery);
      const contentIndex = file.content.toLowerCase().indexOf(normalizedQuery);
      const contentMatch = contentIndex >= 0;
      if (!titleMatch && !contentMatch) return null;

      const excerptStart = Math.max(0, contentIndex - 44);
      const excerpt =
        contentIndex >= 0
          ? file.content
              .slice(excerptStart, contentIndex + normalizedQuery.length + 88)
              .replace(/\s+/g, " ")
              .trim()
          : file.path;

      return { file, titleMatch, contentMatch, excerpt };
    })
    .filter((result): result is SearchResult => result !== null)
    .slice(0, 20);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlToXhtmlFragment(html: string) {
  if (typeof DOMParser === "undefined") return html;

  const document = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    "text/html",
  );
  return Array.from(document.body.childNodes).map(serializeXhtmlNode).join("");
}

function serializeXhtmlNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE)
    return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  if (tagName === "input" && element.getAttribute("type") === "checkbox") {
    return `<span>${element.hasAttribute("checked") ? "[x]" : "[ ]"}</span>`;
  }

  const attributes = Array.from(element.attributes)
    .filter((attribute) => !attribute.name.startsWith("data-"))
    .map((attribute) =>
      attribute.value === ""
        ? ` ${attribute.name}="${attribute.name}"`
        : ` ${attribute.name}="${escapeHtml(attribute.value)}"`,
    )
    .join("");

  if (voidElements.has(tagName)) return `<${tagName}${attributes} />`;

  const children = Array.from(element.childNodes)
    .map(serializeXhtmlNode)
    .join("");
  return `<${tagName}${attributes}>${children}</${tagName}>`;
}

export function buildHtmlDocument(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { color: #1f2937; font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px auto; max-width: 760px; padding: 0 24px; }
    h1, h2, h3 { color: #111827; line-height: 1.2; }
    pre, code { background: #f3f4f6; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    code { padding: 2px 5px; }
    pre { overflow: auto; padding: 14px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
    img { max-width: 100%; border-radius: 8px; }
    blockquote { border-left: 4px solid #cbd5e1; color: #475569; margin-left: 0; padding-left: 16px; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export function markdownToRtf(markdown: string) {
  const escaped = markdownToPlainText(markdown)
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\n/g, "\\par ");

  return `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Aptos;}}\\fs24 ${escaped}}`;
}

export async function buildEpubBlob(title: string, bodyHtml: string) {
  const { default: JSZip } = await import("jszip");
  const safeTitle = escapeHtml(title || "Untitled");
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const xhtmlBody = htmlToXhtmlFragment(bodyHtml);
  const zip = new JSZip();

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`,
  );
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">tenbase-${Date.now()}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    <dc:creator>Tenbase</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml" />
  </manifest>
  <spine>
    <itemref idref="chapter" />
  </spine>
</package>`,
  );
  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head><title>${safeTitle}</title></head>
<body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">${safeTitle}</a></li></ol></nav></body>
</html>`,
  );
  zip.file(
    "OEBPS/chapter.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head><title>${safeTitle}</title></head>
<body>${xhtmlBody}</body>
</html>`,
  );

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}
