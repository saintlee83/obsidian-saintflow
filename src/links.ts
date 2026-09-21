// 링크 표기 통일(설계안 C5: [[파일명]]). 순수 함수입니다.

const WIKILINK = /\[\[([^\]]+)\]\]/g;

/** [[파일명]] 표기를 만듭니다. */
export function toLink(name: string): string {
	return `[[${name}]]`;
}

/** [[A|별칭]], [[A#헤딩]] 에서 A만 꺼냅니다. 링크가 아니면 null입니다. */
export function parseLinkTarget(raw: string): string | null {
	const m = /^\s*\[\[([^\]]+)\]\]\s*$/.exec(raw ?? "");
	if (!m) return null;
	return cleanTarget(m[1]);
}

function cleanTarget(inner: string): string | null {
	const target = inner.split("|")[0].split("#")[0].trim();
	return target.length > 0 ? target : null;
}

/** 한 줄 안의 모든 [[...]] 대상을 순서대로 꺼냅니다. */
export function extractLinks(text: string): string[] {
	const out: string[] = [];
	WIKILINK.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = WIKILINK.exec(text ?? "")) !== null) {
		const target = cleanTarget(m[1]);
		if (target) out.push(target);
	}
	return out;
}

/**
 * frontmatter 속성 값에서 링크 대상 목록을 꺼냅니다.
 * 단일 링크, 링크 리스트, 링크가 아닌 문자열을 모두 받습니다.
 */
export function linkTargets(value: unknown): string[] {
	if (value === null || value === undefined) return [];
	const values = Array.isArray(value) ? value : [value];
	const out: string[] = [];
	for (const v of values) {
		if (typeof v !== "string") continue;
		const single = parseLinkTarget(v);
		if (single) {
			out.push(single);
			continue;
		}
		// [[A]] [[B]] 처럼 한 문자열에 여러 개가 들어 있는 경우까지 받아줍니다.
		out.push(...extractLinks(v));
	}
	return out;
}

/** 링크 리스트 속성에 값을 더합니다. 이미 있으면 그대로 둡니다. */
export function addLinkToList(current: unknown, name: string): string[] {
	const existing = Array.isArray(current)
		? current.filter((v): v is string => typeof v === "string" && v.trim() !== "")
		: typeof current === "string" && current.trim() !== ""
			? [current]
			: [];
	const target = toLink(name);
	if (existing.some((v) => parseLinkTarget(v) === name)) return existing;
	return [...existing, target];
}
