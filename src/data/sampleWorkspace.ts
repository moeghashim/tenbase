import type { WorkspaceFile } from "../types";

const now = Date.now();

export const sampleFiles: WorkspaceFile[] = [
  {
    id: "architecture",
    name: "architecture.md",
    path: "Side Projects iOS/FocusDrop/architecture.md",
    updatedAt: now,
    savedContent: "",
    content: `# State Management

Unidirectional data flow enforced throughout. All session state changes route through a single \`SessionStore\` ++observable++.

\`\`\`mermaid
flowchart LR
  idle([idle]) -->|Session Start| active([active])
  active -->|Session Ends| complete([complete])
  active -->|User Pauses| paused([paused])
  paused -->|User Resumes| active
  complete -. Session Reset .-> idle
  active -. Session Reset .-> idle

  classDef idle fill:#f8fafc,stroke:#9aa2ad,color:#404040
  classDef active fill:#eef4ff,stroke:#7ea6ff,color:#2d74ff
  classDef paused fill:#fff4eb,stroke:#d98a55,color:#c56a26
  classDef complete fill:#eefaf1,stroke:#69b987,color:#328a52

  class idle idle
  class active active
  class paused paused
  class complete complete
\`\`\`

## Key types

- \`SessionState\` — enum covering idle, active, paused, complete
- \`SessionStore\` — \`@Observable\` class, owns all timer logic
- \`FocusIntent\` — duration + label, immutable after session start

==Never mutate session state directly from a view.== All actions go through \`store.dispatch()\`.

> Note
>
> \`@Observable\` requires a manual \`Codable\` conformance workaround. Keep persistence behind \`api-notes.md\`.
`,
  },
  {
    id: "welcome",
    name: "Welcome.md",
    path: "Starter/Welcome.md",
    updatedAt: now,
    savedContent: "",
    content: `# Welcome to Tenbase

Tenbase is a local-first Markdown writing desk for people who want portable files without learning a technical editor.

## What makes Markdown easier here

- Use toolbar buttons for formatting instead of remembering syntax.
- Keep a folder of notes, chapters, docs, or posts in the sidebar.
- Preview tables, math, code, images, and checklists while you write.
- Copy or export into formats people already expect.

## A checklist that stays plain-text

- [x] Open a Markdown file
- [x] Edit and preview side by side
- [ ] Share it as HTML, RTF, PDF, PNG, or ePub

## Inline image

![A quiet writing desk](data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 420'%3E%3Crect width='900' height='420' fill='%23f2efe7'/%3E%3Crect x='90' y='260' width='720' height='28' rx='14' fill='%238b735f'/%3E%3Crect x='155' y='112' width='285' height='175' rx='18' fill='%23ffffff'/%3E%3Cpath d='M190 155h190M190 190h150M190 225h175' stroke='%2370747c' stroke-width='12' stroke-linecap='round'/%3E%3Ccircle cx='625' cy='185' r='82' fill='%2396b7a8'/%3E%3Cpath d='M625 112c-25 54-19 98 0 146 20-48 25-92 0-146Z' fill='%232f6f5e'/%3E%3Crect x='557' y='253' width='136' height='34' rx='17' fill='%23c96f4a'/%3E%3C/svg%3E)

## Table

| Need | Tenbase answer |
| --- | --- |
| Simple formatting | Toolbar buttons |
| Durable files | Markdown stays Markdown |
| Publishing | Copy and export tools |

## Math

Inline math works: $E = mc^2$.

Block math works too:

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$

## Code

\`\`\`ts
type Note = {
  title: string
  markdown: string
}
\`\`\`
`,
  },
  {
    id: "launch-plan",
    name: "Launch Plan.md",
    path: "Projects/Launch Plan.md",
    updatedAt: now - 1000 * 60 * 8,
    savedContent: "",
    content: `# Launch Plan

## Audience

Writers, students, founders, and operators who keep knowledge in files but do not want a developer tool.

## Positioning

Plain Markdown files with a document-app experience.

## First release

1. Local folder workspace
2. Fast editor
3. Live preview
4. Search and tabs
5. Copy and export

## Copy test

> Your writing stays yours. Tenbase just makes it easier to edit, inspect, and share.
`,
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes.md",
    path: "Notes/Meeting Notes.md",
    updatedAt: now - 1000 * 60 * 41,
    savedContent: "",
    content: `# Meeting Notes

## Decisions

- Keep the app account-free.
- Prefer files over cloud lock-in.
- Make every action visible and reversible.

## Follow-ups

- [ ] Test folder opening on Chrome desktop.
- [ ] Add Safari import/export fallback.
- [ ] Ask Claude to review the final diff.
`,
  },
].map((file) => ({ ...file, savedContent: file.content }));
