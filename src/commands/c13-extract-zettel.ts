// C13 Source에서 Zettel 추출: "추출할 생각"의 체크리스트 항목 하나를 seed Zettel로 옮깁니다.
// 본문은 쓰지 않습니다. 생각 섹션은 빈 채로 둡니다(규칙 6).

import { Editor, Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { toLink } from "../links";
import { createTypedNote, inheritedRelations } from "../relations";
import { SECTION, findSection } from "../sections";
import { confirm, promptRequired } from "../ui/modals";
import { frontMatterOf, typeOf } from "../vault-io";
import { t } from "../i18n";

/** 체크리스트 항목의 문구. 항목이 아니면 null입니다. */
export function parseChecklistItem(line: string): { indent: string; text: string } | null {
	const m = /^(\s*[-*]\s+\[[ xX]\]\s*)(.*)$/.exec(line ?? "");
	if (!m) return null;
	return { indent: m[1], text: m[2].trim() };
}

/** 커서가 "추출할 생각" 섹션 안에 있는지 봅니다. */
export function inExtractSection(body: string, line: number): boolean {
	const range = findSection(body, SECTION.extract);
	if (!range) return false;
	return line >= range.start && line < range.end;
}

export function canExtract(app: SaintFlowCore["app"], file: TFile | null, editor: Editor): boolean {
	if (!file || typeOf(app, file) !== "source") return false;
	const cursor = editor.getCursor();
	if (!parseChecklistItem(editor.getLine(cursor.line))) return false;
	return inExtractSection(editor.getValue(), cursor.line);
}

export async function extractZettelCommand(
	core: SaintFlowCore,
	editor: Editor,
	source: TFile
): Promise<void> {
	const cursor = editor.getCursor();
	const rawLine = editor.getLine(cursor.line);
	const item = parseChecklistItem(rawLine);
	if (!item) {
		new Notice(t("체크리스트 항목에 커서를 두고 실행하세요."));
		return;
	}
	if (item.text === "") {
		new Notice(t("항목이 비어 있습니다."));
		return;
	}

	const title = await promptRequired(
		core.app,
		{
			title: t("Zettel 제목"),
			description: t("주장 문장으로 씁니다. 항목 문구가 후보로 들어가 있습니다."),
			value: item.text,
			cta: t("만들기"),
		},
		t("제목이 비어 있어 만들지 않았습니다.")
	);
	if (!title) return;

	const sourceFm = frontMatterOf(core.app, source);
	const inherited = inheritedRelations(sourceFm, "zettel");
	let relations: Record<string, unknown> = {};
	if (Object.keys(inherited).length > 0) {
		const keys = Object.keys(inherited).join(", ");
		const take = await confirm(core.app, {
			title: t("속성 상속"),
			message: t("Source의 {0}을(를) 새 Zettel에도 넣을까요?", keys),
			cta: t("상속"),
		});
		if (take) relations = inherited;
	}

	const zettel = await createTypedNote(core, "zettel", {
		title,
		overrides: {
			status: "seed",
			recall: false,
			box: 1,
			sources: [toLink(source.basename)],
			...relations,
		},
	});
	if (!zettel) return;

	// 원래 항목을 체크하고 링크로 바꿉니다.
	const checked = item.indent.replace(/\[[ xX]\]/, "[x]");
	editor.setLine(cursor.line, `${checked}${toLink(zettel.basename)}`);

	core.index.invalidate();
	await core.app.workspace.getLeaf(false).openFile(zettel);
	new Notice(t("추출: {0}", zettel.basename));
}
