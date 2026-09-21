// 번역 표와 호출 지점이 어긋나지 않는지 봅니다.
// t()의 키는 한국어 원문이라 오타가 나면 조용히 원문이 그대로 나옵니다. 그것을 여기서 잡습니다.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	allTranslations,
	detectLocale,
	normalizeLocale,
	setLocale,
	t,
	translatedMessages,
} from "../src/i18n";

const ROOT = join(import.meta.dirname, "..");
const HANGUL = /[가-힣]/;

function sourceFiles(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (name === "node_modules" || name === "tests" || name.startsWith(".")) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) sourceFiles(path, out);
		else if (name.endsWith(".ts")) out.push(path);
	}
	return out;
}

/** 소스에서 t("...")의 첫 인자를 모읍니다. */
function usedMessages(): Map<string, string> {
	const found = new Map<string, string>();
	for (const path of sourceFiles(ROOT)) {
		const src = readFileSync(path, "utf8");
		const re = /\bt\(\s*"((?:[^"\\]|\\.)*)"/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(src)) !== null) {
			const message = JSON.parse(`"${m[1]}"`) as string;
			if (!found.has(message)) found.set(message, path.slice(ROOT.length + 1));
		}
	}
	return found;
}

function placeholders(text: string): string[] {
	return [...text.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort();
}

describe("i18n 표", () => {
	it("t()로 부르는 한국어 문구는 모두 영어 번역이 있습니다", () => {
		const translated = new Set(translatedMessages());
		const missing = [...usedMessages().entries()]
			.filter(([message]) => HANGUL.test(message))
			.filter(([message]) => !translated.has(message))
			.map(([message, file]) => `${file}: ${message}`);
		assert.deepEqual(missing, []);
	});

	it("번역 표에 쓰이지 않는 문구가 남아 있지 않습니다", () => {
		const used = usedMessages();
		const orphans = translatedMessages().filter((message) => !used.has(message));
		assert.deepEqual(orphans, []);
	});

	it("원문과 번역의 자리 표시자가 같습니다", () => {
		setLocale("en");
		const mismatched = translatedMessages().filter(
			(message) => placeholders(message).join() !== placeholders(t(message)).join()
		);
		assert.deepEqual(mismatched, []);
	});
});

describe("언어 판정", () => {
	it("지역이 붙은 값도 받습니다", () => {
		assert.equal(normalizeLocale("ko"), "ko");
		assert.equal(normalizeLocale("ko-KR"), "ko");
		assert.equal(normalizeLocale("en-GB"), "en");
		assert.equal(normalizeLocale("ja"), null);
		assert.equal(normalizeLocale(undefined), null);
	});

	it("모르는 언어는 영어입니다", () => {
		assert.equal(detectLocale("ja"), "en");
	});

	it("Obsidian 언어 설정을 먼저 봅니다", () => {
		const storage = { getItem: (key: string) => (key === "language" ? "ko" : null) };
		(globalThis as { localStorage?: unknown }).localStorage = storage;
		try {
			assert.equal(detectLocale("en"), "ko");
		} finally {
			delete (globalThis as { localStorage?: unknown }).localStorage;
		}
	});
});

describe("allTranslations", () => {
	it("원문과 번역을 모두 돌려줍니다", () => {
		// C8이 세션 노트의 "판정:" 줄을 언어와 무관하게 찾는 근거입니다.
		assert.deepEqual(allTranslations("판정:"), ["판정:", "Verdict:"]);
	});

	it("번역이 없으면 원문 하나입니다", () => {
		assert.deepEqual(allTranslations("없는 문구"), ["없는 문구"]);
	});
});

describe("t()", () => {
	it("번역이 없으면 원문을 씁니다", () => {
		setLocale("en");
		assert.equal(t("번역이 없는 문구"), "번역이 없는 문구");
	});

	it("자리 표시자를 인자로 채웁니다", () => {
		setLocale("ko");
		assert.equal(t("수집함: {0}", "메모"), "수집함: 메모");
		setLocale("en");
		assert.equal(t("수집함: {0}", "메모"), "Inbox: 메모");
	});
});
