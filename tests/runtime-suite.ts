import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";
import type { App } from "obsidian";
import { parse } from "yaml";
import { weeklyReviewCommand } from "../src/commands/c10-weekly-review";
import { sweepFiles } from "../src/commands/c12-inbox";
import { applyMigration, planMigration } from "../src/commands/c19-migrate";
import { applyArrange, arrangeCommand } from "../src/commands/c2-arrange";
import { createInContextCommand } from "../src/commands/c3-create-in-context";
import { gradeRecallCommand, recallSessionCommand } from "../src/commands/c8-recall";
import { projectCloseCommand } from "../src/commands/c9-project-close";
import { DEFAULT_SETTINGS } from "../src/config";
import { todayISO } from "../src/dates";
import { SaintFlowIndex, computeSnapshot } from "../src/graph";
import { lintVault } from "../src/lint-vault";
import { createTypedNote } from "../src/relations";
import { renderTemplate } from "../src/templates";
import { BASE_VIEW } from "../src/views/panel";
import { answers } from "./modals-mock";
import { metadata, mockApp } from "./obsidian-mock";

function setup() {
	const mock = mockApp();
	function load(dir: string, prefix = "") {
		for (const item of readdirSync(dir, { withFileTypes: true })) {
			const relative = prefix ? `${prefix}/${item.name}` : item.name;
			if (item.isDirectory()) load(join(dir, item.name), relative);
			else mock.add(relative, readFileSync(join(dir, item.name), "utf8"));
		}
	}
	load(join(process.cwd(), "tests/manual-vault"));
	const settings = structuredClone(DEFAULT_SETTINGS);
	const app = mock.app as unknown as App;
	const core = { app, settings, index: new SaintFlowIndex(app, () => settings), saveSettings: async () => { } };
	return { ...mock, core };
}

it("starter vault has no inbox, recall targets or lint violations", () => {
	const { core } = setup();
	assert.equal(sweepFiles(core).length, 0);
	assert.ok(computeSnapshot(core.app, core.settings, core.index).every(group => group.items.length === 0));
	assert.deepEqual(lintVault(core), []);
});
it("all panel links resolve to a supplied Base and view", () => {
	const { app } = setup();
	for (const base of Object.values(BASE_VIEW)) {
		const file = app.vault.getFiles().find(file => file.name === base.file)!;
		assert.ok(parse(file.content).views.some((view: { name: string }) => view.name === base.view), `${base.file}#${base.view}`);
	}
});
it("templates render formatted dates and preserve title replacement text", () => {
	assert.equal(renderTemplate("{{date:YYYY-MM-DD}} / {{date:YYYY}} / {{title}}", { date: "2026-09-22", title: "$&" }), "2026-09-22 / 2026 / $&");
});
it("creation uses flat folders and exact manual templates", async () => {
	const { core } = setup();
	const file = await createTypedNote(core, "resource", { title: "자료" });
	assert.equal(file?.path, "1_Arrange/Resources/자료.md");
	const fm = core.app.metadataCache.getFileCache(file!)!.frontmatter!;
	assert.equal(fm.type, "resource"); assert.equal(fm.status, "to read"); assert.equal(fm.created, todayISO());
	assert.ok(!fm.url); assert.deepEqual(lintVault(core), []);
});
it("arrange preserves exact original body, capture properties and date, adds missing sections", async () => {
	const { core, add } = setup();
	const body = "\n# My title\n\n  Original text.\n## 요약\nKeep this.\n";
	const file = add("0_Sweep/자료.md", '---\ndispatch: Resources\nlink: https://example.com\ncreated: 2026-01-02\nstatus: reading\ncustom: false\n---\n' + body);
	await applyArrange(core, file as never, "resource", { title: file.basename, folder: core.settings.folders.resources, overrides: {} });
	assert.equal(file.path, "1_Arrange/Resources/자료.md");
	const fm = metadata(file).frontmatter;
	assert.equal(fm.created, "2026-01-02"); assert.equal(fm.link, "https://example.com"); assert.equal(fm.status, "reading"); assert.equal(fm.custom, false); assert.ok(!("dispatch" in fm));
	assert.ok(file.content.includes(body)); assert.equal(file.content.match(/## 요약/g)?.length, 1); assert.ok(file.content.includes("## 발췌"));
});
it("room cannot be dispatched or deleted", async () => {
	const { core, app } = setup();
	const room = app.vault.getMarkdownFiles().find(file => file.path === "0_Sweep/0_Sweep.md")!;
	const original = room.content;
	await arrangeCommand(core, room as never); assert.equal(room.content, original);
});
it("context creates subproject with inherited area and subtask with parent only", async () => {
	const { core, add, activate } = setup();
	const project = add("1_Arrange/Projects/Parent.md", '---\ntype: project\narea: ["[[Area]]"]\n---\n'); activate(project);
	answers.push({ title: "Child", done_criteria: "Ship", due: "" });
	const child = await createInContextCommand(core, { childType: "project" });
	const fm = core.app.metadataCache.getFileCache(child!)!.frontmatter!;
	assert.equal(child?.path, "1_Arrange/Projects/Child.md"); assert.equal(fm.parent, "[[Parent]]"); assert.deepEqual(fm.area, ["[[Area]]"]); assert.ok(!fm.project);
	const task = add("4_Transform/Tasks/Parent task.md", '---\ntype: task\nproject: ["[[Parent]]"]\n---\n'); activate(task);
	answers.push("Child task"); const subtask = await createInContextCommand(core, { childType: "task" });
	const tfm = core.app.metadataCache.getFileCache(subtask!)!.frontmatter!;
	assert.equal(tfm.parent, "[[Parent task]]"); assert.ok(!tfm.project);
});
it("checks count open tasks, active subprojects, created dates, archive flags and finished outputs", () => {
	const { core, add } = setup();
	add("1_Arrange/Projects/Parent.md", "---\ntype: project\nstatus: active\n---\n");
	add("1_Arrange/Projects/Child.md", '---\ntype: project\nstatus: active\nparent: "[[Parent]]"\n---\n');
	add("4_Transform/Tasks/Work.md", '---\ntype: task\nstatus: in progress\nproject: ["[[Child]]"]\n---\n');
	add("2_Internalize/Zettels/Old.md", '---\ntype: zettel\nmaturity: seed\ncreated: 2026-09-08\nsource: ["[[Resource]]"]\n---\n');
	add("2_Internalize/Zettels/Archived.md", "---\ntype: zettel\nmaturity: seed\nrecall: true\narchived: true\n---\n");
	add("4_Transform/Outputs/Draft.md", "---\ntype: output\nstatus: draft\n---\n");
	add("4_Transform/Outputs/Done.md", "---\ntype: output\nstatus: done\n---\n");
	const groups = Object.fromEntries(computeSnapshot(core.app, core.settings, core.index, "2026-09-22").map(group => [group.key, group.items]));
	assert.equal(groups.stalled.length, 0); assert.equal(groups.old_seed.length, 1); assert.equal(groups.orphan.length, 0); assert.equal(groups.due_today.length, 0); assert.equal(groups.no_uses.length, 1);
});
it("recall appends newly due questions once, keeps answers, writes verdict to recall only", async () => {
	const { core, add, activate } = setup();
	const zettel = add("2_Internalize/Zettels/Claim.md", "---\ntype: zettel\nmaturity: seed\nrecall: true\nquestion: Why?\nbox: 2\n---\n## 생각\nMy answer source.\n");
	const session = await recallSessionCommand(core);
	const raw = session as unknown as { content: string };
	assert.ok(raw.content.includes("Why?")); raw.content += "\nMy answer stays.\n";
	add("2_Internalize/Zettels/New.md", "---\ntype: zettel\nrecall: true\nquestion: How?\n---\n");
	await recallSessionCommand(core); await recallSessionCommand(core);
	assert.equal(raw.content.match(/## \[\[New\]\]/g)?.length, 1); assert.ok(raw.content.includes("My answer stays."));
	activate(zettel); answers.push("pass", ""); await gradeRecallCommand(core);
	assert.equal(metadata(zettel).frontmatter.box, 3); assert.ok(raw.content.includes("- [[Claim]] pass")); assert.ok(!zettel.content.includes("## 인출 기록"));
});
it("closing is idempotent and does not move or archive project; weekly uses weekly type", async () => {
	const { core, add, activate } = setup();
	const project = add("1_Arrange/Projects/Launch.md", "---\ntype: project\nstatus: active\narchived: false\n---\nKeep work."); activate(project);
	await projectCloseCommand(core); await projectCloseCommand(core, project as never);
	const closing = core.app.vault.getMarkdownFiles().filter(file => file.path.startsWith(core.settings.folders.reviews + "/")).filter(file => core.app.metadataCache.getFileCache(file)?.frontmatter?.type === "closing");
	assert.equal(closing.length, 1); assert.equal(metadata(project).frontmatter.status, "active"); assert.equal(metadata(project).frontmatter.archived, false);
	core.settings.reportOnWeekly = false;
	const weekly = await weeklyReviewCommand(core);
	assert.equal(core.app.metadataCache.getFileCache(weekly!)!.frontmatter!.type, "weekly");
});
it("migration translates legacy keys without overwriting edited values or body and is idempotent", async () => {
	const { core, add } = setup();
	const old = add("2_Internalize/Zettels/Old.md", '---\ntype: zettel\nstatus: seed\nsources: ["[[Book]]"]\n---\nMy body stays.\n');
	const resource = add("1_Arrange/Resources/Book.md", "---\ntype: source\nurl: https://example.com\n---\nSource body.\n");
	const plan = planMigration(core);
	await applyMigration(core, plan);
	assert.equal(metadata(old).frontmatter.maturity, "seed"); assert.deepEqual(metadata(old).frontmatter.source, ["[[Book]]"]);
	assert.ok(old.content.endsWith("My body stays.\n")); assert.equal(metadata(resource).frontmatter.type, "resource");
	assert.equal(planMigration(core).changes.length, 0);
});
