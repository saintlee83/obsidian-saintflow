import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addLinkToList, extractLinks, linkTargets, parseLinkTarget, toLink } from "../src/links";
import { baseNameOf, folderOf, joinPath, sanitizeFileName, stripPrefix, uniqueName, withPrefix } from "../src/naming";

describe("sanitizeFileName (설계안 3.5 규칙 6)", () => {
	it("운영체제 금지 문자를 지웁니다", () => {
		assert.equal(sanitizeFileName('보고서: 초안/v2*?"<>|'), "보고서 초안 v2");
	});

	it("Obsidian 링크를 깨뜨리는 문자를 지웁니다", () => {
		assert.equal(sanitizeFileName("[[링크]] ^블록 #태그x"), "링크 블록 태그x");
	});

	it("샾을 공백으로 바꿉니다", () => {
		assert.equal(sanitizeFileName("C# 비동기 정리"), "C 비동기 정리");
		assert.equal(sanitizeFileName("F#"), "F");
	});

	it("첫 줄만 씁니다", () => {
		assert.equal(sanitizeFileName("첫 줄\n둘째 줄"), "첫 줄");
	});

	it("끝의 점과 공백을 지웁니다", () => {
		assert.equal(sanitizeFileName("  메모 ...  "), "메모");
	});
});

describe("withPrefix (설계안 3.5 규칙 1)", () => {
	it("접두사 뒤에 공백을 두지 않습니다", () => {
		assert.equal(withPrefix("P-", "기술비교보고서"), "P-기술비교보고서");
		assert.equal(withPrefix("S-", "  전자회로 3강 BJT 바이어스"), "S-전자회로 3강 BJT 바이어스");
	});

	it("접두사를 두 번 붙이지 않습니다", () => {
		assert.equal(withPrefix("P-", "P-기술비교보고서"), "P-기술비교보고서");
	});

	it("접두사가 없는 유형은 그대로 둡니다", () => {
		assert.equal(withPrefix("", "후보 기술 A 평가 조건 정리하기"), "후보 기술 A 평가 조건 정리하기");
	});

	it("내용이 접두사뿐이면 빈 문자열", () => {
		assert.equal(withPrefix("P-", "P-"), "");
	});
});

describe("stripPrefix / uniqueName", () => {
	it("종료 검토 이름을 만들 때 접두사를 뗍니다", () => {
		assert.equal("R-종료-" + stripPrefix("P-", "P-기술비교보고서"), "R-종료-기술비교보고서");
	});

	it("겹치면 뒤에 번호를 붙입니다 (설계안 3.5 규칙 4)", () => {
		const taken = new Set(["메모", "메모 2"]);
		assert.equal(uniqueName("메모", (c) => taken.has(c)), "메모 3");
		assert.equal(uniqueName("다른 메모", (c) => taken.has(c)), "다른 메모");
	});
});

describe("joinPath / folderOf / baseNameOf", () => {
	it("빈 조각을 건너뜁니다", () => {
		assert.equal(joinPath("1_Arrange/Projects", "", "P-정상"), "1_Arrange/Projects/P-정상");
		assert.equal(joinPath("/0_Sweep/", "메모.md"), "0_Sweep/메모.md");
	});

	it("폴더와 파일명을 나눕니다", () => {
		assert.equal(folderOf("4_Transform/할 일.md"), "4_Transform");
		assert.equal(baseNameOf("4_Transform/할 일.md"), "할 일");
		assert.equal(folderOf("Home.md"), "");
	});
});

describe("links (C5 링크 표기 통일)", () => {
	it("[[파일명]] 표기를 만듭니다", () => {
		assert.equal(toLink("P-정상"), "[[P-정상]]");
	});

	it("별칭과 헤딩을 떼어냅니다", () => {
		assert.equal(parseLinkTarget("[[P-정상|정상]]"), "P-정상");
		assert.equal(parseLinkTarget("[[P-정상#완료 조건]]"), "P-정상");
		assert.equal(parseLinkTarget("P-정상"), null);
	});

	it("속성 값에서 단일 링크와 리스트를 모두 읽습니다", () => {
		assert.deepEqual(linkTargets("[[P-정상]]"), ["P-정상"]);
		assert.deepEqual(linkTargets(["[[S-테스트]]", "[[다른 주장]]"]), ["S-테스트", "다른 주장"]);
		assert.deepEqual(linkTargets(null), []);
		assert.deepEqual(linkTargets("링크가 아님"), []);
	});

	it("한 줄에서 여러 링크를 꺼냅니다", () => {
		assert.deepEqual(extractLinks("- [[A]] — [[B]]와 비교"), ["A", "B"]);
	});

	it("리스트에 더할 때 중복을 만들지 않습니다", () => {
		assert.deepEqual(addLinkToList(["[[A]]"], "B"), ["[[A]]", "[[B]]"]);
		assert.deepEqual(addLinkToList(["[[A]]"], "A"), ["[[A]]"]);
		assert.deepEqual(addLinkToList(null, "A"), ["[[A]]"]);
		assert.deepEqual(addLinkToList("[[A]]", "B"), ["[[A]]", "[[B]]"]);
	});
});
