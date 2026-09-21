import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS, SaintFlowSettings } from "../src/config";
import { FolderFacts, NoteFacts, RuleId, checkFolder, checkNote, groupByRule, ruleLabel } from "../src/lint";
import { setLocale } from "../src/i18n";

// 이 테스트는 원문(한국어) 문구를 그대로 검사합니다.
setLocale("ko");

const settings: SaintFlowSettings = structuredClone(DEFAULT_SETTINGS);

function note(overrides: Partial<NoteFacts>): NoteFacts {
	return {
		path: "4_Transform/할 일하기.md",
		basename: "할 일하기",
		folder: "4_Transform",
		type: "task",
		fm: { type: "task", status: "next" },
		archived: false,
		container: null,
		links: [],
		...overrides,
	};
}

function rules(facts: NoteFacts): RuleId[] {
	return checkNote(facts, settings).map((v) => v.rule);
}

describe("checkNote — 깨끗한 노트", () => {
	it("규칙에 맞으면 위반이 없습니다", () => {
		assert.deepEqual(checkNote(note({}), settings), []);
	});

	it("type이 없으면 검사하지 않습니다", () => {
		assert.deepEqual(checkNote(note({ type: null, fm: {} }), settings), []);
	});

	it("보관된 노트는 거처와 파일명을 따지지 않습니다", () => {
		const facts = note({
			path: "1_Arrange/Archive/Tasks/할 일하기.md",
			folder: "1_Arrange/Archive/Tasks",
			archived: true,
		});
		assert.deepEqual(checkNote(facts, settings), []);
	});
});

describe("유형과 거처", () => {
	it("Task가 4_Transform 밖에 있으면 이동을 제안합니다", () => {
		const violations = checkNote(note({ path: "0_Sweep/할 일하기.md", folder: "0_Sweep" }), settings);
		assert.deepEqual(violations.map((v) => v.rule), ["home"]);
		assert.equal(violations[0].fix.kind, "move");
		assert.equal(violations[0].fix.folder, "4_Transform");
	});

	it("프로젝트 허브가 컨테이너 없이 Projects에 바로 있으면 잡습니다", () => {
		const violations = checkNote(
			note({
				path: "1_Arrange/Projects/P-정상.md",
				basename: "P-정상",
				folder: "1_Arrange/Projects",
				type: "project",
				fm: { type: "project", status: "active", outcome: "끝" },
			}),
			settings
		);
		assert.deepEqual(violations.map((v) => v.rule), ["home"]);
		assert.equal(violations[0].fix.folder, "1_Arrange/Projects/P-정상");
	});

	it("컨테이너 안에 있는 프로젝트 허브는 통과합니다", () => {
		const facts = note({
			path: "1_Arrange/Projects/P-정상/P-정상.md",
			basename: "P-정상",
			folder: "1_Arrange/Projects/P-정상",
			type: "project",
			fm: { type: "project", status: "active", outcome: "끝" },
			container: "1_Arrange/Projects/P-정상",
		});
		assert.deepEqual(checkNote(facts, settings), []);
	});

	it("Working이 컨테이너 밖이면 잡습니다", () => {
		const violations = checkNote(
			note({
				path: "0_Sweep/W-메모.md",
				basename: "W-메모",
				folder: "0_Sweep",
				type: "working",
				fm: { type: "working" },
			}),
			settings
		);
		assert.deepEqual(violations.map((v) => v.rule), ["home"]);
	});
});

describe("컨테이너 내용", () => {
	it("컨테이너 안의 Zettel은 거처 규칙 대신 컨테이너 규칙으로 잡습니다", () => {
		const violations = checkNote(
			note({
				path: "1_Arrange/Projects/P-정상/어떤 주장.md",
				basename: "어떤 주장",
				folder: "1_Arrange/Projects/P-정상",
				type: "zettel",
				fm: { type: "zettel", status: "seed", recall: false },
				container: "1_Arrange/Projects/P-정상",
			}),
			settings
		);
		assert.deepEqual(violations.map((v) => v.rule), ["container-contents"]);
		assert.equal(violations[0].fix.folder, "2_Internalize/Zettels");
	});
});

describe("허브 이름", () => {
	it("컨테이너 폴더 이름과 다르면 이름 변경을 제안합니다", () => {
		const violations = checkNote(
			note({
				path: "1_Arrange/Projects/P-정상/P-오타.md",
				basename: "P-오타",
				folder: "1_Arrange/Projects/P-정상",
				type: "project",
				fm: { type: "project", status: "active", outcome: "끝" },
				container: "1_Arrange/Projects/P-정상",
			}),
			settings
		);
		assert.deepEqual(violations.map((v) => v.rule), ["hub-name"]);
		assert.equal(violations[0].fix.name, "P-정상");
	});
});

describe("파일명", () => {
	it("접두사가 빠지면 제안합니다", () => {
		const violations = checkNote(
			note({
				path: "1_Arrange/Resources/테스트.md",
				basename: "테스트",
				folder: "1_Arrange/Resources",
				type: "source",
				fm: { type: "source" },
			}),
			settings
		);
		assert.deepEqual(violations.map((v) => v.rule), ["filename"]);
		assert.equal(violations[0].fix.name, "S-테스트");
	});

	it("링크를 깨뜨리는 문자를 잡습니다", () => {
		const violations = checkNote(note({ basename: "C# 정리하기", path: "4_Transform/C# 정리하기.md" }), settings);
		assert.deepEqual(violations.map((v) => v.rule), ["filename"]);
		assert.equal(violations[0].fix.name, "C Sharp 정리하기");
	});
});

describe("필수 속성과 값 범위", () => {
	it("빈 필수 속성은 속성 추가 수정을 붙입니다", () => {
		const violations = checkNote(
			note({
				path: "1_Arrange/Projects/P-정상/P-정상.md",
				basename: "P-정상",
				folder: "1_Arrange/Projects/P-정상",
				type: "project",
				fm: { type: "project", status: "active" },
				container: "1_Arrange/Projects/P-정상",
			}),
			settings
		);
		assert.deepEqual(violations.map((v) => v.rule), ["required"]);
		assert.equal(violations[0].fix.kind, "add-props");
		assert.deepEqual(violations[0].fix.keys, ["outcome"]);
	});

	it("허용값 밖의 status에는 값 선택을 붙입니다", () => {
		const violations = checkNote(note({ fm: { type: "task", status: "진행중" } }), settings);
		assert.deepEqual(violations.map((v) => v.rule), ["value-range"]);
		assert.equal(violations[0].fix.kind, "set-value");
		assert.equal(violations[0].fix.key, "status");
	});
});

describe("관계 무결성", () => {
	it("해석되지 않는 링크를 잡습니다", () => {
		const violations = checkNote(
			note({ links: [{ field: "project", target: "없는 프로젝트", resolved: false, targetArchived: false }] }),
			settings
		);
		assert.deepEqual(violations.map((v) => v.rule), ["relation"]);
	});

	it("보관된 프로젝트를 가리키는 활성 Task를 잡습니다", () => {
		const violations = checkNote(
			note({ links: [{ field: "project", target: "P-끝난것", resolved: true, targetArchived: true }] }),
			settings
		);
		assert.deepEqual(violations.map((v) => v.rule), ["relation"]);
	});

	it("done Task는 보관된 프로젝트를 가리켜도 괜찮습니다", () => {
		const facts = note({
			fm: { type: "task", status: "done", completed: "2026-09-01" },
			links: [{ field: "project", target: "P-끝난것", resolved: true, targetArchived: true }],
		});
		assert.deepEqual(rules(facts), []);
	});
});

describe("checkFolder", () => {
	function folder(overrides: Partial<FolderFacts>): FolderFacts {
		return {
			path: "1_Arrange/Projects/P-정상",
			name: "P-정상",
			archived: false,
			isContainer: true,
			hasHub: true,
			subfolders: [],
			...overrides,
		};
	}

	it("허브가 없으면 잡습니다", () => {
		const violations = checkFolder(folder({ hasHub: false }), settings);
		assert.deepEqual(violations.map((v) => v.rule), ["hub-name"]);
		assert.equal(violations[0].fix.kind, "none");
	});

	it("_files 말고 다른 하위 폴더가 있으면 보고만 합니다", () => {
		const violations = checkFolder(folder({ subfolders: ["초안"] }), settings);
		assert.deepEqual(violations.map((v) => v.rule), ["folder-depth"]);
		assert.equal(violations[0].fix.kind, "none");
	});

	it("_files는 허용합니다", () => {
		assert.deepEqual(checkFolder(folder({}), settings), []);
	});

	it("컨테이너가 아니면 검사하지 않습니다", () => {
		assert.deepEqual(checkFolder(folder({ isContainer: false, hasHub: false }), settings), []);
	});
});

describe("groupByRule", () => {
	it("규칙 순서를 고정하고 빈 규칙은 뺍니다", () => {
		const violations = [
			...checkNote(note({ fm: { type: "task", status: "진행중" } }), settings),
			...checkNote(note({ path: "0_Sweep/할 일하기.md", folder: "0_Sweep" }), settings),
		];
		const groups = groupByRule(violations);
		assert.deepEqual(groups.map((g) => g.rule), ["home", "value-range"]);
		assert.equal(ruleLabel(groups[0].rule), "유형과 거처");
	});
});
