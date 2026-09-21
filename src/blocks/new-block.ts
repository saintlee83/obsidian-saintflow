// C11 생성 버튼 블록. 읽기 모드와 Live Preview 모두에서 렌더링됩니다.
//
// ```saintflow-new
// types: task, working, output, zettel, source
// ```
//
// 부모 유형은 블록이 놓인 노트의 type으로 판정합니다(설계안 5.3).

import { MarkdownPostProcessorContext, Notice, TFile } from "obsidian";
import { createInContextCommand } from "../commands/c3-create-in-context";
import type { SaintFlowCore } from "../core";
import { CreatableType, TYPE_LABEL } from "../model";
import { typeOf } from "../vault-io";
import { parseBlock, validateTypes } from "./block-syntax";

const SHORT_LABEL: Partial<Record<CreatableType, string>> = {
	task: "Task",
	project: "Project",
	area: "Area",
	working: "Working",
	output: "Output",
	source: "Source",
	zettel: "Zettel",
	map: "Map",
	"review-close": "종료 검토",
};

export function registerNewBlock(
	core: SaintFlowCore,
	register: (
		language: string,
		handler: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void
	) => void
): void {
	register("saintflow-new", (source, el, ctx) => {
		el.empty();
		const parent = core.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(parent instanceof TFile)) {
			el.createDiv({ cls: "saintflow-block-error", text: "이 블록이 놓인 노트를 찾을 수 없습니다." });
			return;
		}

		const parsed = parseBlock(source);
		const parentType = typeOf(core.app, parent);
		const { allowed, errors } = validateTypes(parentType, parsed.types);
		const allErrors = [...parsed.errors, ...errors];

		if (allowed.length > 0) {
			const row = el.createDiv({ cls: "saintflow-new-block" });
			for (const type of allowed) {
				const btn = row.createEl("button", { text: `+ ${SHORT_LABEL[type] ?? TYPE_LABEL[type]}` });
				btn.addEventListener("click", async () => {
					try {
						await createInContextCommand(core, { parent, childType: type });
					} catch (err) {
						console.error("[SaintFlow]", err);
						new Notice(`만들지 못했습니다: ${err instanceof Error ? err.message : String(err)}`);
					}
				});
			}
		}

		for (const message of allErrors) {
			el.createDiv({ cls: "saintflow-block-error", text: message });
		}
	});
}

export { parseBlock, validateTypes };
