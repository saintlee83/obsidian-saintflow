// C17 시작 시 Home 열기. 모바일에서도 같은 경로를 씁니다.

import { Notice, TFile, normalizePath } from "obsidian";
import type { SaintFlowCore } from "../core";

export function homeFile(core: SaintFlowCore): TFile | null {
	const path = normalizePath(core.settings.homePath);
	const withExt = path.endsWith(".md") ? path : `${path}.md`;
	const file = core.app.vault.getAbstractFileByPath(withExt);
	return file instanceof TFile ? file : null;
}

export async function openHomeCommand(core: SaintFlowCore, quiet = false): Promise<void> {
	const file = homeFile(core);
	if (!file) {
		if (!quiet) new Notice(`Home 노트를 찾지 못했습니다: ${core.settings.homePath}`);
		return;
	}
	await core.app.workspace.getLeaf(false).openFile(file);
}

/**
 * 워크스페이스가 준비된 뒤에 엽니다.
 * 이미 다른 파일이 열려 있어도 Home을 활성 탭으로 만듭니다(설계안 C17 검증 기준).
 */
export function openHomeOnStartup(core: SaintFlowCore): void {
	if (!core.settings.openHomeOnStart) return;
	core.app.workspace.onLayoutReady(() => {
		void openHomeCommand(core, true);
	});
}
