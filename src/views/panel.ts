// C16 SaintFlow 패널. 사이드바에 점검 값을 상시 표시합니다.
// 값은 C10과 같은 computeSnapshot으로 계산하므로 두 화면이 어긋나지 않습니다.

import { ItemView, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import type { SaintFlowCore } from "../core";
import { SnapshotGroup, computeSnapshot } from "../graph";
import { lintVault } from "../lint-vault";
import { t } from "../i18n";

export const SAINTFLOW_VIEW = "saintflow-panel";

/** 점검별로 열어 줄 Bases 보기입니다. 파일이 없으면 버튼을 숨깁니다. */
const BASE_VIEW: Record<string, { file: string; view: string }> = {
	inbox: { file: "Checks.base", view: "수집함" },
	waiting: { file: "Checks.base", view: "대기 중" },
	stalled: { file: "Projects.base", view: "멈춘 프로젝트" },
	orphan: { file: "Checks.base", view: "연결 없는 Zettel" },
	old_seed: { file: "Checks.base", view: "오래된 seed" },
	no_uses: { file: "Checks.base", view: "uses 없는 결과물" },
	due_today: { file: "Recall.base", view: "오늘 복습" },
};

export class SaintFlowPanel extends ItemView {
	private core: SaintFlowCore;
	private expanded = new Set<string>();
	private pending = 0;
	/** C15 위반 수. 패널을 열 때와 새로 고칠 때만 셉니다. */
	private violationCount = 0;

	constructor(leaf: WorkspaceLeaf, core: SaintFlowCore) {
		super(leaf);
		this.core = core;
	}

	getViewType(): string {
		return SAINTFLOW_VIEW;
	}

	getDisplayText(): string {
		return "SaintFlow";
	}

	getIcon(): string {
		return "workflow";
	}

	async onOpen(): Promise<void> {
		this.refresh();
	}

	async onClose(): Promise<void> {
		window.clearTimeout(this.pending);
	}

	/** metadataCache 이벤트가 몰려 들어오므로 모아서 한 번만 그립니다. */
	scheduleRefresh(): void {
		window.clearTimeout(this.pending);
		this.pending = window.setTimeout(() => this.refresh(), 300);
	}

	refresh(): void {
		const groups = computeSnapshot(this.core.app, this.core.settings, this.core.index);
		this.violationCount = lintVault(this.core).length;
		this.render(groups);
	}

	private render(groups: SnapshotGroup[]): void {
		const root = this.contentEl;
		root.empty();
		root.addClass("saintflow-panel");

		const header = root.createDiv({ cls: "saintflow-panel-header" });
		header.createSpan({ text: t("점검") });
		const refresh = header.createEl("button", { cls: "clickable-icon", attr: { "aria-label": t("새로 고침") } });
		setIcon(refresh, "refresh-cw");
		refresh.addEventListener("click", () => this.refresh());

		for (const group of groups) this.renderGroup(root, group);
		this.renderViolations(root);

		const actions = root.createDiv({ cls: "saintflow-panel-actions" });
		this.addActionButton(actions, t("주간 검토 (C10)"), "saintflow:weekly-review");
		this.addActionButton(actions, t("규칙 검사 (C15)"), "saintflow:lint");
		this.addActionButton(actions, t("수집함 처리 (C12)"), "saintflow:inbox");
	}

	private renderGroup(root: HTMLElement, group: SnapshotGroup): void {
		const row = root.createDiv({ cls: "saintflow-panel-row" });
		if (group.items.length === 0) row.addClass("is-empty");

		const label = row.createDiv({ cls: "saintflow-panel-label" });
		label.createSpan({ text: group.title });
		label.createSpan({ cls: "saintflow-panel-count", text: String(group.items.length) });
		label.addEventListener("click", () => {
			if (group.items.length === 0) return;
			if (this.expanded.has(group.key)) this.expanded.delete(group.key);
			else this.expanded.add(group.key);
			this.refresh();
		});

		const base = BASE_VIEW[group.key];
		const resolved = base ? this.resolveBase(base.file) : null;
		if (base && resolved) {
			const btn = label.createEl("button", {
				cls: "clickable-icon",
				attr: { "aria-label": t("{0} 보기 열기", base.view) },
			});
			setIcon(btn, "table");
			btn.addEventListener("click", async (ev) => {
				ev.stopPropagation();
				await this.app.workspace.getLeaf(false).openFile(resolved);
			});
		}

		if (!this.expanded.has(group.key)) return;
		const list = row.createDiv({ cls: "saintflow-panel-list" });
		for (const item of group.items) {
			const entry = list.createDiv({ cls: "saintflow-panel-item" });
			entry.createSpan({ text: item.file.basename });
			if (item.note) entry.createSpan({ cls: "saintflow-link-value", text: ` ${item.note}` });
			entry.addEventListener("click", async () => {
				await this.app.workspace.getLeaf(false).openFile(item.file);
			});
		}
	}

	private renderViolations(root: HTMLElement): void {
		const row = root.createDiv({ cls: "saintflow-panel-row" });
		if (this.violationCount === 0) row.addClass("is-empty");
		const label = row.createDiv({ cls: "saintflow-panel-label" });
		label.createSpan({ text: t("규칙 위반") });
		label.createSpan({ cls: "saintflow-panel-count", text: String(this.violationCount) });
		label.addEventListener("click", () => {
			(this.app as unknown as { commands: { executeCommandById(id: string): void } }).commands.executeCommandById(
				"saintflow:lint"
			);
		});
	}

	private resolveBase(fileName: string): TFile | null {
		const found = this.app.vault
			.getFiles()
			.find((f) => f.name === fileName && f.extension === "base");
		return found ?? null;
	}

	private addActionButton(container: HTMLElement, label: string, commandId: string): void {
		const btn = container.createEl("button", { text: label });
		btn.addEventListener("click", () => {
			(this.app as unknown as { commands: { executeCommandById(id: string): void } }).commands.executeCommandById(
				commandId
			);
		});
	}
}
