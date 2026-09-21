// 설계안 2.2 엔터티 스키마와 2.4 맥락 생성 매트릭스.

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

export const TYPE_LABEL: Record<CreatableType, string> = {
	task: "Task (행동 하나)",
	project: "Project (컨테이너와 허브)",
	area: "Area (컨테이너와 허브)",
	working: "Working (작업 노트 W-)",
	output: "Output (결과물 O-)",
	source: "Source (참고 자료 S-)",
	zettel: "Zettel (자기 말로 쓴 주장)",
	map: "Map (지식 지도 M-)",
	session: "회상 세션 (N-)",
	daily: "Daily",
	review: "검토",
	"review-close": "Review (프로젝트 종료)",
};

export const TASK_STATUS = {
	next: "next (다음 행동)",
	scheduled: "scheduled (예정)",
	waiting: "waiting (대기)",
	someday: "someday (언젠가)",
	done: "done (완료)",
} as const;

export const PROJECT_STATUS = {
	active: "active (진행 중)",
	"on-hold": "on-hold (보류)",
	someday: "someday (언젠가)",
	done: "done (완료)",
} as const;

export const AREA_STATUS = {
	active: "active",
	inactive: "inactive",
} as const;

export const ZETTEL_STATUS = {
	seed: "seed",
	evergreen: "evergreen",
} as const;

export const OUTPUT_STATUS = {
	draft: "draft",
	shipped: "shipped",
} as const;

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
