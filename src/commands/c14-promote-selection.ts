// C14 선택 영역 승격: W- 노트에서 고른 텍스트를 Zettel이나 Source로 옮기고 자리에 링크를 남깁니다.
// 복사가 아니라 이동입니다. 텍스트는 사용자가 쓴 것이므로 내용을 바꾸지 않고 그대로 옮깁니다.

import { Editor, Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { toLink } from "../links";
import { createTypedNote, inheritedRelations } from "../relations";
import { SECTION, replaceSection } from "../sections";
import { pickOne, promptRequired } from "../ui/modals";
import { frontMatterOf, typeOf } from "../vault-io";

type Target = "zettel" | "source";

export function canPromoteSelection(
	app: SaintFlowCore["app"],
	file: TFile | null,
	editor: Editor
): boolean {
	if (!file || typeOf(app, file) !== "working") return false;
	return editor.getSelection().trim() !== "";
}

export async function promoteSelectionCommand(
	core: SaintFlowCore,
	editor: Editor,
	working: TFile
): Promise<void> {
	const selection = editor.getSelection();
	if (selection.trim() === "") {
		new Notice("승격할 텍스트를 먼저 고르세요.");
		return;
	}

	const target = await pickOne<Target>(
		core.app,
		[
			{ value: "zettel", label: "Zettel", description: "고른 텍스트가 생각 섹션으로 갑니다. seed로 만듭니다." },
			{ value: "source", label: "Source", description: "고른 텍스트가 핵심 내용 섹션으로 갑니다." },
		],
		"무엇으로 승격할까요?"
	);
	if (!target) return;

	const title = await promptRequired(
		core.app,
		{
			title: target === "zettel" ? "Zettel 제목" : "Source 제목",
			description:
				target === "zettel"
					? "주장 문장으로 씁니다. 접두사는 붙이지 않습니다."
					: "원제목을 씁니다. S- 접두사는 자동으로 붙습니다.",
			value: firstLine(selection),
			cta: "승격",
		},
		"제목이 비어 있어 승격하지 않았습니다."
	);
	if (!title) return;

	const parentFm = frontMatterOf(core.app, working);
	const inherited = inheritedRelations(parentFm, target);
	const section = target === "zettel" ? SECTION.thought : SECTION.summary;
	const text = selection.trim();

	const created = await createTypedNote(core, target, {
		title,
		overrides:
			target === "zettel" ? { status: "seed", recall: false, box: 1, ...inherited } : { ...inherited },
		bodyEdit: (body) => replaceSection(body, section, text),
	});
	if (!created) return;

	// 이동입니다. 고른 텍스트를 지우고 그 자리에 링크만 남깁니다.
	editor.replaceSelection(toLink(created.basename));

	core.index.invalidate();
	await core.app.workspace.getLeaf(false).openFile(created);
	new Notice(`승격: ${created.basename}`);
}

function firstLine(text: string): string {
	return (text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "").trim().replace(/^#+\s*/, "");
}
