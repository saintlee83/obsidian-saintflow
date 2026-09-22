import { TYPE_DEFAULTS, type SaintType } from "./model";
import { KEY_RENAMES, emptyValueFor, isEmptyValue, missingKeys, schemaFor, valueProblems } from "./schema";

export function frontmatterMigration(fm: Record<string, unknown>, created: string, archived = false) {
	const type = fm.type === "source" ? "resource" : fm.type === "session" ? "recall" :
		fm.type === "review" ? (fm.cycle === "project-close" ? "closing" : "weekly") : fm.type;
	const schema = schemaFor(type);
	if (!schema) return null;
	const next = { ...fm };
	const renames: [string, string][] = [];
	const values: Record<string, unknown> = {};
	for (const [from, to] of Object.entries(KEY_RENAMES[schema.type] ?? {})) {
		if (!(from in next) || !isEmptyValue(next[to])) continue;
		next[to] = next[from];
		delete next[from];
		renames.push([from, to]);
	}
	if (fm.type !== type) values.type = type;
	if (type === "task" && next.status === "scheduled") values.status = "next";
	if (type === "project" && next.status === "on-hold") values.status = "paused";
	if (type === "area" && next.status === "inactive") values.status = "paused";
	if (type === "area" && typeof next.review_cycle === "string") {
		const cycle = ({ weekly: "매주", monthly: "매월", quarterly: "분기" } as Record<string, string>)[next.review_cycle];
		if (cycle) values.review_cycle = cycle;
	}
	for (const field of schema.fields) {
		if (field.kind === "link-list" && typeof next[field.key] === "string" && !isEmptyValue(next[field.key])) values[field.key] = [next[field.key]];
	}
	const addKeys = missingKeys(schema, next);
	for (const key of addKeys) {
		const field = schema.fields.find(field => field.key === key)!;
		values[key] = key === "created" ? created : key === "archived" ? archived :
			TYPE_DEFAULTS[schema.type][key] ?? emptyValueFor(field);
	}
	Object.assign(next, values);
	return { type: schema.type as SaintType, renames, values, addKeys, next, reports: valueProblems(schema, next).map(problem => problem.message) };
}
