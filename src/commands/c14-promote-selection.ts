// C14 선택 영역 승격: W- 노트에서 고른 텍스트를 Zettel이나 Resource로 옮기고 자리에 링크를 남깁니다.
// 복사가 아니라 이동입니다. 텍스트는 사용자가 쓴 것이므로 내용을 바꾸지 않고 그대로 옮깁니다.

import { Editor, Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { t } from "../i18n";
import { toLink } from "../links";
import { createTypedNote, inheritedRelations } from "../relations";
import { SECTION, replaceSection } from "../sections";
import { pickOne, promptRequired } from "../ui/modals";
import { frontMatterOf, typeOf } from "../vault-io";

type Target = "zettel" | "resource";

export function canPromoteSelection(
	app: SaintFlowCore["app"],
	file: TFile | null,
	editor: Editor
): boolean {
	if (!file || !["working", "project", "area"].includes(typeOf(app, file) ?? "")) return false;
	return editor.getSelection().trim() !== "";
}

export async function promoteSelectionCommand(
	core: SaintFlowCore,
	editor: Editor,
	working: TFile
): Promise<void> {
	const selection = editor.getSelection();
	if (selection.trim() === "") {
		new Notice(t("승격할 텍스트를 먼저 고르세요."));
		return;
	}

	const target = await pickOne<Target>(
		core.app,
		[
			{ value: "zettel", label: "Zettel", description: t("고른 텍스트가 생각 섹션으로 갑니다. seed로 만듭니다.") },
			{ value: "resource", label: "Resource", description: t("고른 텍스트가 요약 섹션으로 갑니다.") },
		],
		t("무엇으로 승격할까요?")
	);
	if (!target) return;

	const title = await promptRequired(
		core.app,
		{
			title: target === "zettel" ? t("Zettel 제목") : t("Resource 제목"),
			description:
				target === "zettel"
					? t("주장 문장으로 씁니다. 접두사는 붙이지 않습니다.")
					: t("자료의 제목을 씁니다."),
			value: firstLine(selection),
			cta: t("승격"),
		},
		t("제목이 비어 있어 승격하지 않았습니다.")
	);
	if (!title) return;

	const parentFm = frontMatterOf(core.app, working);
	const inherited = inheritedRelations(parentFm, target);
	if (parentFm.type === "project") inherited.project = [toLink(working.basename)];
	if (parentFm.type === "area") inherited.area = [toLink(working.basename)];
	const section = target === "zettel" ? SECTION.thought : SECTION.summary;
	const text = selection.trim();

	const created = await createTypedNote(core, target, {
		title,
		overrides:
			target === "zettel" ? { maturity: "seed", recall: false, box: 1, ...inherited } : { ...inherited },
		bodyEdit: (body) => replaceSection(body, section, text),
	});
	if (!created) return;

	// 이동입니다. 고른 텍스트를 지우고 그 자리에 링크만 남깁니다.
	editor.replaceSelection(toLink(created.basename));

	core.index.invalidate();
	await core.app.workspace.getLeaf(false).openFile(created);
	new Notice(t("승격: {0}", created.basename));
}

function firstLine(text: string): string {
	return (text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "").trim().replace(/^#+\s*/, "");
}
