import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "../src/config";
import { checkFolder, checkNote, groupByRule, type NoteFacts } from "../src/lint";
const settings = structuredClone(DEFAULT_SETTINGS);
function note(overrides: Partial<NoteFacts> = {}): NoteFacts {
	return { path: "4_Transform/Tasks/할 일.md", basename: "할 일", folder: "4_Transform/Tasks", type: "task", fm: { type: "task", status: "next" }, archived: false, container: null, links: [], ...overrides };
}
it("Tasks 폴더의 Task와 방 노트는 위반이 없다", () => {
	assert.deepEqual(checkNote(note(), settings), []);
	assert.deepEqual(checkNote(note({ type: "room", fm: { type: "room" } }), settings), []);
});
it("Project는 Projects 바로 아래에 두고 접두사와 컨테이너를 요구하지 않는다", () => {
	assert.deepEqual(checkNote(note({ type: "project", basename: "출시", folder: settings.folders.projects, fm: { type: "project", status: "active", done_criteria: "출시 완료" } }), settings), []);
});
it("Output과 Resource는 지정된 유형 폴더로 이동을 제안한다", () => {
	for (const [type, status, folder] of [["output", "draft", settings.folders.outputs], ["resource", "reading", settings.folders.resources]]) {
		const violations = checkNote(note({ type, fm: { type, status } }), settings);
		assert.equal(violations.length, 1);
		assert.equal(violations[0].fix.folder, folder);
	}
});
it("옛 컨테이너 안 Zettel은 Zettels로 이동한다", () => {
	const result = checkNote(note({ type: "zettel", folder: "1_Arrange/Projects/출시", fm: { type: "zettel", maturity: "seed", recall: false } }), settings);
	assert.equal(result[0].fix.folder, settings.folders.zettels);
	assert.equal(result[0].rule, "home");
});
it("active Project의 done_criteria가 필수이며 planned는 비어 있어도 된다", () => {
	const facts = note({ type: "project", folder: settings.folders.projects, fm: { type: "project", status: "active" } });
	assert.deepEqual(checkNote(facts, settings)[0].fix.keys, ["done_criteria"]);
	assert.deepEqual(checkNote({ ...facts, fm: { ...facts.fm, status: "planned" } }, settings), []);
});
it("보관된 노트에는 거처를 강제하지 않는다", () => {
	assert.deepEqual(checkNote(note({ folder: "archive", archived: true }), settings), []);
});
it("깨진 링크와 보관 부모를 가리키는 열린 Task를 점검한다", () => {
	const links = [{ field: "project", target: "출시", resolved: true, targetArchived: true }];
	assert.equal(checkNote(note({ links }), settings)[0].rule, "relation");
	assert.deepEqual(checkNote(note({ links, fm: { type: "task", status: "dropped" } }), settings), []);
	assert.equal(checkNote(note({ links: [{ ...links[0], resolved: false }] }), settings)[0].rule, "relation");
});
it("허용되지 않는 상태와 링크 금지 문자를 점검한다", () => {
	const result = checkNote(note({ basename: "C#", fm: { type: "task", status: "scheduled" } }), settings);
	assert.deepEqual(groupByRule(result).map(group => group.rule), ["filename", "value-range"]);
	assert.equal(result[0].fix.name, "C");
});
it("하위 폴더를 프로젝트 컨테이너로 간주하지 않는다", () => {
	assert.deepEqual(checkFolder({ path: "1_Arrange/Projects/분류", name: "분류", archived: false, isContainer: true, hasHub: false, subfolders: ["자료"] }, settings), []);
});
