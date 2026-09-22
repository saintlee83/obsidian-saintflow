# SaintFlow 0.3.0 validation

Validated on 2026-09-22 with Obsidian 1.13.7 on Windows.

## Vault comparison

The installation target was `C:\Users\saint\Documents\work\SaintFlow`.
Its manual, Home, 11 templates and four command scripts match the supplied
`Downloads\SaintFlow_vault\SaintFlow` starter after normalizing line endings.
The working vault also contains folder guide notes and an additional status sort
in Tasks.base. The test fixture uses the working vault's Tasks.base.

The plugin now follows the manual's flat folders, list relations, status values,
Zettel maturity, recall verdicts and Closing checklist. Schema v2 migration
changes properties after a preview and preserves existing bodies and locations.

## Automated checks

- `npm test`: 124 passed, zero failures.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.

Tests cover all 11 template schemas, Base view targets, migration idempotency,
content preservation, relationships, recall, closing and the suggestion modal's
close-before-selection event ordering.

## Installed plugin checks

Installed the production build in the actual vault's
`.obsidian/plugins/saintflow/` and ran `tests/obsidian-smoke.mjs` through the
Obsidian CLI. Both SaintFlow and the existing Templater plugin were enabled.
All seven scenarios passed using real commands and dialog inputs:

1. Capture and dispatch preserve body, link, created date and custom fields.
2. Resource creates a seed Zettel with a source list.
3. Flat projects, subprojects, tasks and subtasks record the expected relations.
4. Output creation and status transition work.
5. Recall reads question, advances box and writes its verdict in the recall note.
6. Weekly and Closing use their templates; reopening Closing creates no duplicate
   and does not change the project's status or archive flag.
7. The sidebar opens and project counts include tasks and active subprojects.

The live test exposed a suggestion modal bug: Obsidian closes the modal before
calling the selection handler. Deferring cancellation to the next microtask
fixes selection; automated regression tests cover selection and cancellation.

The installed bundle's SHA-256 matches `dist/main.js`. The developer error log
was empty, and the Home page and sidebar rendered successfully. All uniquely
named temporary test notes were removed. Existing note content was preserved;
Home's line endings were normalized by the editor. The temporary CLI setting
was disabled again, with SaintFlow and Templater left enabled.

The vault repository is not included in this PR. Mobile execution and every
individual command were not exercised in the live test; the list above records
the actual coverage.
