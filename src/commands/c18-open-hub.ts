// C18 허브 열기: 컨테이너 안의 어느 파일에서든 한 번에 허브로 갑니다.
// 파일 탐색기에서 허브 노트를 구분 표시하는 일도 여기서 합니다.

import { Notice, TFile, TFolder } from "obsidian";
import type { SaintFlowCore } from "../core";
import { containerOf } from "../lint-vault";
import { joinPath } from "../naming";
import { newAreaCommand, newProjectCommand } from "./c4-new-container";
import { confirm } from "../ui/modals";

/** 이 파일이 속한 컨테이너 폴더. 없으면 null입니다. */
export function containerFolderFor(core: SaintFlowCore, file: TFile): TFolder | null {
	const path = containerOf(core.settings, file.path);
	if (!path) return null;
	const folder = core.app.vault.getAbstractFileByPath(path);
	return folder instanceof TFolder ? folder : null;
}

/** 폴더와 이름이 같은 허브 노트. */
export function hubOf(core: SaintFlowCore, folder: TFolder): TFile | null {
	const found = folder.children.find(
		(c): c is TFile => c instanceof TFile && c.extension === "md" && c.basename === folder.name
	);
	return found ?? null;
}

/** 컨테이너 루트(Projects, Areas) 바로 아래 폴더인지. */
export function isContainerFolder(core: SaintFlowCore, folder: TFolder): boolean {
	const parent = folder.parent?.path === "/" ? "" : (folder.parent?.path ?? "");
	return parent === core.settings.folders.projects || parent === core.settings.folders.areas;
}

export async function openHubCommand(core: SaintFlowCore, folder?: TFolder): Promise<void> {
	const target = folder ?? containerFromActiveFile(core);
	if (!target) {
		new Notice("컨테이너 안의 파일이 아닙니다.");
		return;
	}

	const hub = hubOf(core, target);
	if (hub) {
		await core.app.workspace.getLeaf(false).openFile(hub);
		return;
	}

	const make = await confirm(core.app, {
		title: "허브가 없습니다",
		message: `${target.name} 컨테이너에 같은 이름의 허브 노트가 없습니다. 지금 만들까요?`,
		cta: "만들기",
	});
	if (!make) return;

	const inProjects = (target.parent?.path ?? "") === core.settings.folders.projects;
	if (inProjects) await newProjectCommand(core);
	else await newAreaCommand(core);
}

function containerFromActiveFile(core: SaintFlowCore): TFolder | null {
	const file = core.app.workspace.getActiveFile();
	if (!file) return null;
	return containerFolderFor(core, file);
}

/**
 * 파일 탐색기의 허브 노트에 표시용 클래스를 붙입니다.
 * DOM을 직접 건드리므로 실패해도 조용히 넘어갑니다.
 */
export function decorateHubs(core: SaintFlowCore): void {
	const enabled = core.settings.markHubsInExplorer;
	const titles = document.querySelectorAll<HTMLElement>(".nav-file-title[data-path]");
	titles.forEach((el) => {
		const path = el.getAttribute("data-path");
		if (!path) return;
		const isHub = enabled && isHubPath(core, path);
		el.toggleClass("saintflow-hub", isHub);
	});
}

function isHubPath(core: SaintFlowCore, path: string): boolean {
	if (!path.endsWith(".md")) return false;
	const file = core.app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) return false;
	const parent = file.parent;
	if (!(parent instanceof TFolder)) return false;
	if (parent.name !== file.basename) return false;
	return isContainerFolder(core, parent) || underArchive(core, parent);
}

function underArchive(core: SaintFlowCore, folder: TFolder): boolean {
	const archive = core.settings.folders.archive;
	return folder.path.startsWith(joinPath(archive, "") + "/") || folder.path.startsWith(archive + "/");
}
