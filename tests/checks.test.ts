import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_RECALL_INTERVALS,
	evergreenBlockers,
	gradeBox,
	intervalForBox,
	isDueToday,
	isOldSeed,
	isOrphanZettel,
	isOutputWithoutUses,
	isStalled,
	nextReview,
	recallLogLine,
} from "../src/checks";

describe("intervalForBox (설계안 2.3)", () => {
	it("box 1~5는 1, 3, 7, 14, 30일", () => {
		assert.deepEqual([1, 2, 3, 4, 5].map((b) => intervalForBox(b)), DEFAULT_RECALL_INTERVALS);
	});

	it("box가 비어 있으면 1일", () => {
		assert.equal(intervalForBox(null), 1);
		assert.equal(intervalForBox(undefined), 1);
		assert.equal(intervalForBox("2"), 1);
		assert.equal(intervalForBox(0), 1);
	});

	it("5 이상이면 30일", () => {
		assert.equal(intervalForBox(5), 30);
		assert.equal(intervalForBox(9), 30);
	});

	it("설정한 간격을 씁니다", () => {
		assert.equal(intervalForBox(2, [2, 4, 8]), 4);
		assert.equal(intervalForBox(99, [2, 4, 8]), 8);
	});
});

describe("nextReview (설계안 2.3)", () => {
	it("last_reviewed가 없으면 today", () => {
		assert.equal(nextReview({ box: 3 }, "2026-09-21"), "2026-09-21");
		assert.equal(nextReview({ box: 3, last_reviewed: null }, "2026-09-21"), "2026-09-21");
	});

	it("last_reviewed + 간격(box)", () => {
		assert.equal(nextReview({ box: 2, last_reviewed: "2026-09-18" }, "2026-09-21"), "2026-09-21");
		assert.equal(nextReview({ box: 3, last_reviewed: "2026-09-21" }, "2026-09-21"), "2026-09-28");
		assert.equal(nextReview({ box: 5, last_reviewed: "2026-09-21" }, "2026-09-21"), "2026-10-21");
	});

	it("월과 해를 넘깁니다", () => {
		assert.equal(nextReview({ box: 5, last_reviewed: "2026-12-20" }, "2026-12-20"), "2027-01-19");
	});
});

describe("isDueToday (설계안 2.3)", () => {
	const today = "2026-09-21";

	it("recall이 아니면 대상이 아닙니다", () => {
		assert.equal(isDueToday({ recall: false, box: 1, last_reviewed: "2020-01-01" }, today), false);
		assert.equal(isDueToday({ box: 1, last_reviewed: "2020-01-01" }, today), false);
	});

	it("보관된 노트는 대상이 아닙니다", () => {
		assert.equal(
			isDueToday({ recall: true, box: 1, last_reviewed: "2020-01-01", archived: true }, today),
			false
		);
	});

	it("box 2, 3일 전 복습이면 오늘입니다 (픽스처 '복습 대상')", () => {
		assert.equal(isDueToday({ recall: true, box: 2, last_reviewed: "2026-09-18" }, today), true);
	});

	it("아직 이르면 대상이 아닙니다", () => {
		assert.equal(isDueToday({ recall: true, box: 3, last_reviewed: "2026-09-20" }, today), false);
	});

	it("한 번도 복습하지 않았으면 오늘입니다", () => {
		assert.equal(isDueToday({ recall: true, box: 1 }, today), true);
	});
});

describe("gradeBox (설계안 1.7)", () => {
	it("pass는 한 칸 올리고 최대 5", () => {
		assert.equal(gradeBox(2, "pass"), 3);
		assert.equal(gradeBox(5, "pass"), 5);
		assert.equal(gradeBox(null, "pass"), 2);
	});

	it("fail은 1로 되돌립니다", () => {
		assert.equal(gradeBox(5, "fail"), 1);
		assert.equal(gradeBox(null, "fail"), 1);
	});
});

describe("recallLogLine (설계안 1.7)", () => {
	it("틀린 점이 있으면 em dash로 잇습니다", () => {
		assert.equal(recallLogLine("2026-09-21", "fail", "반례를 못 씀"), "- 2026-09-21 fail — 반례를 못 씀");
	});

	it("비어 있으면 판정만 남깁니다", () => {
		assert.equal(recallLogLine("2026-09-21", "pass", "  "), "- 2026-09-21 pass");
	});
});

describe("C8 수용 테스트 (설계안 6.3)", () => {
	it("box 2에서 pass하면 box 3, 다음 복습은 오늘 + 7일", () => {
		const today = "2026-09-21";
		const box = gradeBox(2, "pass");
		assert.equal(box, 3);
		assert.equal(nextReview({ box, last_reviewed: today }, today), "2026-09-28");
	});
});

describe("isStalled (설계안 2.3)", () => {
	it("active인데 next Task가 0개면 멈춘 프로젝트", () => {
		assert.equal(isStalled({ status: "active" }, 0), true);
		assert.equal(isStalled({ status: "active" }, 1), false);
	});

	it("active가 아니면 멈춤으로 보지 않습니다", () => {
		assert.equal(isStalled({ status: "on-hold" }, 0), false);
		assert.equal(isStalled({ status: "done" }, 0), false);
	});

	it("보관된 프로젝트는 제외합니다", () => {
		assert.equal(isStalled({ status: "active", archived: true }, 0), false);
	});
});

describe("isOrphanZettel / isOldSeed / isOutputWithoutUses", () => {
	it("나가는 링크와 들어오는 링크가 모두 없을 때만 고립", () => {
		assert.equal(isOrphanZettel(0, 0), true);
		assert.equal(isOrphanZettel(2, 0), false);
		assert.equal(isOrphanZettel(0, 1), false);
	});

	it("seed가 임계일을 넘겨야 오래된 seed", () => {
		assert.equal(isOldSeed("seed", "2026-09-01", "2026-09-21", 14), true);
		assert.equal(isOldSeed("seed", "2026-09-10", "2026-09-21", 14), false);
		assert.equal(isOldSeed("evergreen", "2020-01-01", "2026-09-21", 14), false);
	});

	it("uses가 비면 결과물 점검 대상", () => {
		assert.equal(isOutputWithoutUses(undefined), true);
		assert.equal(isOutputWithoutUses([]), true);
		assert.equal(isOutputWithoutUses([""]), true);
		assert.equal(isOutputWithoutUses(["[[어떤 Zettel]]"]), false);
		assert.equal(isOutputWithoutUses("[[어떤 Zettel]]"), false);
	});
});

describe("evergreenBlockers (설계안 1.6, C7)", () => {
	it("조건을 모두 채우면 통과", () => {
		assert.deepEqual(
			evergreenBlockers({
				thought: "내 말로 쓴 주장",
				links: [
					{ target: "A", reason: "전제가 됨" },
					{ target: "B", reason: "반례" },
				],
			}),
			[]
		);
	});

	it("연결이 모자라면 거부 (픽스처 '고립된 주장')", () => {
		const blockers = evergreenBlockers({ thought: "", links: [] });
		assert.equal(blockers.length, 2);
		assert.match(blockers[0], /생각 섹션/);
		assert.match(blockers[1], /2개 이상/);
	});

	it("이유 없는 연결을 짚어 줍니다", () => {
		const blockers = evergreenBlockers({
			thought: "주장",
			links: [
				{ target: "A", reason: "" },
				{ target: "B", reason: "이유" },
			],
		});
		assert.deepEqual(blockers, ["연결 이유가 없습니다: A"]);
	});
});
