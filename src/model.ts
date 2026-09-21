// 설계안 2.2 엔터티 스키마와 2.4 맥락 생성 매트릭스.

import { t } from "./i18n";

export type SaintType =
	| "task"
	| "project"
	| "area"
	| "working"
	| "output"
	| "source"
	| "zettel"
	| "map"
	| "session"
	| "daily"
	| "review";

/** C2 분류와 C3 맥락 생성에서 고르는 유형. review-close는 종료 검토 노트입니다. */
export type CreatableType = SaintType | "review-close";

/**
 * 유형 라벨은 화면에만 쓰므로 언어 설정을 따릅니다.
 * 상수가 아니라 함수인 이유: 모듈을 읽는 시점이 아니라 그릴 때 언어를 정해야 합니다.
 */
export function typeLabel(type: CreatableType): string {
	switch (type) {
		case "task":
			return t("Task (행동 하나)");
		case "project":
			return t("Project (컨테이너와 허브)");
		case "area":
			return t("Area (컨테이너와 허브)");
		case "working":
			return t("Working (작업 노트 W-)");
		case "output":
			return t("Output (결과물 O-)");
		case "source":
			return t("Source (참고 자료 S-)");
		case "zettel":
			return t("Zettel (자기 말로 쓴 주장)");
		case "map":
			return t("Map (지식 지도 M-)");
		case "session":
			return t("회상 세션 (N-)");
		case "daily":
			return "Daily";
		case "review":
			return t("검토");
		case "review-close":
			return t("Review (프로젝트 종료)");
	}
}

// 상태 값 자체는 frontmatter에 그대로 들어가므로 번역하지 않습니다.
// 번역하는 것은 값 옆에 붙는 설명뿐입니다.
export const TASK_STATUS_VALUES = ["next", "scheduled", "waiting", "someday", "done"] as const;
export const PROJECT_STATUS_VALUES = ["active", "on-hold", "someday", "done"] as const;
export const AREA_STATUS_VALUES = ["active", "inactive"] as const;
export const ZETTEL_STATUS_VALUES = ["seed", "evergreen"] as const;
export const OUTPUT_STATUS_VALUES = ["draft", "shipped"] as const;

/** 드롭다운에 쓰는 값 → 라벨 표입니다. */
export function taskStatusOptions(): Record<string, string> {
	return {
		next: t("next (다음 행동)"),
		scheduled: t("scheduled (예정)"),
		waiting: t("waiting (대기)"),
		someday: t("someday (언젠가)"),
		done: t("done (완료)"),
	};
}

export function projectStatusOptions(): Record<string, string> {
	return {
		active: t("active (진행 중)"),
		"on-hold": t("on-hold (보류)"),
		someday: t("someday (언젠가)"),
		done: t("done (완료)"),
	};
}

export function areaStatusOptions(): Record<string, string> {
	return { active: "active", inactive: "inactive" };
}

export function zettelStatusOptions(): Record<string, string> {
	return { seed: "seed", evergreen: "evergreen" };
}

export function outputStatusOptions(): Record<string, string> {
	return { draft: "draft", shipped: "shipped" };
}

/** 2.4 유형별 기본값. */
export const TYPE_DEFAULTS: Partial<Record<CreatableType, Record<string, unknown>>> = {
	task: { type: "task", status: "next" },
	project: { type: "project", status: "active" },
	area: { type: "area", status: "active" },
	working: { type: "working" },
	output: { type: "output", status: "draft" },
	source: { type: "source" },
	zettel: { type: "zettel", status: "seed", recall: false, box: 1 },
	map: { type: "map" },
	session: { type: "session" },
	daily: { type: "daily" },
	review: { type: "review" },
	"review-close": { type: "review", cycle: "project-close" },
};

/** 유형별 템플릿 파일 이름(설계안 3.9). */
export const TYPE_TEMPLATE: Record<CreatableType, string> = {
	task: "Task",
	project: "Project",
	area: "Area",
	working: "Working",
	output: "Output",
	source: "Source",
	zettel: "Zettel",
	map: "Map",
	session: "Recall Session",
	daily: "Daily",
	review: "Weekly Review",
	"review-close": "Project Close Review",
};

/** 2.4 맥락 생성 매트릭스. 부모 유형이 허용하는 자식 유형입니다. */
export const CONTEXT_MATRIX: Partial<Record<SaintType, CreatableType[]>> = {
	project: ["task", "zettel", "source", "working", "output", "review-close"],
	area: ["task", "project", "zettel", "source", "working"],
	source: ["zettel"],
	zettel: ["zettel"],
	map: ["zettel"],
};

export function allowedChildren(parentType: unknown): CreatableType[] {
	if (typeof parentType !== "string") return [];
	return CONTEXT_MATRIX[parentType as SaintType] ?? [];
}

export function isContextParent(parentType: unknown): boolean {
	return allowedChildren(parentType).length > 0;
}

/** C2 분류에서 고를 수 있는 유형(설계안 5.3 C2 표). */
export const ARRANGE_TYPES: CreatableType[] = ["task", "project", "area", "source", "zettel", "map"];

/** 링크 속성 필드(C5). */
export const RELATION_FIELDS = {
	project: { label: "project", multi: false, types: ["project"] as SaintType[] },
	area: { label: "area", multi: false, types: ["area"] as SaintType[] },
	sources: { label: "sources", multi: true, types: ["source"] as SaintType[] },
	uses: { label: "uses", multi: true, types: ["zettel", "source"] as SaintType[] },
} as const;

export type RelationField = keyof typeof RELATION_FIELDS;

/** 유형별로 쓸 수 있는 관계 필드입니다. */
export const FIELDS_BY_TYPE: Partial<Record<SaintType, RelationField[]>> = {
	task: ["project", "area"],
	project: ["area"],
	working: ["project", "area"],
	output: ["project", "uses"],
	source: ["project", "area"],
	zettel: ["sources", "project", "area"],
	review: ["project"],
};

/** Source와 Zettel의 project/area는 다중(0..n)입니다(설계안 2.1). */
export function fieldIsMulti(type: unknown, field: RelationField): boolean {
	if (field === "sources" || field === "uses") return true;
	if (field === "project" || field === "area") {
		return type === "source" || type === "zettel";
	}
	return false;
}
