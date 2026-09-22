// 설계안 3.5 파일명 규칙. 순수 함수입니다.

/** 운영체제 금지 문자. */
const OS_FORBIDDEN = /[\\/:*?"<>|]/g;
/** Obsidian 링크를 깨뜨리는 문자. */
const LINK_FORBIDDEN = /[#^[\]]/g;

/**
 * 규칙 6: 금지 문자를 제거하거나 치환합니다.
 * 링크를 깨뜨리는 문자는 공백으로 바꿉니다.
 */
export function sanitizeFileName(raw: string): string {
	let name = (raw ?? "").split(/\r?\n/)[0] ?? "";
	name = name.replace(OS_FORBIDDEN, " ").replace(LINK_FORBIDDEN, " ");
	name = name.replace(/\s+/g, " ").trim();
	// Windows는 이름 끝에 점과 공백을 둘 수 없습니다.
	name = name.replace(/[. ]+$/, "").trim();
	return name;
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 규칙 1: 접두사는 대문자 한 글자와 하이픈이며 뒤에 공백을 두지 않습니다. */
export function withPrefix(prefix: string, raw: string): string {
	const name = sanitizeFileName(raw);
	const p = prefix.trim();
	if (!p) return name;
	const bare = name.replace(new RegExp("^" + escapeRegExp(p) + "\\s*"), "").trim();
	return bare ? p + bare : "";
}

/** 접두사를 떼어낸 이름. 종료 검토 이름(R-종료-프로젝트명)을 만들 때 씁니다. */
export function stripPrefix(prefix: string, name: string): string {
	const p = prefix.trim();
	if (!p) return name;
	return name.replace(new RegExp("^" + escapeRegExp(p) + "\\s*"), "").trim();
}

/** 규칙 4: 파일명은 vault 전체에서 유일해야 합니다. 겹치면 뒤에 번호를 붙입니다. */
export function uniqueName(base: string, taken: (candidate: string) => boolean): string {
	if (!taken(base)) return base;
	for (let i = 2;i < 1000;i++) {
		const candidate = `${base} ${i}`;
		if (!taken(candidate)) return candidate;
	}
	return `${base} ${Date.now()}`;
}

/** 규칙 8: Zettel 제목은 60자 안팎을 권장합니다. 거부하지 않고 안내만 합니다. */
export const ZETTEL_TITLE_HINT = 60;

export function joinPath(...parts: string[]): string {
	return parts
		.map((p) => (p ?? "").replace(/^\/+|\/+$/g, ""))
		.filter((p) => p.length > 0)
		.join("/");
}

export function folderOf(path: string): string {
	const idx = path.lastIndexOf("/");
	return idx < 0 ? "" : path.slice(0, idx);
}

export function baseNameOf(path: string): string {
	const file = path.slice(path.lastIndexOf("/") + 1);
	return file.replace(/\.md$/i, "");
}
