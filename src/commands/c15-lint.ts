// C15 규칙 검사의 화면. 위반을 규칙별로 묶어 보여주고 항목마다 열기와 빠른 수정을 붙입니다.

import { App, Modal, Notice, Setting, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { RULE_LABEL, Violation, groupByRule } from "../lint";
import { applyFix, lintFile, lintVault } from "../lint-vault";
import { pickOne } from "../ui/modals";

export async function lintCommand(core: SaintFlowCore): Promise<void> {
	const violations = lintVault(core);
	new LintModal(core, violations).open();
}

/** 이동·이름 변경 이벤트용. 그 파일의 위반만 알립니다. */
export function lintFileAndNotify(core: SaintFlowCore, file: TFile): void {
	const violations = lintFile(core, file);
	if (violations.length === 0) return;
	const lines = violations.slice(0, 3).map((v) => `· [${RULE_LABEL[v.rule]}] ${v.message}`);
	if (violations.length > 3) lines.push(`외 ${violations.length - 3}건`);
	new Notice([`${file.basename}`, ...lines].join("\n"), 8000);
}

/** 시작 시 검사. 화면을 가리지 않도록 개수만 알리고 명령으로 열게 합니다. */
export function lintOnStartup(core: SaintFlowCore): void {
	const violations = lintVault(core);
	if (violations.length === 0) return;
	new Notice(`SaintFlow 규칙 위반 ${violations.length}건. "C15 규칙 검사"로 확인하세요.`, 8000);
}

export class LintModal extends Modal {
	private core: SaintFlowCore;
	private violations: Violation[];

	constructor(core: SaintFlowCore, violations: Violation[]) {
		super(core.app);
		this.core = core;
		this.violations = violations;
	}

	onOpen(): void {
		this.render();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle(`규칙 검사 · 위반 ${this.violations.length}건`);

		if (this.violations.length === 0) {
			contentEl.createDiv({ cls: "saintflow-form-note", text: "위반이 없습니다." });
			new Setting(contentEl).addButton((btn) =>
				btn.setButtonText("닫기").setCta().onClick(() => this.close())
			);
			return;
		}

		const list = contentEl.createDiv({ cls: "saintflow-lint-list" });
		for (const group of groupByRule(this.violations)) {
			list.createEl("h4", { text: `${RULE_LABEL[group.rule]} (${group.items.length})` });
			for (const violation of group.items) {
				this.renderRow(list, violation);
			}
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText("다시 검사").onClick(() => {
					this.violations = lintVault(this.core);
					this.render();
				})
			)
			.addButton((btn) => btn.setButtonText("닫기").setCta().onClick(() => this.close()));
	}

	private renderRow(container: HTMLElement, violation: Violation): void {
		const setting = new Setting(container).setName(violation.name).setDesc(violation.message);
		setting.settingEl.addClass("saintflow-lint-row");

		setting.addExtraButton((btn) =>
			btn
				.setIcon("file-text")
				.setTooltip("파일 열기")
				.onClick(async () => {
					await this.openPath(violation.path);
					this.close();
				})
		);

		if (violation.fix.kind === "none") {
			setting.controlEl.createSpan({ cls: "saintflow-link-value", text: violation.fix.label });
			return;
		}

		setting.addButton((btn) =>
			btn.setButtonText(violation.fix.label).onClick(async () => {
				const result = await applyFix(this.core, violation, {
					pickValue: (key, values) =>
						pickOne(
							this.app,
							values.map((v) => ({ value: v, label: v })),
							`${key} 값`
						),
					openFile: async (file) => {
						await this.app.workspace.getLeaf(false).openFile(file);
					},
				});
				new Notice(result.message);
				if (result.applied) {
					this.violations = lintVault(this.core);
					this.render();
				}
			})
		);
	}

	private async openPath(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) await this.app.workspace.getLeaf(false).openFile(file);
		else new Notice(`폴더입니다: ${path}`);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function openLintModal(app: App, core: SaintFlowCore, violations: Violation[]): void {
	void app;
	new LintModal(core, violations).open();
}
