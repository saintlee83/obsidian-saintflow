// 설계안 5.5 설정 탭. 값과 기본값은 config.ts에 있습니다.

import { App, PluginSettingTab, Setting } from "obsidian";
import type SaintFlowPlugin from "../main";
import {
	DEFAULT_SETTINGS,
	FolderSettings,
	PrefixSettings,
	SaintFlowSettings,
	parseIntervals,
} from "./config";
import { SCHEMA_VERSION } from "./schema";
import { t } from "./i18n";

export type { FolderSettings, PrefixSettings, SaintFlowSettings };
export { DEFAULT_SETTINGS, parseIntervals };

const folderLabels = (): [keyof FolderSettings, string][] => [
	["sweep", t("수집함 (S)")],
	["projects", "Projects"],
	["areas", "Areas"],
	["resources", "Resources"],
	["archive", "Archive"],
	["zettels", "Zettels"],
	["maps", "Maps"],
	["narrate", t("회상 세션 (N)")],
	["transform", "Task (T)"],
	["daily", "Daily"],
	["reviews", "Reviews"],
	["templates", t("템플릿")],
	["reports", t("점검 리포트")],
];

const prefixLabels = (): [keyof PrefixSettings, string][] => [
	["project", t("프로젝트")],
	["area", t("영역")],
	["working", t("작업 노트")],
	["output", t("결과물")],
	["source", t("참고 자료")],
	["map", t("지도")],
	["session", t("회상 세션")],
	["review", t("검토")],
];

export class SaintFlowSettingTab extends PluginSettingTab {
	plugin: SaintFlowPlugin;

	constructor(app: App, plugin: SaintFlowPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName(t("회상")).setHeading();

		new Setting(containerEl)
			.setName(t("회상 간격"))
			.setDesc(t("box 1부터 순서대로 쓸 간격(일)입니다. 쉼표로 구분합니다."))
			.addText((text) =>
				text
					.setPlaceholder("1, 3, 7, 14, 30")
					.setValue(this.plugin.settings.recallIntervals.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.recallIntervals = parseIntervals(
							value,
							DEFAULT_SETTINGS.recallIntervals
						);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t("오래된 seed 임계값"))
			.setDesc(t("seed 상태로 이 일수를 넘긴 Zettel을 점검에서 표시합니다."))
			.addText((text) =>
				text
					.setPlaceholder("14")
					.setValue(String(this.plugin.settings.oldSeedDays))
					.onChange(async (value) => {
						const n = Number(value.trim());
						this.plugin.settings.oldSeedDays = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 14;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName(t("시작과 화면")).setHeading();

		new Setting(containerEl)
			.setName(t("시작 시 Home 열기"))
			.setDesc(t("C17. Obsidian을 열면 Home 노트를 활성 탭으로 띄웁니다."))
			.addToggle((tg) =>
				tg.setValue(this.plugin.settings.openHomeOnStart).onChange(async (v) => {
					this.plugin.settings.openHomeOnStart = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("Home 경로"))
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.homePath)
					.setValue(this.plugin.settings.homePath)
					.onChange(async (value) => {
						this.plugin.settings.homePath = value.trim() || DEFAULT_SETTINGS.homePath;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t("파일 탐색기에서 허브 구분 표시"))
			.setDesc(t("C18. 컨테이너 폴더와 이름이 같은 허브 노트를 굵게 표시합니다."))
			.addToggle((tg) =>
				tg.setValue(this.plugin.settings.markHubsInExplorer).onChange(async (v) => {
					this.plugin.settings.markHubsInExplorer = v;
					await this.plugin.saveSettings();
					this.plugin.refreshHubDecorations();
				})
			);

		new Setting(containerEl).setName(t("점검")).setHeading();

		new Setting(containerEl)
			.setName(t("시작 시 규칙 검사"))
			.setDesc(t("C15. Obsidian을 열 때 vault를 검사하고 위반 수를 알립니다."))
			.addToggle((tg) =>
				tg.setValue(this.plugin.settings.lintOnStartup).onChange(async (v) => {
					this.plugin.settings.lintOnStartup = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("이동·이름 변경 시 규칙 검사"))
			.setDesc(t("C15. 파일을 옮기거나 이름을 바꿀 때 그 파일만 검사해 바로 알립니다."))
			.addToggle((tg) =>
				tg.setValue(this.plugin.settings.lintOnRename).onChange(async (v) => {
					this.plugin.settings.lintOnRename = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("주간 검토 시 리포트 저장"))
			.setDesc(t("C20. C10을 실행하면 점검 리포트 JSON을 함께 저장합니다."))
			.addToggle((tg) =>
				tg.setValue(this.plugin.settings.reportOnWeekly).onChange(async (v) => {
					this.plugin.settings.reportOnWeekly = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("스키마 버전"))
			.setDesc(
				t("현재 플러그인 스키마는 v{0}, 이 vault에 맞춘 버전은 v{1}입니다.", SCHEMA_VERSION, this.plugin.settings.schemaVersion)
			)
			.addButton((btn) =>
				btn.setButtonText(t("C19 마이그레이션 실행")).onClick(() => {
					void this.plugin.runMigration();
				})
			);

		new Setting(containerEl).setName(t("폴더 경로")).setHeading();

		for (const [key, label] of folderLabels()) {
			new Setting(containerEl).setName(label).addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.folders[key])
					.setValue(this.plugin.settings.folders[key])
					.onChange(async (value) => {
						this.plugin.settings.folders[key] = value.trim() || DEFAULT_SETTINGS.folders[key];
						await this.plugin.saveSettings();
					})
			);
		}

		new Setting(containerEl).setName(t("파일명 접두사")).setHeading();

		for (const [key, label] of prefixLabels()) {
			new Setting(containerEl).setName(label).addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.prefixes[key])
					.setValue(this.plugin.settings.prefixes[key])
					.onChange(async (value) => {
						this.plugin.settings.prefixes[key] = value.trim() || DEFAULT_SETTINGS.prefixes[key];
						await this.plugin.saveSettings();
					})
			);
		}

		new Setting(containerEl)
			.setName(t("기본값으로 되돌리기"))
			.setDesc(t("폴더, 접두사, 회상 간격을 설계안 기본값으로 돌립니다."))
			.addButton((btn) =>
				btn.setButtonText(t("되돌리기")).onClick(async () => {
					const schemaVersion = this.plugin.settings.schemaVersion;
					this.plugin.settings = { ...structuredClone(DEFAULT_SETTINGS), schemaVersion };
					await this.plugin.saveSettings();
					this.display();
				})
			);
	}
}
