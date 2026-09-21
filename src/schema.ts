// 설계안 2.2 엔터티 스키마를 검사 가능한 형태로 옮긴 것입니다.
// C15 규칙 검사(값 범위, 필수 속성)와 C19 마이그레이션이 이 표 하나를 기준으로 삼습니다.
// obsidian을 import하지 않는 순수 모듈입니다.

import { AREA_STATUS, OUTPUT_STATUS, PROJECT_STATUS, SaintType, TASK_STATUS, ZETTEL_STATUS } from "./model";

/** 스키마가 바뀌면 올립니다. 저장된 값보다 크면 C19 안내가 뜹니다. */
export const SCHEMA_VERSION = 1;

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

const enumKeys = (table: Record<string, string>): string[] => Object.keys(table);

export const SCHEMAS: Record<SaintType, EntitySchema> = {
	task: {
		type: "task",
		label: "Task",
		fields: [
			{ key: "type", kind: "fixed", fixed: "task", required: true },
			{ key: "status", kind: "enum", values: enumKeys(TASK_STATUS), required: true },
			{ key: "project", kind: "link" },
			{ key: "area", kind: "link" },
			{ key: "scheduled", kind: "date" },
			{ key: "due", kind: "date" },
			{ key: "waiting_on", kind: "text" },
			{ key: "completed", kind: "date" },
		],
	},
	project: {
		type: "project",
		label: "Project",
		fields: [
			{ key: "type", kind: "fixed", fixed: "project", required: true },
			{ key: "status", kind: "enum", values: enumKeys(PROJECT_STATUS), required: true },
			{ key: "area", kind: "link" },
			{ key: "outcome", kind: "text", required: true },
			{ key: "deadline", kind: "date" },
			{ key: "repo", kind: "text" },
		],
	},
	area: {
		type: "area",
		label: "Area",
		fields: [
			{ key: "type", kind: "fixed", fixed: "area", required: true },
			{ key: "status", kind: "enum", values: enumKeys(AREA_STATUS), required: true },
			{ key: "standard", kind: "text" },
			{ key: "review_cycle", kind: "enum", values: ["weekly", "monthly", "quarterly"] },
		],
	},
	source: {
		type: "source",
		label: "Source",
		fields: [
			{ key: "type", kind: "fixed", fixed: "source", required: true },
			{ key: "author", kind: "text" },
			{ key: "url", kind: "text" },
			{ key: "location", kind: "text" },
			{ key: "project", kind: "link-list" },
			{ key: "area", kind: "link-list" },
		],
	},
	zettel: {
		type: "zettel",
		label: "Zettel",
		fields: [
			{ key: "type", kind: "fixed", fixed: "zettel", required: true },
			{ key: "status", kind: "enum", values: enumKeys(ZETTEL_STATUS), required: true },
			{ key: "sources", kind: "link-list" },
			{ key: "project", kind: "link-list" },
			{ key: "area", kind: "link-list" },
			{ key: "recall", kind: "boolean", required: true },
			{ key: "box", kind: "number", min: 1, max: 5, requiredWhen: { key: "recall", equals: true } },
			{ key: "last_reviewed", kind: "date" },
			{ key: "last_result", kind: "enum", values: ["pass", "fail"] },
		],
	},
	map: {
		type: "map",
		label: "Map",
		fields: [{ key: "type", kind: "fixed", fixed: "map", required: true }],
	},
	working: {
		type: "working",
		label: "Working",
		fields: [
			{ key: "type", kind: "fixed", fixed: "working", required: true },
			{ key: "project", kind: "link" },
			{ key: "area", kind: "link" },
			{ key: "repo", kind: "text" },
		],
	},
	output: {
		type: "output",
		label: "Output",
		fields: [
			{ key: "type", kind: "fixed", fixed: "output", required: true },
			{ key: "project", kind: "link", required: true },
			{ key: "status", kind: "enum", values: enumKeys(OUTPUT_STATUS), required: true },
			{ key: "uses", kind: "link-list" },
			{ key: "shipped", kind: "date" },
		],
	},
	session: {
		type: "session",
		label: "Session",
		fields: [
			{ key: "type", kind: "fixed", fixed: "session", required: true },
			{ key: "date", kind: "date", required: true },
		],
	},
	daily: {
		type: "daily",
		label: "Daily",
		fields: [
			{ key: "type", kind: "fixed", fixed: "daily", required: true },
			{ key: "date", kind: "date", required: true },
		],
	},
	review: {
		type: "review",
		label: "Review",
		fields: [
			{ key: "type", kind: "fixed", fixed: "review", required: true },
			{ key: "cycle", kind: "enum", values: ["weekly", "project-close"], required: true },
			{ key: "project", kind: "link" },
			{ key: "date", kind: "date", required: true },
		],
	},
};

/**
 * 키 이름이 바뀌면 여기에 `이전 이름: 새 이름`을 넣고 SCHEMA_VERSION을 올립니다.
 * C19가 이 표를 보고 노트의 키를 갈아 끼웁니다. 지금은 바뀐 키가 없습니다.
 */
export const KEY_RENAMES: Partial<Record<SaintType, Record<string, string>>> = {};

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
						message: `${field.key}는 "${field.fixed}"여야 합니다.`,
						allowed: field.fixed ? [field.fixed] : undefined,
					});
				}
				break;
			case "enum":
				if (typeof value !== "string" || !(field.values ?? []).includes(value)) {
					problems.push({
						key: field.key,
						value,
						message: `${field.key} 값 "${String(value)}"은(는) 허용값이 아닙니다.`,
						allowed: field.values,
					});
				}
				break;
			case "number": {
				const n = typeof value === "number" ? value : Number(value);
				if (!Number.isFinite(n)) {
					problems.push({ key: field.key, value, message: `${field.key}는 숫자여야 합니다.` });
				} else if (
					(field.min !== undefined && n < field.min) ||
					(field.max !== undefined && n > field.max)
				) {
					problems.push({
						key: field.key,
						value,
						message: `${field.key}는 ${field.min}~${field.max} 범위여야 합니다. 지금은 ${n}입니다.`,
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
						message: `${field.key}는 true 또는 false여야 합니다.`,
						allowed: ["true", "false"],
					});
				}
				break;
			case "date":
				if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
					problems.push({ key: field.key, value, message: `${field.key}는 YYYY-MM-DD여야 합니다.` });
				}
				break;
			case "link":
				if (Array.isArray(value)) {
					problems.push({ key: field.key, value, message: `${field.key}는 링크 하나만 받습니다.` });
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
	for (let i = field.min; i <= field.max; i++) out.push(String(i));
	return out;
}

/** 스키마가 정의한 빈 값. C19가 키를 채울 때 씁니다. */
export function emptyValueFor(field: FieldSpec): unknown {
	if (field.kind === "fixed") return field.fixed ?? null;
	if (field.kind === "boolean") return false;
	if (field.kind === "link-list") return [];
	return null;
}
