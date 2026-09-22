import { CreatableType, TYPE_DEFAULTS } from "./model";
import { isEmptyValue } from "./schema";
import { findSection } from "./sections";

export const DISPATCH: Record<string, CreatableType | "delete"> = {
	Tasks: "task", Projects: "project", Areas: "area", Resources: "resource",
	Knowledge: "zettel", Outputs: "output", "삭제": "delete",
};

/** Preserve capture metadata, including false and empty lists; only explicit form input overrides it. */
export function arrangeProperties(current: Record<string, unknown>, template: Record<string, unknown>, type: CreatableType, captured: string, overrides: Record<string, unknown>): Record<string, unknown> {
	const next = { ...template, ...current };
	delete next.position;
	delete next.dispatch;
	for (const [key, value] of Object.entries(TYPE_DEFAULTS[type])) {
		if (isEmptyValue(next[key])) next[key] = value;
	}
	next.type = type;
	if (isEmptyValue(current.created)) next.created = captured;
	for (const [key, value] of Object.entries(overrides)) if (value !== undefined) next[key] = value;
	return next;
}

/** Append missing template sections without rewriting any existing body text. */
export function appendMissingSections(body: string, template: string): string {
	const headings = [...template.matchAll(/^##\s+(.+)$/gm)];
	const additions: string[] = [];
	if (headings.length === 0 && !body.includes(template.trim())) additions.push(template.trim());
	for (let i = 0;i < headings.length;i++) {
		if (findSection(body, headings[i][1].trim())) continue;
		additions.push(template.slice(headings[i].index, headings[i + 1]?.index).trimEnd());
	}
	return additions.filter(Boolean).length ? body + "\n\n" + additions.filter(Boolean).join("\n\n") + "\n" : body;
}
