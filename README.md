# Tenbase Markdown Desk

Tenbase is a responsive Markdown workspace for people who want the portability of `.md` files with a document-app experience.

## Features

- Single-file and folder-based Markdown editing.
- Sample workspace fallback for browsers without local folder access.
- Tabs, quick search, live preview, outline, and document stats.
- GFM tables, checkboxes, code blocks, images, and KaTeX math.
- Toolbar buttons for common Markdown formatting.
- Image embedding from picker, paste, or drag-and-drop.
- Copy as TXT, Markdown, HTML, or RTF.
- Export as PDF, PNG, ePub, or standalone HTML.
- PWA manifest and service-worker caching.

## Local Development

```bash
npm install
npm run dev
```

Useful Make targets:

```bash
make check
make build
make desktop-package
make e2e
make ship
```

## Desktop App

Tenbase can be packaged as a macOS desktop app with Electron:

```bash
npm install
make desktop-package
```

The installable DMG is written to `release/Tenbase-0.1.0-arm64.dmg`. The app is currently unsigned, so macOS may show the standard warning when opening it outside the App Store.

## Browser Notes

Folder and direct file saving use the File System Access API, available in Chromium-based desktop browsers. Other browsers can still use the sample workspace, create draft notes, copy content, and export files.

## Project Docs

- [PRD.md](./PRD.md) describes the product scope.
- [AGENTS.md](./AGENTS.md) defines agent implementation rules.
- [CLAUDE.md](./CLAUDE.md) defines review criteria.

## License

MIT
