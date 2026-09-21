import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, diffDays, isoWeekName, normalizeISO, todayISO } from "../src/dates";

describe("todayISO / normalizeISO", () => {
	it("로컬 날짜를 씁니다", () => {
		assert.equal(todayISO(new Date(2026, 8, 21, 23, 30)), "2026-09-21");
		assert.equal(todayISO(new Date(2026, 0, 5, 0, 1)), "2026-01-05");
	});

	it("앞의 10자리만 받아들입니다", () => {
		assert.equal(normalizeISO("2026-09-21"), "2026-09-21");
		assert.equal(normalizeISO("2026-09-21T10:00:00"), "2026-09-21");
		assert.equal(normalizeISO(" 2026-09-21 "), "2026-09-21");
	});

	it("날짜가 아니면 null", () => {
		assert.equal(normalizeISO(""), null);
		assert.equal(normalizeISO("언젠가"), null);
		assert.equal(normalizeISO("2026-13-01"), null);
		assert.equal(normalizeISO(null), null);
	});
});

describe("addDays / diffDays", () => {
	it("월말과 연말을 넘깁니다", () => {
		assert.equal(addDays("2026-09-30", 1), "2026-10-01");
		assert.equal(addDays("2026-12-31", 1), "2027-01-01");
		assert.equal(addDays("2026-03-01", -1), "2026-02-28");
	});

	it("윤년을 셉니다", () => {
		assert.equal(addDays("2028-02-28", 1), "2028-02-29");
		assert.equal(diffDays("2028-02-28", "2028-03-01"), 2);
	});

	it("차이를 일수로 돌려줍니다", () => {
		assert.equal(diffDays("2026-09-01", "2026-09-21"), 20);
		assert.equal(diffDays("2026-09-21", "2026-09-21"), 0);
		assert.ok(Number.isNaN(diffDays("언젠가", "2026-09-21")));
	});
});

describe("isoWeekName (설계안 3.5 R-YYYY-Www)", () => {
	it("연중 주차", () => {
		assert.equal(isoWeekName("2026-09-21"), "2026-W39");
	});

	it("해를 걸친 주는 목요일이 속한 해를 씁니다", () => {
		assert.equal(isoWeekName("2027-01-01"), "2026-W53");
		assert.equal(isoWeekName("2026-01-01"), "2026-W01");
	});
});
