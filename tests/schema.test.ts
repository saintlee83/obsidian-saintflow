import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	SCHEMAS,
	emptyValueFor,
	isEmptyValue,
	missingKeys,
	missingRequired,
	schemaFor,
	valueProblems,
} from "../src/schema";
import { setLocale } from "../src/i18n";

// 이 테스트는 원문(한국어) 문구를 그대로 검사합니다.
setLocale("ko");

describe("schemaFor", () => {
	it("설계안 2.2의 유형을 모두 덮습니다", () => {
		for (const type of ["task", "project", "area", "source", "zettel", "map", "working", "output", "session", "daily", "review"]) {
			assert.ok(schemaFor(type), `${type} 스키마가 없습니다`);
		}
	});

	it("모르는 유형은 null", () => {
		assert.equal(schemaFor("없는 유형"), null);
		assert.equal(schemaFor(undefined), null);
	});
});

describe("isEmptyValue", () => {
	it("빈 문자열과 빈 리스트는 없는 값", () => {
		assert.equal(isEmptyValue(null), true);
		assert.equal(isEmptyValue("   "), true);
		assert.equal(isEmptyValue([]), true);
		assert.equal(isEmptyValue([""]), true);
		assert.equal(isEmptyValue(false), false);
		assert.equal(isEmptyValue(0), false);
		assert.equal(isEmptyValue("값"), false);
	});
});

describe("missingRequired (C15 필수 속성)", () => {
	it("Project는 outcome이 있어야 합니다", () => {
		assert.deepEqual(
			missingRequired(SCHEMAS.project, { type: "project", status: "active", outcome: "" }),
			["outcome"]
		);
		assert.deepEqual(
			missingRequired(SCHEMAS.project, { type: "project", status: "active", outcome: "끝나는 조건" }),
			[]
		);
	});

	it("Output은 project와 status가 있어야 합니다", () => {
		assert.deepEqual(missingRequired(SCHEMAS.output, { type: "output" }), ["project", "status"]);
	});

	it("Zettel의 box는 recall이 true일 때만 필수입니다", () => {
		assert.deepEqual(
			missingRequired(SCHEMAS.zettel, { type: "zettel", status: "seed", recall: false }),
			[]
		);
		assert.deepEqual(
			missingRequired(SCHEMAS.zettel, { type: "zettel", status: "seed", recall: true }),
			["box"]
		);
	});

	it("recall이 false면 비어 있어도 필수를 만족합니다", () => {
		assert.deepEqual(
			missingRequired(SCHEMAS.zettel, { type: "zettel", status: "evergreen", recall: false, box: null }),
			[]
		);
	});
});

describe("valueProblems (C15 값 범위)", () => {
	it("허용값 밖의 status를 잡습니다", () => {
		const problems = valueProblems(SCHEMAS.task, { type: "task", status: "진행중" });
		assert.equal(problems.length, 1);
		assert.equal(problems[0].key, "status");
		assert.deepEqual(problems[0].allowed, ["next", "scheduled", "waiting", "someday", "done"]);
	});

	it("1~5 밖의 box를 잡고 고를 값을 알려 줍니다", () => {
		const problems = valueProblems(SCHEMAS.zettel, {
			type: "zettel",
			status: "seed",
			recall: true,
			box: 7,
		});
		assert.equal(problems.length, 1);
		assert.match(problems[0].message, /1~5/);
		assert.deepEqual(problems[0].allowed, ["1", "2", "3", "4", "5"]);
	});

	it("type이 스키마와 다르면 잡습니다", () => {
		const problems = valueProblems(SCHEMAS.task, { type: "tsak", status: "next" });
		assert.equal(problems[0].key, "type");
	});

	it("날짜 형식을 봅니다", () => {
		assert.equal(valueProblems(SCHEMAS.task, { type: "task", status: "done", completed: "2026-09-21" }).length, 0);
		assert.equal(valueProblems(SCHEMAS.task, { type: "task", status: "done", completed: "어제" }).length, 1);
	});

	it("단일 링크 필드에 리스트가 들어오면 잡습니다", () => {
		const problems = valueProblems(SCHEMAS.task, {
			type: "task",
			status: "next",
			project: ["[[A]]", "[[B]]"],
		});
		assert.equal(problems[0].key, "project");
	});

	it("빈 값은 값 범위 검사 대상이 아닙니다", () => {
		assert.deepEqual(valueProblems(SCHEMAS.task, { type: "task", status: "next", due: null }), []);
	});
});

describe("missingKeys / emptyValueFor (C19)", () => {
	it("스키마에 있는데 없는 키를 셉니다", () => {
		const keys = missingKeys(SCHEMAS.task, { type: "task", status: "next" });
		assert.deepEqual(keys, ["project", "area", "scheduled", "due", "waiting_on", "completed"]);
	});

	it("값이 비어 있어도 키가 있으면 누락이 아닙니다 (멱등)", () => {
		const fm = { type: "task", status: "next", project: null, area: null, scheduled: null, due: null, waiting_on: null, completed: null };
		assert.deepEqual(missingKeys(SCHEMAS.task, fm), []);
	});

	it("빈 값은 종류에 따라 다릅니다", () => {
		const fields = Object.fromEntries(SCHEMAS.zettel.fields.map((f) => [f.key, f]));
		assert.equal(emptyValueFor(fields.type), "zettel");
		assert.equal(emptyValueFor(fields.recall), false);
		assert.deepEqual(emptyValueFor(fields.sources), []);
		assert.equal(emptyValueFor(fields.last_reviewed), null);
	});
});
