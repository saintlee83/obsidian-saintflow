// 날짜 계산. Obsidian API와 Node API에 의존하지 않는 순수 함수만 둡니다(설계안 5.4).
// 모든 날짜는 YYYY-MM-DD 문자열입니다. ISO 문자열은 사전순 비교가 날짜 비교와 같습니다.

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function pad2(n: number): string {
	return n < 10 ? "0" + n : String(n);
}

/** 로컬 시각 기준 오늘. 사용자가 보는 달력과 어긋나지 않도록 UTC가 아닌 로컬을 씁니다. */
export function todayISO(now: Date = new Date()): string {
	return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** file.ctime 같은 epoch ms를 로컬 날짜로 바꿉니다. */
export function isoFromTimestamp(ms: number): string {
	return todayISO(new Date(ms));
}

/** 앞의 10자리만 받아들입니다. 날짜가 아니면 null입니다. */
export function normalizeISO(value: unknown): string | null {
	if (value instanceof Date) return todayISO(value);
	if (typeof value === "number") return isoFromTimestamp(value);
	if (typeof value !== "string") return null;
	const m = ISO_RE.exec(value.trim());
	if (!m) return null;
	const month = Number(m[2]);
	const day = Number(m[3]);
	if (month < 1 || month > 12 || day < 1 || day > 31) return null;
	return `${m[1]}-${m[2]}-${m[3]}`;
}

function toUTC(iso: string): number {
	const m = ISO_RE.exec(iso);
	if (!m) return NaN;
	return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUTC(ms: number): string {
	const d = new Date(ms);
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function addDays(iso: string, days: number): string {
	const base = toUTC(iso);
	if (Number.isNaN(base)) return iso;
	return fromUTC(base + days * 86400000);
}

/** to - from (일). 둘 중 하나가 날짜가 아니면 NaN입니다. */
export function diffDays(from: string, to: string): number {
	const a = toUTC(from);
	const b = toUTC(to);
	if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
	return Math.round((b - a) / 86400000);
}

/** ISO 주차 표기(YYYY-Www). 주간 검토 파일명에 씁니다(설계안 3.5). */
export function isoWeekName(iso: string): string {
	const base = toUTC(iso);
	if (Number.isNaN(base)) return iso;
	// 그 주의 목요일이 속한 해가 ISO 연도입니다.
	const thursday = new Date(base);
	const dayIdx = (thursday.getUTCDay() + 6) % 7; // 월=0
	thursday.setUTCDate(thursday.getUTCDate() - dayIdx + 3);
	const isoYear = thursday.getUTCFullYear();
	const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
	const firstIdx = (firstThursday.getUTCDay() + 6) % 7;
	firstThursday.setUTCDate(firstThursday.getUTCDate() - firstIdx + 3);
	const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
	return `${isoYear}-W${pad2(week)}`;
}
