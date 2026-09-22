// 설계안 2.2 엔터티 스키마를 검사 가능한 형태로 옮긴 것입니다.
// C15 규칙 검사(값 범위, 필수 속성)와 C19 마이그레이션이 이 표 하나를 기준으로 삼습니다.
// obsidian을 import하지 않는 순수 모듈입니다.

import { t } from "./i18n";
import {
	SaintType
} from "./model";

/** 스키마가 바뀌면 올립니다. 저장된 값보다 크면 C19 안내가 뜹니다. */
export const SCHEMA_VERSION = 2;

export type FieldKind =
	| "fixed"
	| "enum"
	| "link"
	| "link-list"
	| "date"
	| "text"
	| "number"
	| "boolean";

export interface FieldSpec {
	key: string;
	kind: FieldKind;
	/** 항상 값이 있어야 합니다. */
	required?: boolean;
	/** 다른 속성이 이 값일 때만 필수입니다(예: recall이 true일 때의 box). */
	requiredWhen?: { key: string; equals: unknown };
	values?: readonly string[];
	fixed?: string;
	min?: number;
	max?: number;
}

export interface EntitySchema {
	type: SaintType;
	label: string;
	fields: FieldSpec[];
}

export const SCHEMAS: Record<SaintType, EntitySchema> = {
	task: {
		type: "task", label: "Task",
		fields: [
			{ key: "type", kind: "fixed", fixed: "task", required: true },
			{ key: "status", kind: "enum", values: ["next", "in progress", "waiting", "someday", "done", "dropped"], required: true },
			{ key: "project", kind: "link-list" },
			{ key: "area", kind: "link-list" },
			{ key: "parent", kind: "link" },
			{ key: "scheduled", kind: "date" },
			{ key: "due", kind: "date" },
			{ key: "waiting_on", kind: "text" },
			{ key: "link", kind: "text" },
			{ key: "archived", kind: "boolean" },
			{ key: "created", kind: "date" },
		],
	},
	project: {
		type: "project", label: "Project",
		fields: [
			{ key: "type", kind: "fixed", fixed: "project", required: true },
			{ key: "status", kind: "enum", values: ["planned", "active", "paused", "someday", "done", "dropped"], required: true },
			{ key: "done_criteria", kind: "text", requiredWhen: { key: "status", equals: "active" } },
			{ key: "due", kind: "date" },
			{ key: "area", kind: "link-list" },
			{ key: "parent", kind: "link" },
			{ key: "repo", kind: "text" },
			{ key: "link", kind: "text" },
			{ key: "archived", kind: "boolean" },
			{ key: "created", kind: "date" },
		],
	},
	area: {
		type: "area", label: "Area",
		fields: [
			{ key: "type", kind: "fixed", fixed: "area", required: true },
			{ key: "status", kind: "enum", values: ["active", "paused", "retired"], required: true },
			{ key: "standard", kind: "text" },
			{ key: "review_cycle", kind: "enum", values: ["매주", "격주", "매월", "분기"] },
			{ key: "link", kind: "text" },
			{ key: "archived", kind: "boolean" },
			{ key: "created", kind: "date" },
		],
	},
	resource: {
		type: "resource", label: "Resource",
		fields: [
			{ key: "type", kind: "fixed", fixed: "resource", required: true },
			{ key: "status", kind: "enum", values: ["to read", "reading", "processed", "reference"], required: true },
			{ key: "kind", kind: "enum", values: ["책", "강의", "문서", "논문", "영상", "웹", "데이터시트", "기타"] },
			{ key: "author", kind: "text" },
			{ key: "project", kind: "link-list" },
			{ key: "area", kind: "link-list" },
			{ key: "link", kind: "text" },
			{ key: "archived", kind: "boolean" },
			{ key: "created", kind: "date" },
		],
	},
	zettel: {
		type: "zettel", label: "Zettel",
		fields: [
			{ key: "type", kind: "fixed", fixed: "zettel", required: true },
			{ key: "maturity", kind: "enum", values: ["seed", "evergreen"], required: true },
			{ key: "source", kind: "link-list" },
			{ key: "project", kind: "link-list" },
			{ key: "area", kind: "link-list" },
			{ key: "recall", kind: "boolean", required: true },
			{ key: "question", kind: "text" },
			{ key: "box", kind: "number", min: 1, max: 5, requiredWhen: { key: "recall", equals: true } },
			{ key: "last_reviewed", kind: "date" },
			{ key: "last_result", kind: "enum", values: ["pass", "fail"] },
			{ key: "link", kind: "text" },
			{ key: "archived", kind: "boolean" },
			{ key: "created", kind: "date" },
		],
	},
	map: {
		type: "map", label: "Map",
		fields: [
			{ key: "type", kind: "fixed", fixed: "map", required: true },
			{ key: "archived", kind: "boolean" },
			{ key: "created", kind: "date" },
		],
	},
	output: {
		type: "output", label: "Output",
		fields: [
			{ key: "type", kind: "fixed", fixed: "output", required: true },
			{ key: "kind", kind: "enum", values: ["문서", "코드", "발표", "결정", "기타"] },
			{ key: "status", kind: "enum", values: ["draft", "in review", "done", "shipped"], required: true },
			{ key: "project", kind: "link-list" },
			{ key: "uses", kind: "link-list" },
			{ key: "link", kind: "text" },
			{ key: "archived", kind: "boolean" },
			{ key: "created", kind: "date" },
		],
	},
	recall: {
		type: "recall", label: "Recall",
		fields: [
			{ key: "type", kind: "fixed", fixed: "recall", required: true },
			{ key: "date", kind: "date", required: true },
		],
	},
	daily: {
		type: "daily", label: "Daily",
		fields: [
			{ key: "type", kind: "fixed", fixed: "daily", required: true },
			{ key: "date", kind: "date", required: true },
		],
	},
	weekly: {
		type: "weekly", label: "Weekly",
		fields: [
			{ key: "type", kind: "fixed", fixed: "weekly", required: true },
			{ key: "date", kind: "date", required: true },
		],
	},
	closing: {
		type: "closing", label: "Closing",
		fields: [
			{ key: "type", kind: "fixed", fixed: "closing", required: true },
			{ key: "project", kind: "link-list" },
			{ key: "date", kind: "date", required: true },
		],
	},
	working: {
		type: "working", label: "Working",
		fields: [
			{ key: "type", kind: "fixed", fixed: "working", required: true },
			{ key: "project", kind: "link-list" },
			{ key: "area", kind: "link-list" },
			{ key: "repo", kind: "text" },
			{ key: "link", kind: "text" },
			{ key: "archived", kind: "boolean" },
			{ key: "created", kind: "date" },
		],
	},
};

/**
 * 키 이름이 바뀌면 여기에 `이전 이름: 새 이름`을 넣고 SCHEMA_VERSION을 올립니다.
 * C19가 이 표를 보고 노트의 키를 갈아 끼웁니다. 지금은 바뀐 키가 없습니다.
 */
export const KEY_RENAMES: Partial<Record<SaintType, Record<string, string>>> = {
	project: { outcome: "done_criteria", deadline: "due" }, zettel: { status: "maturity", sources: "source" }, resource: { url: "link" },
};

export function schemaFor(type: unknown): EntitySchema | null {
	if (typeof type !== "string") return null;
	return SCHEMAS[type as SaintType] ?? null;
}

/** 값이 "없음"인지 봅니다. 빈 문자열과 빈 배열은 없는 것으로 칩니다. */
export function isEmptyValue(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "string") return value.trim() === "";
	if (Array.isArray(value)) return value.filter((v) => String(v ?? "").trim() !== "").length === 0;
	return false;
}

function isRequired(field: FieldSpec, fm: Record<string, unknown>): boolean {
	if (field.required) return true;
	if (!field.requiredWhen) return false;
	return fm[field.requiredWhen.key] === field.requiredWhen.equals;
}

/** 값이 있어야 하는데 비어 있는 속성 이름들. */
export function missingRequired(schema: EntitySchema, fm: Record<string, unknown>): string[] {
	return schema.fields
		.filter((field) => isRequired(field, fm) && isEmptyValue(fm[field.key]))
		.map((field) => field.key);
}

/** 스키마에는 있는데 노트에 키 자체가 없는 속성 이름들. C19가 빈 값으로 채웁니다. */
export function missingKeys(schema: EntitySchema, fm: Record<string, unknown>): string[] {
	return schema.fields.filter((field) => !(field.key in fm)).map((field) => field.key);
}

export interface ValueProblem {
	key: string;
	value: unknown;
	message: string;
	allowed?: readonly string[];
}

/** 허용값 밖의 값(설계안 C15 "값 범위"). 비어 있는 값은 필수 검사에서 다룹니다. */
export function valueProblems(schema: EntitySchema, fm: Record<string, unknown>): ValueProblem[] {
	const problems: ValueProblem[] = [];
	for (const field of schema.fields) {
		const value = fm[field.key];
		if (isEmptyValue(value)) continue;
		switch (field.kind) {
			case "fixed":
				if (value !== field.fixed) {
					problems.push({
						key: field.key,
						value,
						message: t("{0}는 \"{1}\"여야 합니다.", field.key, field.fixed),
						allowed: field.fixed ? [field.fixed] : undefined,
					});
				}
				break;
			case "enum":
				if (typeof value !== "string" || !(field.values ?? []).includes(value)) {
					problems.push({
						key: field.key,
						value,
						message: t("{0} 값 \"{1}\"은(는) 허용값이 아닙니다.", field.key, String(value)),
						allowed: field.values,
					});
				}
				break;
			case "number": {
				const n = typeof value === "number" ? value : Number(value);
				if (!Number.isFinite(n)) {
					problems.push({ key: field.key, value, message: t("{0}는 숫자여야 합니다.", field.key) });
				} else if (
					(field.min !== undefined && n < field.min) ||
					(field.max !== undefined && n > field.max)
				) {
					problems.push({
						key: field.key,
						value,
						message: t("{0}는 {1}~{2} 범위여야 합니다. 지금은 {3}입니다.", field.key, field.min, field.max, n),
						allowed: rangeValues(field),
					});
				}
				break;
			}
			case "boolean":
				if (typeof value !== "boolean") {
					problems.push({
						key: field.key,
						value,
						message: t("{0}는 true 또는 false여야 합니다.", field.key),
						allowed: ["true", "false"],
					});
				}
				break;
			case "date":
				if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
					problems.push({ key: field.key, value, message: t("{0}는 YYYY-MM-DD여야 합니다.", field.key) });
				}
				break;
			case "link":
				if (Array.isArray(value)) {
					problems.push({ key: field.key, value, message: t("{0}는 링크 하나만 받습니다.", field.key) });
				}
				break;
			case "link-list":
			case "text":
				break;
		}
	}
	return problems;
}

function rangeValues(field: FieldSpec): string[] | undefined {
	if (field.min === undefined || field.max === undefined) return undefined;
	const out: string[] = [];
	for (let i = field.min;i <= field.max;i++) out.push(String(i));
	return out;
}

/** 스키마가 정의한 빈 값. C19가 키를 채울 때 씁니다. */
export function emptyValueFor(field: FieldSpec): unknown {
	if (field.kind === "fixed") return field.fixed ?? null;
	if (field.kind === "boolean") return false;
	if (field.kind === "link-list") return [];
	return null;
}
