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
import { t } from "../i18n";
import { CreatableType, typeLabel } from "../model";
import { typeOf } from "../vault-io";
import { parseBlock, validateTypes } from "./block-syntax";

/** 버튼에 쓰는 짧은 이름. 없으면 유형 라벨을 씁니다. */
function shortLabel(type: CreatableType): string {
	switch (type) {
		case "task":
			return "Task";
		case "project":
			return "Project";
		case "area":
			return "Area";
		case "working":
			return "Working";
		case "output":
			return "Output";
		case "resource":
			return "Resource";
		case "zettel":
			return "Zettel";
		case "map":
			return "Map";
		case "closing":
			return t("종료 검토");
		default:
			return typeLabel(type);
	}
}

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
			el.createDiv({ cls: "saintflow-block-error", text: t("이 블록이 놓인 노트를 찾을 수 없습니다.") });
			return;
		}

		const parsed = parseBlock(source);
		const parentType = typeOf(core.app, parent);
		const { allowed, errors } = validateTypes(parentType, parsed.types);
		const allErrors = [...parsed.errors, ...errors];

		if (allowed.length > 0) {
			const row = el.createDiv({ cls: "saintflow-new-block" });
			for (const type of allowed) {
				const btn = row.createEl("button", { text: `+ ${shortLabel(type)}` });
				btn.addEventListener("click", async () => {
					try {
						await createInContextCommand(core, { parent, childType: type });
					} catch (err) {
						console.error("[SaintFlow]", err);
						new Notice(t("만들지 못했습니다: {0}", err instanceof Error ? err.message : String(err)));
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
