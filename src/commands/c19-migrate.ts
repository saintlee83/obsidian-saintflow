// C19 스키마 마이그레이션. 미리보기를 먼저 보여주고 확인을 받은 뒤에만 적용합니다.
// 본문은 건드리지 않습니다. processFrontMatter만 씁니다.

import { Modal, Notice, Setting, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import {
	EntitySchema,
	KEY_RENAMES,
	SCHEMA_VERSION,
	emptyValueFor,
	isEmptyValue,
	missingKeys,
	schemaFor,
	valueProblems,
} from "../schema";
import { SaintType } from "../model";
import { frontMatterOf, setFrontMatter } from "../vault-io";
import { t } from "../i18n";

export interface NoteChange {
	file: TFile;
	type: SaintType;
	/** 빈 값으로 채울 키. */
	addKeys: string[];
	/** 이전 이름 → 새 이름. */
	renames: [string, string][];
	/** 자동으로 고치지 않고 보고만 하는 값 문제. */
	reports: string[];
}

export interface MigrationPlan {
	changes: NoteChange[];
	reportsOnly: NoteChange[];
	addCount: number;
	renameCount: number;
}

/** 바뀔 내용을 계산합니다. 파일은 건드리지 않습니다. */
export function planMigration(core: SaintFlowCore): MigrationPlan {
	const skip = core.settings.folders.templates;
	const changes: NoteChange[] = [];
	const reportsOnly: NoteChange[] = [];
	let addCount = 0;
	let renameCount = 0;

	for (const file of core.app.vault.getMarkdownFiles()) {
		if (file.path === skip || file.path.startsWith(skip + "/")) continue;
		const fm = frontMatterOf(core.app, file);
		const schema = schemaFor(fm.type);
		if (!schema) continue;

		const renames = plannedRenames(schema, fm);
		// 이름이 바뀐 키를 먼저 옮긴다고 보고 남은 누락 키를 셉니다.
		const afterRename = { ...fm };
		for (const [from, to] of renames) {
			afterRename[to] = afterRename[from];
			delete afterRename[from];
		}
		const addKeys = missingKeys(schema, afterRename);
		const reports = valueProblems(schema, fm).map((p) => p.message);

		const change: NoteChange = {
			file,
			type: schema.type,
			addKeys,
			renames,
			reports,
		};
		if (addKeys.length > 0 || renames.length > 0) {
			changes.push(change);
			addCount += addKeys.length;
			renameCount += renames.length;
		} else if (reports.length > 0) {
			reportsOnly.push(change);
		}
	}

	return { changes, reportsOnly, addCount, renameCount };
}

function plannedRenames(schema: EntitySchema, fm: Record<string, unknown>): [string, string][] {
	const table = KEY_RENAMES[schema.type] ?? {};
	const out: [string, string][] = [];
	for (const [from, to] of Object.entries(table)) {
		if (!(from in fm)) continue;
		// 새 키에 이미 값이 있으면 덮지 않습니다.
		if (to in fm && !isEmptyValue(fm[to])) continue;
		out.push([from, to]);
	}
	return out;
}

/** 계획을 적용합니다. 같은 계획을 다시 적용하면 변경이 0건입니다(멱등). */
export async function applyMigration(core: SaintFlowCore, plan: MigrationPlan): Promise<string[]> {
	const log: string[] = [];
	for (const change of plan.changes) {
		const schema = schemaFor(change.type);
		if (!schema) continue;
		await setFrontMatter(core.app, change.file, (fm) => {
			for (const [from, to] of change.renames) {
				if (!(from in fm)) continue;
				fm[to] = fm[from];
				delete fm[from];
			}
			for (const key of change.addKeys) {
				if (key in fm) continue;
				const field = schema.fields.find((f) => f.key === key);
				if (!field) continue;
				fm[key] = emptyValueFor(field);
			}
		});
		const parts: string[] = [];
		if (change.renames.length > 0) {
			parts.push(t("이름 변경 {0}", change.renames.map(([a, b]) => `${a}→${b}`).join(", ")));
		}
		if (change.addKeys.length > 0) parts.push(t("추가 {0}", change.addKeys.join(", ")));
		log.push(`${change.file.path}: ${parts.join(" · ")}`);
	}
	core.index.invalidate();
	return log;
}

export async function migrateCommand(core: SaintFlowCore): Promise<void> {
	const plan = planMigration(core);
	new MigrationModal(core, plan).open();
}

class MigrationModal extends Modal {
	private core: SaintFlowCore;
	private plan: MigrationPlan;

	constructor(core: SaintFlowCore, plan: MigrationPlan) {
		super(core.app);
		this.core = core;
		this.plan = plan;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle(t("스키마 마이그레이션 · v{0}", SCHEMA_VERSION));

		const { changes, reportsOnly, addCount, renameCount } = this.plan;
		contentEl.createDiv({
			cls: "saintflow-form-note",
			text:
				changes.length === 0
					? t("바꿀 노트가 없습니다. 본문은 어떤 경우에도 건드리지 않습니다.")
					: t(
							"노트 {0}개에서 속성 {1}개를 추가하고 키 {2}개의 이름을 바꿉니다. 본문은 건드리지 않습니다.",
							changes.length,
							addCount,
							renameCount
						),
		});

		if (changes.length > 0) {
			const list = contentEl.createDiv({ cls: "saintflow-lint-list" });
			list.createEl("h4", { text: t("변경 미리보기 ({0})", changes.length) });
			for (const change of changes.slice(0, 50)) {
				const parts: string[] = [];
				if (change.renames.length > 0) {
					parts.push(change.renames.map(([a, b]) => `${a} → ${b}`).join(", "));
				}
				if (change.addKeys.length > 0) parts.push(`+ ${change.addKeys.join(", ")}`);
				new Setting(list).setName(change.file.basename).setDesc(parts.join(" · "));
			}
			if (changes.length > 50) {
				list.createDiv({ cls: "saintflow-link-value", text: t("외 {0}개", changes.length - 50) });
			}
		}

		const reported = [...changes, ...reportsOnly].filter((c) => c.reports.length > 0);
		if (reported.length > 0) {
			const list = contentEl.createDiv({ cls: "saintflow-lint-list" });
			list.createEl("h4", { text: t("보고만 하는 값 문제 ({0})", reported.length) });
			for (const change of reported.slice(0, 30)) {
				new Setting(list).setName(change.file.basename).setDesc(change.reports.join(" / "));
			}
			list.createDiv({
				cls: "saintflow-link-value",
				text: t("허용값 밖의 값은 자동으로 바꾸지 않습니다. C15 규칙 검사에서 하나씩 고르세요."),
			});
		}

		new Setting(contentEl)
			.addButton((btn) => btn.setButtonText(t("취소")).onClick(() => this.close()))
			.addButton((btn) =>
				btn
					.setButtonText(changes.length === 0 ? t("버전만 맞추기") : t("적용"))
					.setCta()
					.onClick(async () => {
						const log = await applyMigration(this.core, this.plan);
						this.core.settings.schemaVersion = SCHEMA_VERSION;
						await this.core.saveSettings();
						console.info("[SaintFlow] C19 마이그레이션", log);
						new Notice(
							log.length === 0
								? t("변경 없음. 스키마 버전을 v{0}로 맞췄습니다.", SCHEMA_VERSION)
								: t("{0}개 노트를 갱신했습니다. 자세한 내용은 콘솔 로그에 있습니다.", log.length),
							8000
						);
						this.close();
					})
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/** 플러그인 업데이트로 스키마 버전이 올랐을 때 한 번 안내합니다. */
export function noticeIfOutdated(core: SaintFlowCore): void {
	if (core.settings.schemaVersion >= SCHEMA_VERSION) return;
	new Notice(
		t("SaintFlow 스키마가 v{0}로 올랐습니다. \"C19 스키마 마이그레이션\"을 실행하세요.", SCHEMA_VERSION),
		8000
	);
}
