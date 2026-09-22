import { Notice, TFile, TFolder } from "obsidian";
import type { SaintFlowCore } from "../core";
import { t } from "../i18n";
import { linkTargets } from "../links";
import { frontMatterOf, resolveLink, typeOf } from "../vault-io";

export function hubOf(_core: SaintFlowCore, folder: TFolder): TFile | null {
	return folder.children.find((file): file is TFile => file instanceof TFile && file.extension === "md" && file.basename === folder.name) ?? null;
}
export function isContainerFolder(core: SaintFlowCore, folder: TFolder): boolean { return hubOf(core, folder) !== null; }
export async function openHubCommand(core: SaintFlowCore, folder?: TFolder): Promise<void> {
	const active = core.app.workspace.getActiveFile();
	if (!folder && active) {
		const fm = frontMatterOf(core.app, active);
		for (const field of ["parent", "project", "area"]) {
			for (const name of linkTargets(fm[field])) {
				const parent = resolveLink(core.app, name, active.path);
				if (parent && parent.path !== active.path) {
					await core.app.workspace.getLeaf(false).openFile(parent);
					return;
				}
			}
		}
	}
	let current = folder ?? active?.parent;
	while (current) {
		const room = hubOf(core, current);
		if (room) { await core.app.workspace.getLeaf(false).openFile(room); return; }
		current = current.parent;
	}
	new Notice(t("연결된 부모나 방 노트가 없습니다."));
}
export function decorateHubs(core: SaintFlowCore): void {
	document.querySelectorAll<HTMLElement>(".nav-file-title[data-path]").forEach(el => {
		const file = core.app.vault.getAbstractFileByPath(el.getAttribute("data-path") ?? "");
		const enabled = core.settings.markHubsInExplorer && file instanceof TFile && ["room", "project", "area"].includes(typeOf(core.app, file) ?? "");
		el.toggleClass("saintflow-hub", enabled);
	});
}
