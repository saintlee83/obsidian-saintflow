import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	SECTION,
	appendToSection,
	findSection,
	firstRecallQuestion,
	parseConnections,
	parseSectionLinks,
	replaceSection,
	sectionText,
	splitFrontMatter,
} from "../src/sections";
import { parseBlock, validateTypes } from "../src/blocks/block-syntax";
import { setLocale } from "../src/i18n";

// 이 테스트는 원문(한국어) 문구를 그대로 검사합니다.
setLocale("ko");

const ZETTEL = [
	"## 생각",
	"이미터 저항의 음되먹임이 바이어스 안정도를 높인다.",
	"",
	"## 근거",
	"",
	"## 연결",
	"- [[A 주장]] — 전제가 된다",
	"- [[B 주장]] — 반례다",
	"",
	"## 회상 질문",
	"보지 않고 최소 예제를 쓰고 두 가지 해결책을 적용하라.",
	"",
	"> [!note]- 답과 근거",
	"> 핵심 주장",
	"",
	"## 인출 기록",
	"- YYYY-MM-DD pass/fail — 틀린 점",
	"",
].join("\n");

describe("splitFrontMatter", () => {
	it("속성 블록과 본문을 나눕니다", () => {
		const { frontmatter, body } = splitFrontMatter("---\ntype: task\n---\n## 체크리스트\n");
		assert.equal(frontmatter, "---\ntype: task\n---\n");
		assert.equal(body, "## 체크리스트\n");
	});

	it("속성이 없으면 본문만 돌려줍니다", () => {
		const { frontmatter, body } = splitFrontMatter("그냥 메모");
		assert.equal(frontmatter, null);
		assert.equal(body, "그냥 메모");
	});
});

describe("findSection / sectionText", () => {
	it("다음 헤딩 앞까지가 한 섹션입니다", () => {
		const range = findSection(ZETTEL, SECTION.links);
		assert.ok(range);
		assert.equal(range.headingLine, 5);
		assert.equal(sectionText(ZETTEL, SECTION.thought), "이미터 저항의 음되먹임이 바이어스 안정도를 높인다.");
	});

	it("없는 섹션은 빈 문자열", () => {
		assert.equal(sectionText(ZETTEL, "없는 섹션"), "");
		assert.equal(findSection(ZETTEL, "없는 섹션"), null);
	});
});

describe("parseConnections (설계안 2.5)", () => {
	it("대상과 이유를 읽습니다", () => {
		assert.deepEqual(
			parseConnections(ZETTEL).map((c) => ({ target: c.target, reason: c.reason })),
			[
				{ target: "A 주장", reason: "전제가 된다" },
				{ target: "B 주장", reason: "반례다" },
			]
		);
	});

	it("템플릿 자리 표시 줄은 세지 않습니다", () => {
		const body = "## 연결\n- [[ ]] — 연결한 이유\n";
		assert.deepEqual(parseConnections(body), []);
	});

	it("이유가 없으면 빈 이유로 표시합니다 (C7이 거부할 근거)", () => {
		const body = "## 연결\n- [[A]]\n";
		assert.deepEqual(parseConnections(body).map((c) => c.reason), [""]);
	});

	it("연결 섹션 밖의 링크는 세지 않습니다", () => {
		const body = "## 근거\n- [[딴 곳]] — 이유\n\n## 연결\n- [[A]] — 이유\n";
		assert.deepEqual(parseConnections(body).map((c) => c.target), ["A"]);
	});
});

describe("appendToSection / replaceSection", () => {
	it("섹션 끝에 줄을 더하고 자리 표시를 치웁니다", () => {
		const out = appendToSection(ZETTEL, SECTION.log, "- 2026-09-21 pass");
		assert.match(out, /## 인출 기록\n- 2026-09-21 pass/);
		assert.doesNotMatch(out, /YYYY-MM-DD/);
	});

	it("이미 있는 줄은 그대로 두고 아래에 붙입니다", () => {
		const out = appendToSection(ZETTEL, SECTION.links, "- [[C 주장]] — 새 이유");
		const targets = parseConnections(out).map((c) => c.target);
		assert.deepEqual(targets, ["A 주장", "B 주장", "C 주장"]);
	});

	it("섹션이 없으면 본문 끝에 만듭니다", () => {
		const out = appendToSection("## 목적\n내용\n", SECTION.structure, "- [[자식]]");
		assert.match(out, /## 구조\n- \[\[자식\]\]/);
		assert.deepEqual(parseSectionLinks(out, SECTION.structure), ["자식"]);
	});

	it("다음 섹션을 밀어내지 않습니다", () => {
		const out = appendToSection(ZETTEL, SECTION.links, "- [[C 주장]] — 새 이유");
		assert.ok(out.includes("## 회상 질문"));
		assert.ok(out.includes("## 인출 기록"));
	});

	it("replaceSection은 내용을 통째로 갈아 끼웁니다", () => {
		const once = replaceSection("## 점검 스냅샷\n- 옛 값\n\n## 뒤\n", SECTION.snapshot, "- 새 값");
		assert.match(once, /## 점검 스냅샷\n- 새 값/);
		assert.doesNotMatch(once, /옛 값/);
		assert.ok(once.includes("## 뒤"));
	});
});

describe("firstRecallQuestion", () => {
	it("콜아웃(답)은 건너뜁니다", () => {
		assert.equal(
			firstRecallQuestion(ZETTEL),
			"보지 않고 최소 예제를 쓰고 두 가지 해결책을 적용하라."
		);
	});

	it("질문이 없으면 빈 문자열", () => {
		assert.equal(firstRecallQuestion("## 회상 질문\n\n> [!note]- 답\n> 내용\n"), "");
	});
});

describe("C11 블록 문법 (설계안 5.3)", () => {
	it("types 한 줄을 읽습니다", () => {
		assert.deepEqual(parseBlock("types: task, working, output, zettel, source").types, [
			"task",
			"working",
			"output",
			"zettel",
			"source",
		]);
	});

	it("알 수 없는 키는 오류", () => {
		assert.match(parseBlock("kinds: task").errors[0], /알 수 없는 키/);
		assert.match(parseBlock("").errors[0], /types가 비어 있습니다/);
	});

	it("부모 유형에 허용된 자식만 남깁니다", () => {
		const { allowed, errors } = validateTypes("source", ["zettel", "task"]);
		assert.deepEqual(allowed, ["zettel"]);
		assert.equal(errors.length, 1);
		assert.match(errors[0], /task은\(는\) source 맥락에서 만들 수 없습니다/);
	});

	it("부모가 될 수 없는 유형이면 모두 거부", () => {
		const { allowed, errors } = validateTypes("task", ["zettel"]);
		assert.deepEqual(allowed, []);
		assert.match(errors[0], /부모가 아닙니다/);
	});

	it("프로젝트 허브는 설계안 2.4의 자식을 모두 허용합니다", () => {
		const { allowed, errors } = validateTypes("project", [
			"task",
			"zettel",
			"source",
			"working",
			"output",
			"review-close",
		]);
		assert.equal(allowed.length, 6);
		assert.deepEqual(errors, []);
	});
});
