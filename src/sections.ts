// 본문 섹션 읽기와 쓰기(설계안 2.5). 파일을 받지 않고 문자열만 다루는 순수 함수입니다.
// 플러그인은 골격과 링크 줄만 만듭니다(규칙 6). 사용자 문장은 건드리지 않습니다.

import { parseLinkTarget } from "./links";

export const SECTION = {
	thought: "생각",
	evidence: "근거",
	limits: "적용 조건과 한계",
	links: "연결",
	questions: "회상 질문",
	log: "인출 기록",
	structure: "구조",
	snapshot: "점검 스냅샷",
	/** Resource 템플릿의 섹션. C13과 C14가 씁니다. */
	extract: "여기서 나온 생각",
	summary: "요약",
} as const;

export interface FrontMatterSplit {
	frontmatter: string | null;
	body: string;
}

/** frontmatter 블록과 본문을 나눕니다. frontmatter는 --- 줄을 포함합니다. */
export function splitFrontMatter(content: string): FrontMatterSplit {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content ?? "");
	if (!m || m.index !== 0) return { frontmatter: null, body: content ?? "" };
	return { frontmatter: m[0], body: (content ?? "").slice(m[0].length) };
}

export interface SectionRange {
	/** 헤딩 줄의 인덱스. */
	headingLine: number;
	/** 내용 시작 줄(헤딩 다음 줄). */
	start: number;
	/** 내용 끝 줄(배타적). */
	end: number;
}

function headingText(line: string): { level: number; text: string } | null {
	const m = /^(#{1,6})\s+(.*)$/.exec(line);
	if (!m) return null;
	return { level: m[1].length, text: m[2].trim() };
}

/** 이름이 같은 헤딩의 범위를 찾습니다. 없으면 null입니다. */
export function findSection(body: string, name: string): SectionRange | null {
	const lines = (body ?? "").split("\n");
	let found = -1;
	let level = 0;
	for (let i = 0;i < lines.length;i++) {
		const h = headingText(lines[i]);
		if (h && h.text === name) {
			found = i;
			level = h.level;
			break;
		}
	}
	if (found < 0) return null;
	let end = lines.length;
	for (let i = found + 1;i < lines.length;i++) {
		const h = headingText(lines[i]);
		if (h && h.level <= level) {
			end = i;
			break;
		}
	}
	return { headingLine: found, start: found + 1, end };
}

/** 섹션 본문을 문자열로 돌려줍니다. 섹션이 없으면 빈 문자열입니다. */
export function sectionText(body: string, name: string): string {
	const range = findSection(body, name);
	if (!range) return "";
	return (body ?? "")
		.split("\n")
		.slice(range.start, range.end)
		.join("\n")
		.trim();
}

/** 템플릿이 남겨둔 빈 자리 표시 줄인지 봅니다. 실제 내용이 생기면 지웁니다. */
export function isPlaceholderLine(line: string): boolean {
	const t = line.trim();
	if (t === "") return false;
	if (/^-\s*\[\[\s*\]\]/.test(t)) return true; // - [[ ]] — 연결한 이유
	if (/^-\s*YYYY-MM-DD\b/.test(t)) return true; // - YYYY-MM-DD pass/fail — 틀린 점
	return false;
}

export interface ConnectionLine {
	target: string;
	reason: string;
	line: number;
}

/**
 * 연결 섹션의 줄을 해석합니다. 형식은 `- [[대상]] — 이유` 입니다(설계안 2.5).
 * 이유 구분자는 em dash를 기본으로 하되 en dash와 하이픈도 받습니다.
 */
export function parseConnections(body: string): ConnectionLine[] {
	const range = findSection(body, SECTION.links);
	if (!range) return [];
	const lines = (body ?? "").split("\n");
	const out: ConnectionLine[] = [];
	for (let i = range.start;i < range.end;i++) {
		const raw = lines[i];
		const m = /^\s*[-*]\s+(.*)$/.exec(raw);
		if (!m) continue;
		if (isPlaceholderLine(raw)) continue;
		const rest = m[1];
		const linkMatch = /^\[\[[^\]]+\]\]/.exec(rest);
		if (!linkMatch) continue;
		const target = parseLinkTarget(linkMatch[0]);
		if (!target) continue;
		const after = rest.slice(linkMatch[0].length);
		const reasonMatch = /^\s*(?:—|–|-{1,2})\s*(.*)$/.exec(after);
		out.push({ target, reason: reasonMatch ? reasonMatch[1].trim() : "", line: i });
	}
	return out;
}

/** 리스트 섹션(구조 등)의 링크 대상을 꺼냅니다. */
export function parseSectionLinks(body: string, name: string): string[] {
	const range = findSection(body, name);
	if (!range) return [];
	const lines = (body ?? "").split("\n");
	const out: string[] = [];
	for (let i = range.start;i < range.end;i++) {
		if (isPlaceholderLine(lines[i])) continue;
		const m = /^\s*[-*]\s+(\[\[[^\]]+\]\])/.exec(lines[i]);
		if (!m) continue;
		const target = parseLinkTarget(m[1]);
		if (target) out.push(target);
	}
	return out;
}

/**
 * 섹션 끝에 줄을 더합니다. 섹션이 없으면 본문 끝에 헤딩과 함께 만듭니다.
 * 자리 표시 줄은 실제 줄이 처음 들어올 때 제거합니다.
 */
export function appendToSection(body: string, name: string, line: string, headingLevel = 2): string {
	const source = body ?? "";
	const range = findSection(source, name);
	if (!range) {
		const heading = "#".repeat(headingLevel) + " " + name;
		const prefix = source.trimEnd();
		const parts = prefix ? [prefix, "", heading, line, ""] : [heading, line, ""];
		return parts.join("\n");
	}
	const lines = source.split("\n");
	const kept: string[] = [];
	for (let i = range.start;i < range.end;i++) {
		if (isPlaceholderLine(lines[i])) continue;
		kept.push(lines[i]);
	}
	while (kept.length > 0 && kept[kept.length - 1].trim() === "") kept.pop();
	kept.push(line);
	kept.push("");
	return [...lines.slice(0, range.start), ...kept, ...lines.slice(range.end)].join("\n");
}

/** 섹션 내용을 통째로 바꿉니다. 없으면 만듭니다. 점검 스냅샷처럼 재계산되는 섹션에 씁니다. */
export function replaceSection(body: string, name: string, content: string, headingLevel = 2): string {
	const source = body ?? "";
	const range = findSection(source, name);
	const block = content.split("\n");
	if (!range) {
		const heading = "#".repeat(headingLevel) + " " + name;
		const prefix = source.trimEnd();
		const parts = prefix ? [prefix, "", heading, ...block, ""] : [heading, ...block, ""];
		return parts.join("\n");
	}
	const lines = source.split("\n");
	return [...lines.slice(0, range.start), ...block, "", ...lines.slice(range.end)].join("\n");
}

/** 첫 번째 회상 질문 한 줄. 콜아웃(답)과 빈 줄은 건너뜁니다. */
export function firstRecallQuestion(body: string): string {
	const range = findSection(body, SECTION.questions);
	if (!range) return "";
	const lines = (body ?? "").split("\n");
	for (let i = range.start;i < range.end;i++) {
		const t = lines[i].trim();
		if (t === "") continue;
		if (t.startsWith(">")) continue;
		if (t === "질문을 적습니다.") continue;
		return t.replace(/^[-*]\s+/, "");
	}
	return "";
}
