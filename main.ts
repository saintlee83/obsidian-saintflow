// SaintFlow — SAINT 단계와 Flow 검토 루프를 위한 Obsidian 플러그인.
// 설계안: 9_System/SaintFlow 최종 설계안.md (5장 플러그인 명세)
//
// 역할 분담(설계안 5.2): Bases가 보기를 맡고, 플러그인은 생성·변경·점검 계산을 맡습니다.
// Node API를 쓰지 않으므로 모바일에서도 동작합니다.

import {
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	TAbstractFile,
	TFile,
	TFolder,
	WorkspaceLeaf,
	moment,
} from "obsidian";
import { registerNewBlock } from "./src/blocks/new-block";
import { captureCommand } from "./src/commands/c1-capture";
import { weeklyReviewCommand } from "./src/commands/c10-weekly-review";
import { inboxCommand } from "./src/commands/c12-inbox";
import { canExtract, extractZettelCommand } from "./src/commands/c13-extract-zettel";
import { canPromoteSelection, promoteSelectionCommand } from "./src/commands/c14-promote-selection";
import { lintCommand, lintFileAndNotify, lintOnStartup } from "./src/commands/c15-lint";
import { openHomeCommand, openHomeOnStartup } from "./src/commands/c17-open-home";
import { decorateHubs, isContainerFolder, openHubCommand } from "./src/commands/c18-open-hub";
import { migrateCommand, noticeIfOutdated } from "./src/commands/c19-migrate";
import { arrangeCommand } from "./src/commands/c2-arrange";
import { reportCommand } from "./src/commands/c20-report";
import { createInContextCommand } from "./src/commands/c3-create-in-context";
import { newAreaCommand, newProjectCommand } from "./src/commands/c4-new-container";
import { setRelationCommand } from "./src/commands/c5-set-relation";
import { linkZettelCommand } from "./src/commands/c6-link-zettel";
import { statusCommand } from "./src/commands/c7-status";
import { gradeRecallCommand, recallSessionCommand } from "./src/commands/c8-recall";
import { projectCloseCommand } from "./src/commands/c9-project-close";
import { SaintFlowSettings, mergeSettings } from "./src/config";
import type { SaintFlowCore } from "./src/core";
import { SaintFlowIndex, computeSnapshot } from "./src/graph";
import { detectLocale, setLocale, t } from "./src/i18n";
import { isContextParent } from "./src/model";
import { isInboxNote } from "./src/scope";
import { SaintFlowSettingTab } from "./src/settings";
import { frontMatterOf, typeOf } from "./src/vault-io";
import { SAINTFLOW_VIEW, SaintFlowPanel } from "./src/views/panel";

export default class SaintFlowPlugin extends Plugin implements SaintFlowCore {
	settings!: SaintFlowSettings;
	index!: SaintFlowIndex;
	private decorateTimer = 0;

	async onload(): Promise<void> {
		// UI 언어는 Obsidian 설정을 따릅니다. 명령 이름과 설정 탭이 만들어지기 전에 정해야 합니다.
		// 언어를 바꾸면 Obsidian이 다시 로드되므로 여기서 한 번만 정하면 됩니다.
		setLocale(detectLocale(moment.locale()));

		await this.loadSettings();
		this.index = new SaintFlowIndex(this.app, () => this.settings);

		// 인덱스는 resolved와 changed에 맞춰 갱신합니다(설계안 5.4).
		this.registerEvent(this.app.metadataCache.on("resolved", () => this.onVaultChanged()));
		this.registerEvent(this.app.metadataCache.on("changed", () => this.onVaultChanged()));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.onRename(file, oldPath)));
		this.registerEvent(this.app.vault.on("delete", () => this.onVaultChanged()));
		this.registerEvent(this.app.vault.on("create", () => this.scheduleDecorate()));
		this.registerEvent(this.app.workspace.on("layout-change", () => this.scheduleDecorate()));

		this.addSettingTab(new SaintFlowSettingTab(this.app, this));
		this.registerView(SAINTFLOW_VIEW, (leaf) => new SaintFlowPanel(leaf, this));
		registerNewBlock(this, (language, handler) =>
			this.registerMarkdownCodeBlockProcessor(language, handler)
		);
		this.registerCommands();
		this.registerMenus();

		// C1은 모바일에서도 한 번에 닿아야 합니다.
		this.addRibbonIcon("inbox", t("SaintFlow: 수집"), () => void this.run(() => captureCommand(this)));
		this.addRibbonIcon("workflow", t("SaintFlow: 패널 열기"), () => void this.run(() => this.openPanel()));

		this.app.workspace.onLayoutReady(() => {
			this.scheduleDecorate();
			noticeIfOutdated(this);
			if (this.settings.lintOnStartup) lintOnStartup(this);
		});
		openHomeOnStartup(this);
	}

	onunload(): void {
		window.clearTimeout(this.decorateTimer);
		document
			.querySelectorAll(".nav-file-title.saintflow-hub")
			.forEach((el) => el.removeClass("saintflow-hub"));
	}

	private registerCommands(): void {
		this.addCommand({
			id: "capture",
			name: t("C1 수집"),
			callback: () => void this.run(() => captureCommand(this)),
		});

		this.addCommand({
			id: "arrange",
			name: t("C2 분류"),
			checkCallback: (checking) => {
				const ok = this.activeIsInSweep();
				if (checking) return ok;
				if (ok) void this.run(() => arrangeCommand(this));
				return ok;
			},
		});

		this.addCommand({
			id: "create-in-context",
			name: t("C3 맥락 생성"),
			callback: () => void this.run(() => createInContextCommand(this)),
		});

		this.addCommand({
			id: "new-project",
			name: t("C4 새 프로젝트"),
			callback: () => void this.run(() => newProjectCommand(this)),
		});

		this.addCommand({
			id: "new-area",
			name: t("C4 새 영역"),
			callback: () => void this.run(() => newAreaCommand(this)),
		});

		this.addCommand({
			id: "set-relation",
			name: t("C5 관계 지정"),
			callback: () => void this.run(() => setRelationCommand(this)),
		});

		this.addCommand({
			id: "link-zettel",
			name: t("C6 Zettel 연결 추가"),
			checkCallback: this.activeTypeCheck(["zettel"], () => linkZettelCommand(this)),
		});

		this.addCommand({
			id: "set-status",
			name: t("C7 상태 전환"),
			checkCallback: this.activeTypeCheck(["task", "project", "area", "resource", "zettel", "output"], () =>
				statusCommand(this)
			),
		});

		this.addCommand({
			id: "recall-session",
			name: t("C8 회상 세션 시작"),
			callback: () => void this.run(() => recallSessionCommand(this)),
		});

		this.addCommand({
			id: "grade-recall",
			name: t("C8 회상 채점"),
			callback: () => void this.run(() => gradeRecallCommand(this)),
		});

		this.addCommand({
			id: "project-close",
			name: t("C9 프로젝트 종료"),
			checkCallback: this.activeTypeCheck(["project"], () => projectCloseCommand(this)),
		});

		this.addCommand({
			id: "weekly-review",
			name: t("C10 주간 검토"),
			callback: () => void this.run(() => weeklyReviewCommand(this)),
		});

		this.addCommand({
			id: "inbox",
			name: t("C12 Inbox 처리 모드"),
			checkCallback: (checking) => {
				const ok = this.app.vault
					.getMarkdownFiles()
					.some((f) => isInboxNote(this.settings, f.path, frontMatterOf(this.app, f)));
				if (checking) return ok;
				if (ok) void this.run(() => inboxCommand(this));
				return ok;
			},
		});

		this.addCommand({
			id: "extract-zettel",
			name: t("C13 Resource에서 Zettel 추출"),
			editorCheckCallback: (checking, editor: Editor, view) => {
				const file = view instanceof MarkdownView ? view.file : null;
				const ok = canExtract(this.app, file, editor);
				if (checking) return ok;
				if (ok && file) void this.run(() => extractZettelCommand(this, editor, file));
				return ok;
			},
		});

		this.addCommand({
			id: "promote-selection",
			name: t("C14 선택 영역 승격"),
			editorCheckCallback: (checking, editor: Editor, view) => {
				const file = view instanceof MarkdownView ? view.file : null;
				const ok = canPromoteSelection(this.app, file, editor);
				if (checking) return ok;
				if (ok && file) void this.run(() => promoteSelectionCommand(this, editor, file));
				return ok;
			},
		});

		this.addCommand({
			id: "lint",
			name: t("C15 규칙 검사"),
			callback: () => void this.run(() => lintCommand(this)),
		});

		this.addCommand({
			id: "open-panel",
			name: t("C16 SaintFlow 패널 열기"),
			callback: () => void this.run(() => this.openPanel()),
		});

		this.addCommand({
			id: "open-home",
			name: t("C17 Home 열기"),
			callback: () => void this.run(() => openHomeCommand(this)),
		});

		this.addCommand({
			id: "open-hub",
			name: t("C18 부모·방 노트 열기"),
			callback: () => void this.run(() => openHubCommand(this)),
		});

		this.addCommand({
			id: "migrate-schema",
			name: t("C19 스키마 마이그레이션"),
			callback: () => void this.run(() => migrateCommand(this)),
		});

		this.addCommand({
			id: "export-report",
			name: t("C20 점검 리포트 내보내기"),
			callback: () => void this.run(() => reportCommand(this)),
		});

		this.addCommand({
			id: "snapshot-notice",
			name: t("점검 스냅샷 보기"),
			callback: () =>
				void this.run(async () => {
					const groups = computeSnapshot(this.app, this.settings, this.index);
					new Notice(groups.map((g) => `${g.title} ${g.items.length}`).join("\n"), 8000);
				}),
		});
	}

	private activeIsInSweep(): boolean {
		const file = this.app.workspace.getActiveFile();
		return !!file && isInboxNote(this.settings, file.path, frontMatterOf(this.app, file));
	}

	private activeTypeCheck(types: string[], run: () => Promise<unknown>) {
		return (checking: boolean): boolean => {
			const file = this.app.workspace.getActiveFile();
			const ok = !!file && types.includes(typeOf(this.app, file) ?? "");
			if (checking) return ok;
			if (ok) void this.run(run);
			return ok;
		};
	}

	private registerMenus(): void {
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFolder) {
					if (!isContainerFolder(this, file)) return;
					menu.addItem((item) =>
						item
							.setTitle(t("SaintFlow: 방 노트 열기"))
							.setIcon("home")
							.onClick(() => void this.run(() => openHubCommand(this, file)))
					);
					return;
				}
				if (!(file instanceof TFile) || file.extension !== "md") return;
				if (isInboxNote(this.settings, file.path, frontMatterOf(this.app, file))) {
					menu.addItem((item) =>
						item
							.setTitle(t("SaintFlow: 분류"))
							.setIcon("folder-input")
							.onClick(() => void this.run(() => arrangeCommand(this, file)))
					);
				}
				if (isContextParent(typeOf(this.app, file))) {
					menu.addItem((item) =>
						item
							.setTitle(t("SaintFlow: 여기서 만들기"))
							.setIcon("plus")
							.onClick(() => void this.run(() => createInContextCommand(this, { parent: file })))
					);
				}
			})
		);
	}

	async openPanel(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(SAINTFLOW_VIEW);
		if (existing.length > 0) {
			await this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf: WorkspaceLeaf | null = this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		await leaf.setViewState({ type: SAINTFLOW_VIEW, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	private onVaultChanged(): void {
		this.index.invalidate();
		this.refreshPanel();
	}

	private onRename(file: TAbstractFile, _oldPath: string): void {
		this.onVaultChanged();
		this.scheduleDecorate();
		if (this.settings.lintOnRename && file instanceof TFile && file.extension === "md") {
			lintFileAndNotify(this, file);
		}
	}

	private refreshPanel(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(SAINTFLOW_VIEW)) {
			const view = leaf.view;
			if (view instanceof SaintFlowPanel) view.scheduleRefresh();
		}
	}

	private scheduleDecorate(): void {
		window.clearTimeout(this.decorateTimer);
		this.decorateTimer = window.setTimeout(() => {
			try {
				decorateHubs(this);
			} catch (err) {
				console.debug("[SaintFlow] 허브 표시 실패", err);
			}
		}, 150);
	}

	refreshHubDecorations(): void {
		this.scheduleDecorate();
	}

	async runMigration(): Promise<void> {
		await this.run(() => migrateCommand(this));
	}

	/** 명령에서 새어 나온 예외를 사용자에게 보여줍니다. */
	private async run(fn: () => Promise<unknown>): Promise<void> {
		try {
			await fn();
		} catch (err) {
			console.error("[SaintFlow]", err);
			new Notice(t("SaintFlow 오류: {0}", err instanceof Error ? err.message : String(err)), 8000);
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = mergeSettings((await this.loadData()) as Partial<SaintFlowSettings> | null);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.index.invalidate();
		this.refreshPanel();
	}
}
