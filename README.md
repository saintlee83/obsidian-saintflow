# SaintFlow — Obsidian plugin

An implementation of chapter 5 of `9_System/SaintFlow 최종 설계안.md` (the SaintFlow design document)
in the SaintFlow vault. The design document is the single source of truth: to change behaviour,
change the document first.

- Plugin ID: `saintflow`
- No Node APIs are used, so it runs on mobile as well (`isDesktopOnly: false`).
- Division of labour (5.2): Bases owns the views, the plugin owns creation, mutation and check computation.
- The plugin never writes user prose (rule 6). All it produces is skeletons and link lines.

> The plugin UI (command names, modals, notices) is in Korean, because the vault it serves is Korean.
> Command names below are quoted exactly as they appear in Obsidian's command palette.
> A Korean version of this README is in [README.ko.md](README.ko.md).

## Build

This repository lives outside the vault. Only build output is written into the vault's
`.obsidian/plugins/saintflow/`, so `node_modules` never lands inside the vault and never
reaches Obsidian Sync.

```
npm install
npm run build      # type-check + bundle into the vault
npm run dev        # watch mode
npm test           # unit tests for the pure functions
npm run typecheck
```

The vault path defaults to `../SaintFlow`, next to this repository. Point it elsewhere with an
environment variable:

```
SAINTFLOW_VAULT="D:/vaults/SaintFlow" npm run build
```

After building, enable it in Obsidian under Settings → Community plugins → SaintFlow.

## Commands

| ID | Command palette | Available when | What it does |
| --- | --- | --- | --- |
| C1 | `C1 수집` (capture, ribbon icon) | Anywhere | One line of input → a file in `0_Sweep/`. Duplicates get a numeric suffix |
| C2 | `C2 분류` (arrange) | Active file is in `0_Sweep/` | Pick a type → type-specific input → merge template properties (body preserved) → apply the naming rule → move to its home folder |
| C3 | `C3 맥락 생성` (create in context) | Active file is a parent under 2.4 | Pick an allowed type → enter a title → relations recorded automatically → defaults → open the new note |
| C4 | `C4 새 프로젝트` / `C4 새 영역` (new project / new area) | Anywhere | Create the container and its hub. Refused if the completion criterion is empty |
| C5 | `C5 관계 지정` (set relation) | File has the relevant field | Fill `project`, `area`, `sources`, `uses` through a type-filtered picker |
| C6 | `C6 Zettel 연결 추가` (link zettel) | Active file is a Zettel | Append `- [[X]] — reason` to the links section. Refused if the reason is empty |
| C7 | `C7 상태 전환` (change status) | Task, Project, Zettel, Output | Check the transition conditions. Status is unchanged if they are not met |
| C8 | `C8 회상 세션 시작` / `C8 회상 채점` (recall session / grade recall) | Session: anywhere. Grading: a recall Zettel | Create the session note, update `box`, `last_reviewed`, `last_result` and the retrieval log |
| C9 | `C9 프로젝트 종료` (close project) | Active file is a `P-` hub | Verdict → confirm `uses` → harvest `W-` notes → handle remaining Tasks → `done` → `R-종료-<name>` → archive the container |
| C10 | `C10 주간 검토` (weekly review) | Anywhere | Create `R-YYYY-Www` → write the 2.3 check values into the "점검 스냅샷" section (+ the C20 report) |
| C11 | `saintflow-new` code block | The note holding the block is the parent | Render buttons for the allowed types → run C3 |
| C12 | `C12 Inbox 처리 모드` (inbox mode) | `0_Sweep` is not empty | Open files one by one in creation order and present the decision sequence → two-minute rule / arrange / skip / delete → a processing summary |
| C13 | `C13 Source에서 Zettel 추출` (extract zettel) | Cursor on the "추출할 생각" checklist of a Source | Item text becomes the title candidate → create a seed Zettel → tick the item and replace it with a link |
| C14 | `C14 선택 영역 승격` (promote selection) | Text selected in a `W-` note | **Move** the selected text into a Zettel (a thought) or a Source (key content), leaving only a link behind |
| C15 | `C15 규칙 검사` (lint) | Anywhere (also on startup / on rename, per settings) | Scan the vault → a list per rule → open or quick-fix each item |
| C16 | `C16 SaintFlow 패널 열기` (open panel, ribbon icon) | Sidebar | Always-visible check counts; click for the list or the Bases view |
| C17 | `C17 Home 열기` (open Home) | Automatic on startup (setting) | Make Home the active tab once the workspace has loaded |
| C18 | `C18 허브 열기` (open hub) | A file inside a container, or the folder menu | Jump to the container's hub. Offer to create it if missing. Hubs are marked in the file explorer |
| C19 | `C19 스키마 마이그레이션` (migrate schema) | Run manually (announced when the version rises) | Compare the schema against frontmatter → preview → apply. Body untouched, idempotent |
| C20 | `C20 점검 리포트 내보내기` (export report) | Run manually, automatic during C10 | Write `9_System/reports/YYYY-MM-DD.json` |

The `점검 스냅샷 보기` (show check snapshot) command creates no note; it shows the counts in a notice.

The file explorer context menu carries entries too: "분류" (arrange) on files in `0_Sweep`,
"여기서 만들기" (create here) on notes that can be parents, and "허브 열기" (open hub) on container folders.

### C11 block syntax

````markdown
```saintflow-new
types: task, working, output, zettel, source
```
````

`types` only accepts children that 2.4 of the design document allows for the parent type; anything
else is rendered as an error message. The parent type is read from the `type` property of the note
holding the block.

| Parent | Allowed children |
| --- | --- |
| project | task, zettel, source, working, output, review-close |
| area | task, project, zettel, source, working |
| source | zettel |
| zettel | zettel |
| map | zettel |

### C15 checks

| Rule | Example violation | Quick fix |
| --- | --- | --- |
| Type vs. home folder | `type: task` living outside 4_Transform | Move to its home folder |
| Required properties | A Project with no `outcome` | Add the property, then open the file |
| File name | Missing prefix, forbidden characters | Propose a conforming name |
| Hub name | Hub file name differs from the container folder name; hub missing | Rename the hub (a missing hub is reported only) |
| Container contents | A Task, Zettel or Source inside a container | Move to its home folder |
| Folder depth | A subfolder inside a container (other than `_files`) | Reported only |
| Relation integrity | An active Task pointing at an archived project, an unresolved link | Open the file |
| Value range | A `status` outside the allowed values, a `box` outside 1–5 | Pick a value |

The template folder is excluded from the checks: those files are skeletons with empty values by design.

### C20 report schema

```json
{
  "schema": "saintflow-report/1",
  "generated": "2026-09-21",
  "checks": [{ "key": "inbox", "title": "수집함", "count": 1, "items": [{ "path": "...", "name": "...", "note": "..." }] }],
  "violations": [{ "rule": "home", "ruleLabel": "유형과 거처", "path": "...", "name": "...", "message": "...", "fix": "move" }],
  "totals": {
    "checks": { "inbox": 1 },
    "violations": { "home": 1 },
    "checkTotal": 7,
    "violationTotal": 9
  }
}
```

## Layout

```
saintflow/
├── main.ts                    command registration, index and event lifecycle
├── src/
│   ├── checks.ts              2.3 derived values, 1.7 recall verdict       (pure)
│   ├── dates.ts               ISO dates and week numbers                   (pure)
│   ├── naming.ts              3.5 file naming rules                        (pure)
│   ├── links.ts               [[file name]] notation                       (pure)
│   ├── sections.ts            2.5 reading and writing body sections        (pure)
│   ├── model.ts               2.2 types, 2.4 parent/child matrix           (pure)
│   ├── schema.ts              2.2 schema and check rules                   (pure)
│   ├── config.ts              settings values and defaults                 (pure)
│   ├── placement.ts           3.1 home folders, 3.5 file name generation   (pure)
│   ├── lint.ts                C15 judgement rules                          (pure)
│   ├── blocks/block-syntax.ts C11 block syntax                             (pure)
│   ├── core.ts                the plugin surface the commands depend on
│   ├── blocks/new-block.ts    C11 code block renderer
│   ├── graph.ts               relation index and check computation
│   ├── lint-vault.ts          C15 fact gathering and quick-fix application
│   ├── relations.ts           note creation and relation recording
│   ├── vault-io.ts            Obsidian API wrapper
│   ├── templates.ts           template reading and built-in skeletons
│   ├── settings.ts            5.5 settings tab
│   ├── ui/modals.ts           input UI
│   ├── views/panel.ts         C16 sidebar panel
│   └── commands/              C1–C20
└── tests/
    ├── *.test.ts              unit tests for the pure functions
    └── fixture-vault/         6.2 fixture, seeded C15 violations, acceptance test procedure
```

Modules marked `(pure)` do not import `obsidian`. As 5.4 of the design document requires, the
judgement rules are separated into pure functions so they can be unit tested.

## Implementation notes

- **Relations are written on the child only** (rule 8). The one exception is Map, where the parent
  owns the links in its structure section (2.4).
- **Frontmatter links are resolved directly via `getFirstLinkpathDest`.** Nothing relies on
  frontmatter links showing up in `resolvedLinks` (5.4).
- **The orphan verdict counts only links inside the links section.** Heading and link line positions
  are read from `metadataCache`, so the body is not re-read to make the distinction.
- **Files are moved with `fileManager.renameFile`,** which lets Obsidian update the links.
- **C9 keeps its order.** Harvesting (promoting `W-` notes) comes first, archiving the container last
  (rule 4).
- **C10, C16 and C20 share one `computeSnapshot`,** so the three surfaces cannot disagree.
- **C14 moves, it does not copy.** The selected text is removed from the original and only a link remains.
- **C19 uses `processFrontMatter` exclusively.** It never touches the body, and values outside the
  allowed set are reported rather than rewritten.
- **It works without templates.** If `9_System/Templates` has no file, the built-in skeleton is used.

## Settings

| Setting | Default |
| --- | --- |
| Folder paths | Per 3.1 of the design document (plus reports at `9_System/reports`) |
| Recall intervals | 1, 3, 7, 14, 30 |
| `old_seed` threshold | 14 days |
| File name prefixes | P-, A-, W-, O-, S-, M-, N-, R- |
| Template folder | 9_System/Templates |
| Open Home on startup | On |
| Mark hubs in the file explorer | On |
| Lint on startup | Off |
| Lint on move / rename | Off |
| Save a report during the weekly review | On |

## Not done yet

- V1–V8 of 6.1 are Bases behaviours that have to be verified inside Obsidian by hand. The plugin-side
  computation is C10's job and is independent of 6.1.
- The acceptance tests in 6.3 and in the fixture README require an open Obsidian, so they have not been run.
- Of the open questions in chapter 9, the `context` property on Task was not added.
- `KEY_RENAMES` (the C19 key rename table) is empty: no key has been renamed yet.
