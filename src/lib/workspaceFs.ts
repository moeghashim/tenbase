import type {
  FileSystemDirectoryHandle,
  FileSystemFileHandle,
  WorkspaceFile,
} from "../types";

const markdownExtensions = [".md", ".markdown", ".mdown", ".mkd"];

export function supportsFileSystemAccess() {
  return Boolean(window.showOpenFilePicker && window.showDirectoryPicker);
}

export function isMarkdownFile(name: string) {
  return markdownExtensions.some((extension) =>
    name.toLowerCase().endsWith(extension),
  );
}

export async function readSingleMarkdownFile() {
  if (!window.showOpenFilePicker) return null;

  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: "Markdown files",
        accept: {
          "text/markdown": markdownExtensions,
          "text/plain": [".txt"],
        },
      },
    ],
  });

  if (!handle) return null;
  return fileFromHandle(handle, handle.name);
}

export async function readMarkdownFolder() {
  if (!window.showDirectoryPicker) return null;

  const directoryHandle = await window.showDirectoryPicker({
    mode: "readwrite",
  });
  const files = await readDirectory(directoryHandle);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function readDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  prefix = "",
) {
  const files: WorkspaceFile[] = [];

  for await (const entry of directoryHandle.values()) {
    const nextPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.kind === "directory") {
      const children = await readDirectory(entry, nextPath);
      files.push(...children);
    }

    if (entry.kind === "file" && isMarkdownFile(entry.name)) {
      files.push(await fileFromHandle(entry, nextPath));
    }
  }

  return files;
}

async function fileFromHandle(
  handle: FileSystemFileHandle,
  path: string,
): Promise<WorkspaceFile> {
  const file = await handle.getFile();
  const content = await file.text();

  return {
    id: path,
    name: handle.name,
    path,
    content,
    savedContent: content,
    updatedAt: file.lastModified || Date.now(),
    handle,
  };
}

export async function writeMarkdownFile(file: WorkspaceFile) {
  if (!file.handle) return false;

  const writable = await file.handle.createWritable();
  await writable.write(file.content);
  await writable.close();
  return true;
}

export async function saveMarkdownFileAs(file: WorkspaceFile) {
  if (!window.showSaveFilePicker) return false;

  const handle = await window.showSaveFilePicker({
    suggestedName: file.name,
    types: [
      {
        description: "Markdown file",
        accept: {
          "text/markdown": [".md"],
        },
      },
    ],
  });

  const writable = await handle.createWritable();
  await writable.write(file.content);
  await writable.close();
  return true;
}
