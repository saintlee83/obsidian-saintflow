import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { parse } from "yaml";
import { isStalled } from "../src/checks";
import { DEFAULT_SETTINGS, mergeSettings } from "../src/config";
import { DEFAULT_TEMPLATES } from "../src/default-templates";
import { frontmatterMigration } from "../src/migration";
import { TYPE_TEMPLATE, contextRelations } from "../src/model";
import { homeFolderFor } from "../src/placement";
import { SCHEMAS, valueProblems } from "../src/schema";
import { splitFrontMatter } from "../src/sections";

it("schema keys and fallback templates match all 11 supplied templates", () => {
	for (const [type, schema] of Object.entries(SCHEMAS)) {
		if (type === "working") continue;
		const template = readFileSync(`tests/manual-vault/9_System/Templates/${TYPE_TEMPLATE[schema.type]}.md`, "utf8");
		assert.equal(DEFAULT_TEMPLATES[schema.type], template);
		const raw = splitFrontMatter(template).frontmatter!;
		const fm = parse(raw.replace(/^---\n/, "").replace(/\n---\n?$/, "").replace(/\{\{date:YYYY-MM-DD\}\}/g, "2026-09-22"));
		assert.deepEqual(Object.keys(fm).sort(), schema.fields.map(field => field.key).sort(), type);
		assert.deepEqual(valueProblems(schema, fm), [], type);
	}
});
it("subtasks and subprojects follow the manual's relation ownership", () => {
	assert.deepEqual(contextRelations("task", "task", "[[Parent]]", { project: ["[[Launch]]"] }), { parent: "[[Parent]]" });
	assert.deepEqual(contextRelations("project", "project", "[[Parent]]", { area: "[[Work]]" }), { parent: "[[Parent]]", area: ["[[Work]]"] });
	assert.deepEqual(contextRelations("resource", "zettel", "[[Book]]"), { source: ["[[Book]]"] });
	assert.equal(isStalled({ status: "active" }, 0, 1), false);
});
it("migration keeps nonempty destination values and is idempotent", () => {
	const result = frontmatterMigration({ type: "project", status: "on-hold", outcome: "old", done_criteria: "new", deadline: "2026-10-01", area: "[[Work]]" }, "2026-09-22")!;
	assert.equal(result.next.done_criteria, "new"); assert.equal(result.next.outcome, "old");
	assert.equal(result.next.status, "paused"); assert.equal(result.next.due, "2026-10-01"); assert.deepEqual(result.next.area, ["[[Work]]"]);
	const again = frontmatterMigration(result.next, "2026-09-22")!;
	assert.deepEqual(again.values, {}); assert.deepEqual(again.renames, []);
});
it("known old settings are upgraded, customized paths and prefixes stay intact", () => {
	const saved = structuredClone(DEFAULT_SETTINGS);
	saved.folders.transform = "4_Transform"; saved.prefixes.project = "P-"; saved.prefixes.area = "Team-"; saved.schemaVersion = 1;
	const settings = mergeSettings(saved);
	assert.equal(homeFolderFor(settings, "task"), "4_Transform/Tasks"); assert.equal(settings.prefixes.project, ""); assert.equal(settings.prefixes.area, "Team-");
	assert.equal(saved.prefixes.project, "P-");
});
