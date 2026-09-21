// C1 수집: 한 줄 입력 → 0_Sweep에 파일 생성. 중복이면 번호를 붙입니다.
// 2단계 안에 끝나야 하므로 유형도 속성도 묻지 않습니다(설계안 2.2: Inbox 항목은 스키마가 없습니다).

import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { sanitizeFileName } from "../naming";
import { promptText } from "../ui/modals";
import { createNote } from "../vault-io";

export async function captureCommand(core: SaintFlowCore, open = false): Promise<TFile | null> {
	const raw = await promptText(core.app, {
		title: "수집",
		description: "지금 신경 쓰이는 것을 한 줄로 적습니다. 무엇인지는 나중에 분류에서 정합니다.",
		placeholder: "회의 때 나온 아이디어",
		cta: "수집함에 넣기",
	});
	if (raw === null) return null;

	const text = raw.trim();
	if (text === "") {
		new Notice("내용이 비어 있습니다.");
		return null;
	}

	const name = sanitizeFileName(text);
	if (!name) {
		new Notice("파일명으로 쓸 수 있는 글자가 없습니다.");
		return null;
	}

	// 금지 문자를 지우면서 뜻이 바뀐 경우에만 원문을 본문에 남깁니다.
	const body = name === text ? "" : text + "\n";
	const file = await createNote(core.app, core.settings.folders.sweep, name, body);
	core.index.invalidate();

	if (open) await core.app.workspace.getLeaf(false).openFile(file);
	else new Notice(`수집함: ${file.basename}`);
	return file;
}
