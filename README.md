# SaintFlow for Obsidian

[한국어](README.ko.md)

SaintFlow provides capture, organization, context creation, relations, recall, and workflow checks. Version 0.3.0 follows the **SaintFlow Manual** vault, verified against `C:\Users\saint\Documents\work\SaintFlow`. Bases provide views; the plugin creates and updates notes. The runtime uses Obsidian APIs and supports mobile.

## Build and install

```sh
npm ci
npm test
npm run build
```

The build writes `main.js`, `manifest.json`, and `styles.css` to `dist/`. To install directly into a vault with PowerShell:

```powershell
$env:SAINTFLOW_VAULT = 'C:\Users\saint\Documents\work\SaintFlow'
npm run build
```

Enable or reload **SaintFlow** under Community plugins. Existing Templater SF commands can remain enabled.

## Vault compatibility

- Tasks live in `4_Transform/Tasks`, Outputs in `4_Transform/Outputs`; Projects and Areas are ordinary notes directly under their type folders.
- Reference notes use `type: resource`. Zettels use `maturity`, `source`, and `question`. Projects use `done_criteria` and `due`.
- `project`, `area`, `source`, and `uses` are lists; `parent` is a single link. Subtasks record only `parent`, avoiding duplicate project counts. Subprojects inherit the parent's area.
- Regular notes have no default prefix. Recall and review notes retain `N-` and `R-`. Archiving uses `archived: true`; legacy Archive paths are also recognized.
- Templates are Resource, Recall, Weekly, and Closing, alongside the other standard types. Formatted date placeholders such as `{{date:YYYY-MM-DD}}` are supported. Matching templates are bundled as fallbacks.

## Commands

Existing C1–C20 command IDs remain stable.

| Commands | Behavior |
| --- | --- |
| C1 capture, C2 arrange, C12 inbox | Respect dispatch; preserve body, link, capture date and custom properties; add missing template sections. Exclude stage rooms. |
| C3 context creation | Create eligible children, including subprojects and subtasks; allow direct creation outside a parent context. |
| C4 containers, C5 relations, C7 status | Create flat Project/Area notes; use current statuses, list relations and Zettel maturity. |
| C8 recall | Read question, append newly due targets once, update review metadata and write verdicts in the recall note. |
| C9 closing | Open or create the Closing checklist. Completion and archiving remain explicit checklist actions. |
| C10 weekly, C16 panel, C20 report | Share checks for open tasks and active subprojects, seeds aged at least 14 days, and finished outputs missing uses. |
| C13 extraction, C14 promotion | Extract checklist thoughts from Resources; move selected Project/Area/legacy Working text into a Zettel or Resource. |
| C18 parent/room | Follow parent, project, area, or the enclosing stage room. |
| C19 migration | Preview and apply property migration without rewriting bodies or moving notes. |

A C11 button block in a Project can use:

````markdown
```saintflow-new
types: task, project, output, resource, zettel
```
````

## Upgrading older vaults

Schema v2 migrates source → resource, session → recall, review → weekly/closing, outcome → done_criteria, deadline → due, Zettel status → maturity, and sources → source. Scalar relations become lists. Existing nonempty destination values remain intact. C15 offers location fixes separately.

Former default paths and prefixes are updated while custom settings are retained. Review migration previews before applying changes to older notes.

## Tests

`npm test` runs pure-function tests and command integration tests with an Obsidian API double. `tests/manual-vault` contains starter templates, Bases, and rooms verified against the actual vault. `tests/fixture-vault` remains a legacy reference fixture.

For a smoke test inside the running Obsidian app, enable its CLI and run:

```powershell
$env:OBSIDIAN_CLI = "$env:LOCALAPPDATA\Programs\Obsidian\Obsidian.com"
node tests/obsidian-smoke.mjs SaintFlow
```

The smoke test drives actual command dialogs, creates uniquely named temporary notes, and deletes only those notes afterwards. Save important edits and close open dialogs before running it.

The UI supports Korean and English; stored properties and template sections follow the vault's vocabulary.
