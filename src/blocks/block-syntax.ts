// C11 블록 문법 해석. obsidian에 기대지 않는 순수 함수라 단위 테스트할 수 있습니다.

import { CreatableType, allowedChildren } from "../model";

export interface ParsedBlock {
	types: string[];
	errors: string[];
}

/** `types: a, b, c` 한 줄만 읽습니다. 알 수 없는 키는 오류로 알립니다. */
export function parseBlock(source: string): ParsedBlock {
	const types: string[] = [];
	const errors: string[] = [];
	for (const raw of (source ?? "").split(/\r?\n/)) {
		const line = raw.trim();
		if (line === "" || line.startsWith("#")) continue;
		const m = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(line);
		if (!m) {
			errors.push(`읽을 수 없는 줄입니다: ${line}`);
			continue;
		}
		if (m[1] !== "types") {
			errors.push(`알 수 없는 키입니다: ${m[1]}`);
			continue;
		}
		for (const t of m[2].split(",")) {
			const value = t.trim();
			if (value) types.push(value);
		}
	}
	if (types.length === 0 && errors.length === 0) errors.push("types가 비어 있습니다.");
	return { types, errors };
}

/** 설계안 2.4에서 부모 유형에 허용된 자식만 받습니다. */
export function validateTypes(
	parentType: string | null,
	types: string[]
): { allowed: CreatableType[]; errors: string[] } {
	const permitted = allowedChildren(parentType);
	if (permitted.length === 0) {
		return {
			allowed: [],
			errors: [`type: ${parentType ?? "(없음)"} 은(는) 자식을 만들 수 있는 부모가 아닙니다.`],
		};
	}
	const allowed: CreatableType[] = [];
	const errors: string[] = [];
	for (const t of types) {
		if (permitted.includes(t as CreatableType)) allowed.push(t as CreatableType);
		else errors.push(`${t}은(는) ${parentType} 맥락에서 만들 수 없습니다. 허용: ${permitted.join(", ")}`);
	}
	return { allowed, errors };
}
