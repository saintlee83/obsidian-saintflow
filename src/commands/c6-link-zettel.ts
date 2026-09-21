// C6 Zettel 연결 추가: 연결 섹션에 `- [[대상]] — 이유` 한 줄을 넣습니다.
// 이유가 비면 삽입하지 않습니다(설계안 C6 검증 기준).

import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { addConnection } from "../relations";
import { parseConnections } from "../sections";
import { pickFile, promptRequired } from "../ui/modals";
import { readBody, typeOf } from "../vault-io";

export async function linkZettelCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const file = target ?? core.app.workspace.getActiveFile();
	if (!file || typeOf(core.app, file) !== "zettel") {
		new Notice("Zettel에서만 쓸 수 있습니다.");
		return;
	}

	const body = await readBody(core.app, file);
	const existing = new Set(parseConnections(body).map((c) => c.target));

	const candidates = core.index
		.allOfType("zettel")
		.filter((f) => f.path !== file.path && !existing.has(f.basename));
	if (candidates.length === 0) {
		new Notice("연결할 수 있는 다른 Zettel이 없습니다.");
		return;
	}

	const picked = await pickFile(core.app, candidates, "연결할 Zettel");
	if (!picked) return;

	const reason = await promptRequired(
		core.app,
		{
			title: "연결 이유",
			description: `"${file.basename}"과(와) "${picked.basename}"을(를) 잇는 이유를 한 줄로 씁니다.`,
			cta: "연결",
		},
		"이유가 비어 있어 연결하지 않았습니다."
	);
	if (!reason) return;

	await addConnection(core, file, picked.basename, reason);
	new Notice(`연결: ${picked.basename}`);
}
