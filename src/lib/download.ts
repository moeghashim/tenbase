export function safeFileName(name: string, extension: string) {
  const base =
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_ ]/gi, "")
      .trim()
      .replace(/\s+/g, "-") || "document";

  return `${base}.${extension}`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function downloadText(
  text: string,
  fileName: string,
  type = "text/plain",
) {
  downloadBlob(new Blob([text], { type }), fileName);
}
