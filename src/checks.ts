// 설계안 2.3 파생 값과 1.7 회상 판정. Bases와 같은 규칙을 코드로 옮긴 순수 함수입니다.
// obsidian을 import하지 않습니다. 단위 테스트 대상입니다(설계안 5.4).

import { addDays, diffDays, normalizeISO } from "./dates";
import { t } from "./i18n";

export const DEFAULT_RECALL_INTERVALS = [1, 3, 7, 14, 30];
export const MAX_BOX = 5;

export type RecallResult = "pass" | "fail";

export interface RecallState {
	recall?: boolean | null;
	box?: number | null;
	last_reviewed?: string | null;
	archived?: boolean;
}

/** box에 대응하는 간격(일). box가 비어 있으면 첫 간격, 마지막 box 이상이면 마지막 간격입니다. */
export function intervalForBox(box: unknown, intervals: number[] = DEFAULT_RECALL_INTERVALS): number {
	const table = intervals.length > 0 ? intervals : DEFAULT_RECALL_INTERVALS;
	const n = typeof box === "number" ? Math.floor(box) : Number.NaN;
	if (!Number.isFinite(n) || n < 1) return table[0];
	if (n >= table.length) return table[table.length - 1];
	return table[n - 1];
}

/** next_review: last_reviewed가 없으면 today, 있으면 last_reviewed + 간격(box). */
export function nextReview(
	state: RecallState,
	today: string,
	intervals: number[] = DEFAULT_RECALL_INTERVALS
): string {
	const last = normalizeISO(state.last_reviewed ?? null);
	if (!last) return today;
	return addDays(last, intervalForBox(state.box ?? null, intervals));
}

/** due_today: recall = true, 보관되지 않음, next_review <= today. */
export function isDueToday(
	state: RecallState,
	today: string,
	intervals: number[] = DEFAULT_RECALL_INTERVALS
): boolean {
	if (state.recall !== true) return false;
	if (state.archived) return false;
	return nextReview(state, today, intervals) <= today;
}

/** 1.7 box 갱신: pass면 한 칸 올리고(최대 5), fail이면 1로 되돌립니다. */
export function gradeBox(box: unknown, result: RecallResult, max: number = MAX_BOX): number {
	if (result === "fail") return 1;
	const n = typeof box === "number" ? Math.floor(box) : Number.NaN;
	const current = Number.isFinite(n) && n >= 1 ? n : 1;
	return Math.min(current + 1, max);
}

/** 1.7 판정 한 줄. 틀린 점이 없으면 뒤를 생략합니다. */
export function recallLogLine(date: string, result: RecallResult, note: string): string {
	const trimmed = (note ?? "").trim();
	return trimmed ? `- ${date} ${result} — ${trimmed}` : `- ${date} ${result}`;
}

/** active 프로젝트에 열린 Task와 active 하위 프로젝트가 모두 없으면 멈춤입니다. */
export function isStalled(project: { status?: unknown; archived?: boolean }, nextTaskCount: number, activeChildCount = 0): boolean {
	if (project.archived) return false;
	return project.status === "active" && nextTaskCount === 0 && activeChildCount === 0;
}

/** orphan_zettel: 연결 섹션의 나가는 Zettel 링크와 들어오는 Zettel 링크가 모두 없음. */
export function isOrphanZettel(outgoing: number, incoming: number): boolean {
	return outgoing === 0 && incoming === 0;
}

/** maturity = seed이고 생성 후 임계일 이상이면 오래된 seed입니다. */
export function isOldSeed(
	status: unknown,
	createdISO: string,
	today: string,
	thresholdDays: number
): boolean {
	if (status !== "seed") return false;
	const age = diffDays(createdISO, today);
	if (Number.isNaN(age)) return false;
	return age >= thresholdDays;
}

/** output_without_uses: uses가 비어 있음. */
export function isOutputWithoutUses(uses: unknown): boolean {
	if (uses === null || uses === undefined) return true;
	if (Array.isArray(uses)) return uses.filter((v) => String(v ?? "").trim() !== "").length === 0;
	return String(uses).trim() === "";
}

/** Zettel evergreen 승격 조건(설계안 1.6 / C7). 부족한 조건을 문장으로 돌려줍니다. */
export function evergreenBlockers(input: {
	thought: string;
	links: { target: string; reason: string }[];
}): string[] {
	const problems: string[] = [];
	if (input.thought.trim() === "") problems.push(t("생각 섹션이 비어 있습니다."));
	if (input.links.length < 2) {
		problems.push(t("연결이 {0}개입니다. 2개 이상이어야 합니다.", input.links.length));
	}
	const missing = input.links.filter((l) => l.reason.trim() === "").map((l) => l.target);
	if (missing.length > 0) problems.push(t("연결 이유가 없습니다: {0}", missing.join(", ")));
	return problems;
}
