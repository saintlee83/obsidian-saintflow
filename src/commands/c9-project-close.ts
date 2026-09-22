import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { todayISO } from "../dates";
import { t } from "../i18n";
import { toLink } from "../links";
import { closeReviewName, createTypedNote, homeFolderFor } from "../relations";
import { typeOf } from "../vault-io";

export async function projectCloseCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const project = target ?? core.app.workspace.getActiveFile();
	if (!project || typeOf(core.app, project) !== "project") {
		new Notice(t("프로젝트 허브에서 실행하세요."));
		return;
	}
	const name = closeReviewName(core.settings, project.basename);
	const folder = homeFolderFor(core.settings, "closing");
	const existing = core.app.vault.getAbstractFileByPath(`${folder}/${name}.md`);
	if (existing instanceof TFile) {
		await core.app.workspace.getLeaf(false).openFile(existing);
		return;
	}
	const review = await createTypedNote(core, "closing", {
		title: name, folder, overrides: { project: [toLink(project.basename)], date: todayISO() },
	});
	if (review) await core.app.workspace.getLeaf(false).openFile(review);
}
