export type WorkspaceSource = "sample" | "folder" | "single-file";

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  content: string;
  savedContent: string;
  updatedAt: number;
  handle?: FileSystemFileHandle;
}

export interface HeadingItem {
  id: string;
  depth: number;
  text: string;
  line: number;
}

export interface DocumentStats {
  words: number;
  characters: number;
  paragraphs: number;
  readingMinutes: number;
}

export interface SearchResult {
  file: WorkspaceFile;
  titleMatch: boolean;
  contentMatch: boolean;
  excerpt: string;
}

export interface FileSystemFileHandle {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle {
  kind: "directory";
  name: string;
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
}

export interface FileSystemWritableFileStream extends WritableStream {
  write: (data: string | Blob | BufferSource) => Promise<void>;
  close: () => Promise<void>;
}

declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle[]>;
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandle>;
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
  }
}
