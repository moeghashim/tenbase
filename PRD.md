# Tenbase Markdown Desk PRD

## Problem

Markdown is durable, portable, and easy to version, but many non-technical users experience it as syntax-first and developer-shaped. Tenbase turns `.md` files into a document-app experience while preserving plain Markdown as the source of truth.

## Personas

- Journalist: writes long-form articles and needs stats, preview, and PDF/HTML handoff.
- Student: keeps notes with math, tables, checkboxes, and images.
- Operator: edits documentation folders and needs search, tabs, copy formats, and quick export.

## MVP

- Single Markdown file editing.
- Folder workspace sidebar for local Markdown files where the browser supports File System Access.
- Sample/local fallback workspace for unsupported browsers.
- Multi-tab editing.
- Live Markdown preview with GFM, tables, checkboxes, code, images, and KaTeX math.
- Toolbar controls for common formatting.
- Inline image embedding from picker, paste, or drop.
- Table of contents generated from headings.
- Document statistics: words, paragraphs, characters, reading time.
- Quick search across file names and content.
- Copy as TXT, Markdown, HTML, or RTF.
- Export as PDF, PNG, ePub, or HTML.
- PWA manifest and service worker for install/offline caching.

## Non-Goals

- Accounts or cloud sync.
- Real-time collaboration.
- AI writing features.
- Git integration.
- Native app store distribution.

## Acceptance Criteria

- A user can open the app and immediately edit a sample Markdown file.
- A Chromium desktop user can open a Markdown file or folder and autosave changes.
- Preview updates as source changes.
- Toolbar actions insert valid Markdown.
- TOC links scroll to document sections.
- Search returns matching files by path or content.
- Copy/export controls produce usable artifacts without a server.
- `make check` passes locally.
- `make build` produces a production PWA bundle.

## Workflow Requirements

The repository follows Paul Solt-style agent ergonomics:

- Agent-friendly root docs: `AGENTS.md`, `CLAUDE.md`, and this PRD.
- Makefile targets for install, dev, build, preview, test, e2e, lint, typecheck, check, ship, and clean.
- Final `PASS`/`FAIL` lines on Makefile targets.
- Planning before implementation and a second Claude review before publishing.
