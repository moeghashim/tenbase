# Agent Instructions

## Before Coding

Before implementation, inspect the affected code for small, behavior-preserving prefactors that would make the requested change simpler, safer, or more local.

Prefer tightly scoped prep such as extracting helpers, clarifying names, isolating conditionals, tightening types, or adding focused test seams. Only prefactor when it clearly reduces complexity or risk for the requested change.

Make the change easy, then make the easy change.

## Verification

Use the Makefile as the command surface:

- `make check` before considering normal code changes complete.
- `make build` before release-oriented changes.
- `make e2e` when UI flows, routing, or export controls change.

Every target prints a final `PASS ...` or `FAIL ...` line for clean agent-readable output.
