import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import {
  Bold,
  BookOpen,
  CheckSquare,
  Clipboard,
  Code2,
  Columns3,
  Copy,
  Download,
  Eye,
  FileDown,
  FileImage,
  FileText,
  FolderOpen,
  Hash,
  Heading1,
  Heading2,
  Image,
  Italic,
  List,
  PanelLeft,
  Pilcrow,
  Plus,
  Printer,
  Save,
  Search,
  Sigma,
  Table2,
  Type,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "./App.css";
import { sampleFiles } from "./data/sampleWorkspace";
import { downloadBlob, downloadText, safeFileName } from "./lib/download";
import {
  buildEpubBlob,
  buildHtmlDocument,
  escapeHtml,
  extractHeadings,
  getDocumentStats,
  markdownToPlainText,
  markdownToRtf,
  searchWorkspace,
  slugifyHeading,
} from "./lib/markdown";
import {
  readMarkdownFolder,
  readSingleMarkdownFile,
  saveMarkdownFileAs,
  supportsFileSystemAccess,
  writeMarkdownFile,
} from "./lib/workspaceFs";
import type { WorkspaceFile, WorkspaceSource } from "./types";

type ViewMode = "split" | "edit" | "preview";
type ToastTone = "info" | "success" | "error";

interface Toast {
  message: string;
  tone: ToastTone;
}

const storageKey = "tenbase.sampleWorkspace.v1";

const toolbarGroups = [
  [
    {
      label: "Bold",
      icon: Bold,
      prefix: "**",
      suffix: "**",
      placeholder: "strong text",
    },
    {
      label: "Italic",
      icon: Italic,
      prefix: "_",
      suffix: "_",
      placeholder: "emphasis",
    },
    {
      label: "Inline code",
      icon: Code2,
      prefix: "`",
      suffix: "`",
      placeholder: "code",
    },
  ],
  [
    { label: "Heading 1", icon: Heading1, block: "# Heading" },
    { label: "Heading 2", icon: Heading2, block: "## Heading" },
    { label: "Quote", icon: Pilcrow, block: "> Quote" },
  ],
  [
    { label: "Bulleted list", icon: List, block: "- List item" },
    { label: "Checklist", icon: CheckSquare, block: "- [ ] Task" },
    {
      label: "Table",
      icon: Table2,
      block: "| Column | Notes |\n| --- | --- |\n| Item | Details |",
    },
  ],
  [
    { label: "Math", icon: Sigma, block: "$$\nE = mc^2\n$$" },
    {
      label: "Code block",
      icon: Hash,
      block: '```ts\nconst note = "Tenbase"\n```',
    },
  ],
];

function loadInitialFiles() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return sampleFiles;

    const parsed = JSON.parse(raw) as WorkspaceFile[];
    if (!Array.isArray(parsed) || parsed.length === 0) return sampleFiles;
    return parsed.map((file) => ({ ...file, handle: undefined }));
  } catch {
    return sampleFiles;
  }
}

function loadInitialState() {
  const initialFiles = loadInitialFiles();
  const firstFileId = initialFiles[0]?.id ?? "";

  return {
    files: initialFiles,
    activeFileId: firstFileId,
    tabs: firstFileId ? [firstFileId] : [],
  };
}

function getActiveFile(files: WorkspaceFile[], activeFileId: string) {
  return files.find((file) => file.id === activeFileId) ?? files[0];
}

function nodeText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number")
    return String(children);
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return nodeText(
      (children as { props?: { children?: ReactNode } }).props?.children,
    );
  }
  return "";
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function App() {
  const [initialState] = useState(loadInitialState);
  const [files, setFiles] = useState<WorkspaceFile[]>(initialState.files);
  const [activeFileId, setActiveFileId] = useState(initialState.activeFileId);
  const [tabs, setTabs] = useState<string[]>(initialState.tabs);
  const [source, setSource] = useState<WorkspaceSource>("sample");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [toast, setToast] = useState<Toast | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const previewRef = useRef<HTMLElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  const activeFile = getActiveFile(files, activeFileId);
  const activeContent = activeFile?.content ?? "";
  const headings = useMemo(
    () => extractHeadings(activeContent),
    [activeContent],
  );
  const stats = useMemo(() => getDocumentStats(activeContent), [activeContent]);
  const searchResults = useMemo(
    () => searchWorkspace(files, query),
    [files, query],
  );
  const visibleFileRows = query
    ? searchResults
    : files.map((file) => ({
        file,
        titleMatch: false,
        contentMatch: false,
        excerpt: "",
      }));
  const openTabs = tabs
    .map((tabId) => files.find((file) => file.id === tabId))
    .filter((file): file is WorkspaceFile => Boolean(file));
  const dirtyCount = files.filter(
    (file) => file.content !== file.savedContent,
  ).length;
  const hasFileSystem = supportsFileSystemAccess();

  const editorExtensions = useMemo(
    () => [markdown(), EditorView.lineWrapping],
    [],
  );

  useEffect(() => {
    if (source !== "sample") return;

    const serializableFiles = files.map((file) => ({
      id: file.id,
      name: file.name,
      path: file.path,
      content: file.content,
      savedContent: file.savedContent,
      updatedAt: file.updatedAt,
    }));
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(serializableFiles),
      );
    } catch {
      window.setTimeout(() => {
        setToast({
          tone: "error",
          message:
            "Browser storage is full. Export or save large files to disk.",
        });
      }, 0);
    }
  }, [files, source]);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const dirtyFiles = files.filter(
      (file) =>
        file.content !== file.savedContent &&
        (file.handle || source === "sample"),
    );
    if (!dirtyFiles.length) return;

    const timeout = window.setTimeout(async () => {
      setIsSaving(true);
      const savedSnapshots = new Map<string, string>();

      try {
        for (const file of dirtyFiles) {
          if (file.handle) {
            await writeMarkdownFile(file);
            savedSnapshots.set(file.id, file.content);
          } else if (source === "sample") {
            savedSnapshots.set(file.id, file.content);
          }
        }

        setFiles((currentFiles) =>
          currentFiles.map((file) => {
            if (!savedSnapshots.has(file.id)) return file;
            const savedContent = savedSnapshots.get(file.id);
            if (savedContent === undefined) return file;
            return file.content === savedContent
              ? { ...file, savedContent, updatedAt: Date.now() }
              : file;
          }),
        );
      } catch (error) {
        setToast({
          tone: "error",
          message: error instanceof Error ? error.message : "Autosave failed",
        });
      } finally {
        setIsSaving(false);
      }
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [files, source]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyCount === 0) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyCount]);

  function showToast(message: string, tone: ToastTone = "info") {
    setToast({ message, tone });
  }

  function openFile(fileId: string) {
    setActiveFileId(fileId);
    setTabs((currentTabs) =>
      currentTabs.includes(fileId) ? currentTabs : [...currentTabs, fileId],
    );
  }

  function closeTab(fileId: string) {
    setTabs((currentTabs) => {
      const nextTabs = currentTabs.filter((tabId) => tabId !== fileId);
      if (fileId === activeFileId) {
        setActiveFileId(nextTabs.at(-1) ?? files[0]?.id ?? "");
      }
      return nextTabs.length ? nextTabs : [files[0]?.id ?? ""].filter(Boolean);
    });
  }

  function updateActiveContent(content: string) {
    if (!activeFile) return;

    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === activeFile.id
          ? { ...file, content, updatedAt: Date.now() }
          : file,
      ),
    );
  }

  function insertMarkdown(prefix: string, suffix = "", placeholder = "text") {
    const view = editorViewRef.current;
    if (!view) {
      updateActiveContent(`${activeContent}${prefix}${placeholder}${suffix}`);
      return;
    }

    const selection = view.state.selection.main;
    const selected =
      view.state.doc.sliceString(selection.from, selection.to) || placeholder;
    const insert = `${prefix}${selected}${suffix}`;

    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert },
      selection: {
        anchor: selection.from + prefix.length,
        head: selection.from + prefix.length + selected.length,
      },
    });
    view.focus();
  }

  function insertBlock(block: string) {
    const view = editorViewRef.current;
    const insert = activeContent.trim() ? `\n\n${block}\n` : `${block}\n`;

    if (!view) {
      updateActiveContent(`${activeContent}${insert}`);
      return;
    }

    const position = view.state.selection.main.to;
    view.dispatch({
      changes: { from: position, to: position, insert },
      selection: { anchor: position + insert.length },
    });
    view.focus();
  }

  async function attachImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 1_500_000) {
      showToast(
        "Images over 1.5 MB should stay as linked files for now.",
        "error",
      );
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const alt =
      file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") || "image";
    insertBlock(`![${alt}](${dataUrl})`);
    showToast("Image embedded in Markdown", "success");
  }

  async function handleOpenFolder() {
    try {
      const folderFiles = await readMarkdownFolder();
      if (!folderFiles?.length) {
        showToast("No Markdown files found in that folder", "error");
        return;
      }

      setFiles(folderFiles);
      setSource("folder");
      setActiveFileId(folderFiles[0].id);
      setTabs([folderFiles[0].id]);
      setQuery("");
      showToast(`Opened ${folderFiles.length} Markdown files`, "success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast(
        error instanceof Error ? error.message : "Could not open folder",
        "error",
      );
    }
  }

  async function handleOpenSingleFile() {
    try {
      const file = await readSingleMarkdownFile();
      if (!file) return;

      setFiles([file]);
      setSource("single-file");
      setActiveFileId(file.id);
      setTabs([file.id]);
      showToast(`Opened ${file.name}`, "success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast(
        error instanceof Error ? error.message : "Could not open file",
        "error",
      );
    }
  }

  function handleNewNote() {
    const id = `draft-${
      crypto.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }`;
    const content = "# Untitled\n\nStart writing here.\n";
    const note: WorkspaceFile = {
      id,
      name: "Untitled.md",
      path: `Drafts/Untitled-${files.length + 1}.md`,
      content,
      savedContent: source === "sample" ? content : "",
      updatedAt: Date.now(),
    };

    setFiles((currentFiles) => [note, ...currentFiles]);
    openFile(id);
  }

  async function handleSave() {
    if (!activeFile) return;

    setIsSaving(true);
    try {
      let saved = await writeMarkdownFile(activeFile);
      if (!saved) {
        saved = await saveMarkdownFileAs(activeFile);
      }

      if (!saved) {
        downloadText(
          activeFile.content,
          safeFileName(activeFile.name, "md"),
          "text/markdown",
        );
      }

      setFiles((currentFiles) =>
        currentFiles.map((file) =>
          file.id === activeFile.id
            ? { ...file, savedContent: file.content, updatedAt: Date.now() }
            : file,
        ),
      );
      showToast(
        saved ? "Saved Markdown file" : "Downloaded Markdown copy",
        "success",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast(
        error instanceof Error ? error.message : "Save failed",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage, "success");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showToast(successMessage, "success");
    }
  }

  async function copyHtml() {
    const html = previewRef.current?.innerHTML ?? escapeHtml(activeContent);
    const text = markdownToPlainText(activeContent);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      showToast("Copied formatted HTML", "success");
    } catch {
      await copyText(html, "Copied HTML source");
    }
  }

  async function copyRtf() {
    const rtf = markdownToRtf(activeContent);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/rtf": new Blob([rtf], { type: "text/rtf" }),
          "text/plain": new Blob([markdownToPlainText(activeContent)], {
            type: "text/plain",
          }),
        }),
      ]);
      showToast("Copied RTF", "success");
    } catch {
      downloadText(
        rtf,
        safeFileName(activeFile.name, "rtf"),
        "application/rtf",
      );
      showToast("RTF downloaded", "success");
    }
  }

  function exportHtml() {
    const html = buildHtmlDocument(
      activeFile.name,
      previewRef.current?.innerHTML ?? escapeHtml(activeContent),
    );
    downloadText(html, safeFileName(activeFile.name, "html"), "text/html");
  }

  async function exportPng() {
    if (!previewRef.current) return;

    try {
      const htmlToImage = await import("html-to-image");
      const blob = await htmlToImage.toBlob(previewRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      if (!blob) return;

      downloadBlob(blob, safeFileName(activeFile.name, "png"));
    } catch {
      showToast(
        "PNG export failed. Check remote images and try again.",
        "error",
      );
    }
  }

  async function exportEpub() {
    try {
      const blob = await buildEpubBlob(
        activeFile.name,
        previewRef.current?.innerHTML ?? escapeHtml(activeContent),
      );
      downloadBlob(blob, safeFileName(activeFile.name, "epub"));
    } catch {
      showToast("ePub export failed for this document.", "error");
    }
  }

  function handleEditorPaste(event: ClipboardEvent<HTMLDivElement>) {
    const image = Array.from(event.clipboardData.files).find((file) =>
      file.type.startsWith("image/"),
    );
    if (!image) return;

    event.preventDefault();
    void attachImage(image);
  }

  function handleEditorDrop(event: DragEvent<HTMLDivElement>) {
    const image = Array.from(event.dataTransfer.files).find((file) =>
      file.type.startsWith("image/"),
    );
    if (!image) return;

    event.preventDefault();
    void attachImage(image);
  }

  const headingRenderCounts = new Map<string, number>();
  const getRenderedHeadingId = (depth: number, children?: ReactNode) => {
    const text = nodeText(children);
    const key = `${depth}:${text}`;
    const occurrence = (headingRenderCounts.get(key) ?? 0) + 1;
    headingRenderCounts.set(key, occurrence);

    return (
      headings.filter(
        (heading) => heading.depth === depth && heading.text === text,
      )[occurrence - 1]?.id ?? slugifyHeading(text)
    );
  };

  const markdownComponents = {
    h1: ({ children }: { children?: ReactNode }) => (
      <h1 id={getRenderedHeadingId(1, children)}>{children}</h1>
    ),
    h2: ({ children }: { children?: ReactNode }) => (
      <h2 id={getRenderedHeadingId(2, children)}>{children}</h2>
    ),
    h3: ({ children }: { children?: ReactNode }) => (
      <h3 id={getRenderedHeadingId(3, children)}>{children}</h3>
    ),
    h4: ({ children }: { children?: ReactNode }) => (
      <h4 id={getRenderedHeadingId(4, children)}>{children}</h4>
    ),
    h5: ({ children }: { children?: ReactNode }) => (
      <h5 id={getRenderedHeadingId(5, children)}>{children}</h5>
    ),
    h6: ({ children }: { children?: ReactNode }) => (
      <h6 id={getRenderedHeadingId(6, children)}>{children}</h6>
    ),
  };

  const saveStatus = isSaving
    ? "Saving"
    : dirtyCount > 0
      ? `${dirtyCount} unsaved`
      : "Saved";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Tenbase">
          <BookOpen aria-hidden="true" />
          <div>
            <strong>Tenbase</strong>
            <span>Markdown desk</span>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="command-button"
            onClick={handleOpenFolder}
            disabled={!hasFileSystem}
          >
            <FolderOpen aria-hidden="true" />
            <span>Folder</span>
          </button>
          <button
            type="button"
            className="command-button"
            onClick={handleOpenSingleFile}
            disabled={!hasFileSystem}
          >
            <FileText aria-hidden="true" />
            <span>File</span>
          </button>
          <button
            type="button"
            className="command-button"
            onClick={handleNewNote}
          >
            <Plus aria-hidden="true" />
            <span>New</span>
          </button>
          <button
            type="button"
            className="command-button primary"
            onClick={handleSave}
            disabled={!activeFile}
          >
            <Save aria-hidden="true" />
            <span>Save</span>
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar" aria-label="Workspace files">
          <div className="pane-heading">
            <div>
              <span>Workspace</span>
              <strong>
                {source === "folder"
                  ? "Local folder"
                  : source === "single-file"
                    ? "Single file"
                    : "Sample files"}
              </strong>
            </div>
            <PanelLeft aria-hidden="true" />
          </div>

          <label className="search-field">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files or content"
            />
          </label>

          <div className="file-list" role="list">
            {visibleFileRows.map(({ file, excerpt }) => {
              const isActive = file.id === activeFile?.id;
              const isDirty = file.content !== file.savedContent;

              return (
                <button
                  type="button"
                  key={file.id}
                  className={`file-row ${isActive ? "active" : ""}`}
                  onClick={() => openFile(file.id)}
                >
                  <FileText aria-hidden="true" />
                  <span>
                    <strong>{file.name}</strong>
                    <small>{excerpt || file.path}</small>
                  </span>
                  {isDirty ? <i aria-label="Unsaved changes" /> : null}
                </button>
              );
            })}
          </div>

          {query && searchResults.length === 0 ? (
            <p className="empty-search" aria-live="polite">
              No matches
            </p>
          ) : null}
        </aside>

        <section
          className="document-area"
          aria-label="Markdown editor and preview"
        >
          <div className="tabs" role="tablist" aria-label="Open files">
            {openTabs.map((file) => (
              <button
                type="button"
                key={file.id}
                role="tab"
                aria-selected={file.id === activeFile?.id}
                className={file.id === activeFile?.id ? "active" : ""}
                onClick={() => openFile(file.id)}
              >
                <span>{file.name}</span>
                {file.content !== file.savedContent ? (
                  <i aria-label="Unsaved" />
                ) : null}
                <X
                  aria-hidden="true"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(file.id);
                  }}
                />
              </button>
            ))}
          </div>

          <div className="format-toolbar" aria-label="Formatting tools">
            {toolbarGroups.map((group, groupIndex) => (
              <div className="tool-group" key={groupIndex}>
                {group.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      type="button"
                      key={tool.label}
                      title={tool.label}
                      aria-label={tool.label}
                      onClick={() =>
                        "block" in tool
                          ? insertBlock(tool.block)
                          : insertMarkdown(
                              tool.prefix,
                              tool.suffix,
                              tool.placeholder,
                            )
                      }
                    >
                      <Icon aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="tool-group">
              <button
                type="button"
                title="Insert image"
                aria-label="Insert image"
                onClick={() => imageInputRef.current?.click()}
              >
                <Image aria-hidden="true" />
              </button>
            </div>

            <div className="view-switcher" aria-label="View mode">
              <button
                type="button"
                className={viewMode === "edit" ? "active" : ""}
                aria-label="Editor only"
                onClick={() => setViewMode("edit")}
              >
                <Type aria-hidden="true" />
              </button>
              <button
                type="button"
                className={viewMode === "split" ? "active" : ""}
                aria-label="Split editor and preview"
                onClick={() => setViewMode("split")}
              >
                <Columns3 aria-hidden="true" />
              </button>
              <button
                type="button"
                className={viewMode === "preview" ? "active" : ""}
                aria-label="Preview only"
                onClick={() => setViewMode("preview")}
              >
                <Eye aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className={`document-grid ${viewMode}`}>
            <section className="editor-panel" aria-label="Markdown source">
              <div className="panel-title">
                <span>Editor</span>
                <small>{activeFile?.path}</small>
              </div>
              <div
                className="editor-frame"
                onPaste={handleEditorPaste}
                onDrop={handleEditorDrop}
              >
                <CodeMirror
                  value={activeContent}
                  height="100%"
                  extensions={editorExtensions}
                  basicSetup={{
                    foldGutter: false,
                    highlightActiveLine: false,
                    lineNumbers: false,
                  }}
                  onCreateEditor={(view) => {
                    editorViewRef.current = view;
                  }}
                  onChange={updateActiveContent}
                />
              </div>
            </section>

            <section className="preview-panel" aria-label="Rendered document">
              <div className="panel-title">
                <span>Preview</span>
                <small>Live Markdown render</small>
              </div>
              <article className="markdown-preview" ref={previewRef}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                  components={markdownComponents}
                >
                  {activeContent}
                </ReactMarkdown>
              </article>
            </section>
          </div>
        </section>

        <aside className="inspector" aria-label="Document details and export">
          <section className="stats-panel">
            <div className="pane-heading">
              <div>
                <span>Document</span>
                <strong>Details</strong>
              </div>
              <Clipboard aria-hidden="true" />
            </div>

            <div className="stats-grid">
              <span>
                <strong>{stats.words}</strong>
                Words
              </span>
              <span>
                <strong>{stats.paragraphs}</strong>
                Paragraphs
              </span>
              <span>
                <strong>{stats.readingMinutes}m</strong>
                Read
              </span>
              <span>
                <strong>{stats.characters}</strong>
                Characters
              </span>
            </div>
          </section>

          <section className="toc-panel">
            <div className="pane-heading compact">
              <div>
                <span>Outline</span>
                <strong>{headings.length} sections</strong>
              </div>
            </div>
            <nav aria-label="Table of contents">
              {headings.length ? (
                headings.map((heading) => (
                  <button
                    type="button"
                    key={`${heading.id}-${heading.line}`}
                    style={{
                      paddingLeft: `${(heading.depth - 1) * 12 + 10}px`,
                    }}
                    onClick={() =>
                      document
                        .getElementById(heading.id)
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    {heading.text}
                  </button>
                ))
              ) : (
                <p>Add headings to build an outline.</p>
              )}
            </nav>
          </section>

          <section className="share-panel">
            <div className="pane-heading compact">
              <div>
                <span>Share</span>
                <strong>Copy</strong>
              </div>
            </div>
            <div className="action-grid">
              <button
                type="button"
                onClick={() =>
                  copyText(
                    markdownToPlainText(activeContent),
                    "Copied plain text",
                  )
                }
              >
                <Copy aria-hidden="true" />
                TXT
              </button>
              <button
                type="button"
                onClick={() => copyText(activeContent, "Copied Markdown")}
              >
                <FileText aria-hidden="true" />
                MD
              </button>
              <button type="button" onClick={copyHtml}>
                <Clipboard aria-hidden="true" />
                HTML
              </button>
              <button type="button" onClick={copyRtf}>
                <FileDown aria-hidden="true" />
                RTF
              </button>
            </div>
          </section>

          <section className="share-panel">
            <div className="pane-heading compact">
              <div>
                <span>Publish</span>
                <strong>Export</strong>
              </div>
            </div>
            <div className="action-grid">
              <button type="button" onClick={() => window.print()}>
                <Printer aria-hidden="true" />
                PDF
              </button>
              <button type="button" onClick={exportPng}>
                <FileImage aria-hidden="true" />
                PNG
              </button>
              <button type="button" onClick={exportEpub}>
                <BookOpen aria-hidden="true" />
                ePub
              </button>
              <button type="button" onClick={exportHtml}>
                <Download aria-hidden="true" />
                HTML
              </button>
            </div>
          </section>
        </aside>
      </main>

      <footer className="statusbar">
        <span>{saveStatus}</span>
        <span>{files.length} Markdown files</span>
        <span>
          {hasFileSystem ? "Folder access available" : "Browser fallback mode"}
        </span>
      </footer>

      <input
        ref={imageInputRef}
        className="hidden-input"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const image = event.target.files?.[0];
          if (image) void attachImage(image);
          event.target.value = "";
        }}
      />

      {toast ? (
        <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

export default App;
