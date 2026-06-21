# Claude Review Instructions

This repository is a public responsive Markdown workspace inspired by Lettera.

## Product Intent

Tenbase should make Markdown files comfortable for non-technical users:

- Keep files portable as plain `.md`.
- Make formatting discoverable through toolbar controls.
- Show a high-fidelity live preview.
- Support folder workspaces, single-file editing, tabs, search, outline, stats, copy, and export.
- Stay local-first and account-free.

## Build Workflow

Use the Makefile:

- `make check` for typecheck, lint, and unit tests.
- `make build` for production bundle validation.
- `make e2e` for browser smoke coverage.
- `make ship` before release.

Keep command output clean. If a command fails, report the failing target and the smallest actionable fix.

## Review Gate

When reviewing a diff, prioritize:

1. Data loss risks around local file reads/writes and autosave.
2. Markdown round-trip bugs where UI actions damage source text.
3. Browser support gaps, especially File System Access API fallback behavior.
4. Accessibility and mobile layout regressions.
5. Export correctness for HTML, RTF, PDF, PNG, and ePub.
