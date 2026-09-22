// SaintFlow Manual: 유형, 상태, 부모별 생성 규칙.
import { t } from "./i18n";

export type SaintType = "task" | "project" | "area" | "resource" | "zettel" | "map" | "output" | "recall" | "daily" | "weekly" | "closing" | "working";
export type CreatableType = SaintType;
export function typeLabel(type: CreatableType): string {
	const labels: Record<CreatableType, string> = {
		task: t("Task (행동 하나)"), project: "Project", area: "Area", resource: "Resource",
		zettel: t("Zettel (자기 말로 쓴 주장)"), map: "Map", output: "Output",
		recall: t("회상 세션 (N-)"), daily: "Daily", weekly: "Weekly", closing: t("Review (프로젝트 종료)"), working: "Working",
	};
	return labels[type];
}
export const TASK_STATUS_VALUES = ["next", "in progress", "waiting", "someday", "done", "dropped"] as const;
export const PROJECT_STATUS_VALUES = ["planned", "active", "paused", "someday", "done", "dropped"] as const;
export const AREA_STATUS_VALUES = ["active", "paused", "retired"] as const;
export const RESOURCE_STATUS_VALUES = ["to read", "reading", "processed", "reference"] as const;
export const ZETTEL_STATUS_VALUES = ["seed", "evergreen"] as const;
export const OUTPUT_STATUS_VALUES = ["draft", "in review", "done", "shipped"] as const;
export const RESOURCE_KIND_VALUES = ["책", "강의", "문서", "논문", "영상", "웹", "데이터시트", "기타"] as const;
export const OUTPUT_KIND_VALUES = ["문서", "코드", "발표", "결정", "기타"] as const;
export const REVIEW_CYCLE_VALUES = ["매주", "격주", "매월", "분기"] as const;
export const OPEN_TASK_STATUSES = ["next", "in progress", "waiting"] as const;
const options = (values: readonly string[]): Record<string, string> => Object.fromEntries(values.map(value => [value, value]));
export const taskStatusOptions = () => options(TASK_STATUS_VALUES);
export const projectStatusOptions = () => options(PROJECT_STATUS_VALUES);
export const areaStatusOptions = () => options(AREA_STATUS_VALUES);
export const resourceStatusOptions = () => options(RESOURCE_STATUS_VALUES);
export const zettelStatusOptions = () => options(ZETTEL_STATUS_VALUES);
export const outputStatusOptions = () => options(OUTPUT_STATUS_VALUES);
export const reviewCycleOptions = () => options(REVIEW_CYCLE_VALUES);
export const TYPE_DEFAULTS: Record<CreatableType, Record<string, unknown>> = {
	task: { type: "task", status: "next", archived: false },
	project: { type: "project", status: "active", archived: false },
	area: { type: "area", status: "active", review_cycle: "매월", archived: false },
	resource: { type: "resource", status: "to read", archived: false },
	zettel: { type: "zettel", maturity: "seed", recall: false, box: 1, archived: false },
	map: { type: "map", archived: false }, output: { type: "output", status: "draft", archived: false },
	recall: { type: "recall" }, daily: { type: "daily" }, weekly: { type: "weekly" }, closing: { type: "closing" },
	working: { type: "working", archived: false },
};
export const TYPE_TEMPLATE: Record<CreatableType, string> = {
	task: "Task", project: "Project", area: "Area", resource: "Resource", zettel: "Zettel", map: "Map",
	output: "Output", recall: "Recall", daily: "Daily", weekly: "Weekly", closing: "Closing", working: "Working",
};
export const CONTEXT_MATRIX: Partial<Record<SaintType, CreatableType[]>> = {
	project: ["task", "project", "output", "resource", "zettel"], area: ["project", "task", "resource", "zettel"],
	task: ["task"], resource: ["zettel"], map: ["zettel"], zettel: ["zettel"],
};
export function allowedChildren(parentType: unknown): CreatableType[] {
	return typeof parentType === "string" ? CONTEXT_MATRIX[parentType as SaintType] ?? [] : [];
}
export function isContextParent(parentType: unknown): boolean { return allowedChildren(parentType).length > 0; }
export const ARRANGE_TYPES: CreatableType[] = ["task", "project", "area", "resource", "zettel", "map", "output"];
export const RELATION_FIELDS = {
	project: { label: "project", types: ["project"] as SaintType[] }, area: { label: "area", types: ["area"] as SaintType[] },
	parent: { label: "parent", types: ["task", "project"] as SaintType[] }, source: { label: "source", types: ["resource"] as SaintType[] },
	uses: { label: "uses", types: ["zettel", "resource"] as SaintType[] },
};
export type RelationField = keyof typeof RELATION_FIELDS;
export const FIELDS_BY_TYPE: Partial<Record<SaintType, RelationField[]>> = {
	task: ["project", "area", "parent"], project: ["area", "parent"], working: ["project", "area"],
	output: ["project", "uses"], resource: ["project", "area"], zettel: ["source", "project", "area"], closing: ["project"],
};
export function fieldIsMulti(_type: unknown, field: RelationField): boolean { return field !== "parent"; }
/** 하위 Task는 project를 중복 기록하지 않습니다. 하위 프로젝트만 area를 상속합니다. */
export function contextRelations(parentType: string | null, childType: CreatableType, parentLink: string, parentFm: Record<string, unknown> = {}): Record<string, unknown> {
	if (parentType === "project") {
		if (childType === "project") return { parent: parentLink, ...(parentFm.area ? { area: Array.isArray(parentFm.area) ? [...parentFm.area] : [parentFm.area] } : {}) };
		return { project: [parentLink] };
	}
	if (parentType === "area") return { area: [parentLink] };
	if (parentType === "task" && childType === "task") return { parent: parentLink };
	if (parentType === "resource" && childType === "zettel") return { source: [parentLink] };
	return {};
}
