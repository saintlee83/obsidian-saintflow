// C20 점검 리포트 내보내기. 2.3 점검 값과 C15 위반을 JSON 한 파일로 남깁니다.
// 값은 C10·C16과 같은 계산을 씁니다.

import { Notice, TFile, normalizePath } from "obsidian";
import type { SaintFlowCore } from "../core";
import { todayISO } from "../dates";
import { computeSnapshot } from "../graph";
import { Violation, ruleLabel } from "../lint";
import { lintVault } from "../lint-vault";
import { joinPath } from "../naming";
import { ensureFolder } from "../vault-io";
import { t } from "../i18n";

export const REPORT_SCHEMA = "saintflow-report/1";

export interface ReportItem {
	path: string;
	name: string;
	note?: string;
}

export interface ReportCheck {
	key: string;
	title: string;
	count: number;
	items: ReportItem[];
}

export interface ReportViolation {
	rule: string;
	ruleLabel: string;
	path: string;
	name: string;
	message: string;
	fix: string;
}

export interface Report {
	schema: string;
	generated: string;
	checks: ReportCheck[];
	violations: ReportViolation[];
	totals: {
		checks: Record<string, number>;
		violations: Record<string, number>;
		checkTotal: number;
		violationTotal: number;
	};
}

export function buildReport(core: SaintFlowCore, today: string = todayISO()): Report {
	const groups = computeSnapshot(core.app, core.settings, core.index, today);
	const violations = lintVault(core);

	const checks: ReportCheck[] = groups.map((group) => ({
		key: group.key,
		title: group.title,
		count: group.items.length,
		items: group.items.map((item) => ({
			path: item.file.path,
			name: item.file.basename,
			...(item.note ? { note: item.note } : {}),
		})),
	}));

	return {
		schema: REPORT_SCHEMA,
		generated: today,
		checks,
		violations: violations.map(toReportViolation),
		totals: {
			checks: Object.fromEntries(checks.map((c) => [c.key, c.count])),
			violations: countByRule(violations),
			checkTotal: checks.reduce((n, c) => n + c.count, 0),
			violationTotal: violations.length,
		},
	};
}

function toReportViolation(violation: Violation): ReportViolation {
	return {
		rule: violation.rule,
		ruleLabel: ruleLabel(violation.rule),
		path: violation.path,
		name: violation.name,
		message: violation.message,
		fix: violation.fix.kind,
	};
}

function countByRule(violations: Violation[]): Record<string, number> {
	const out: Record<string, number> = {};
	for (const v of violations) out[v.rule] = (out[v.rule] ?? 0) + 1;
	return out;
}

/** 같은 날 다시 실행하면 그날 파일을 덮어씁니다. */
export async function writeReport(core: SaintFlowCore, today: string = todayISO()): Promise<TFile | null> {
	const report = buildReport(core, today);
	const folder = core.settings.folders.reports;
	await ensureFolder(core.app, folder);

	const path = normalizePath(joinPath(folder, `${today}.json`));
	const body = JSON.stringify(report, null, 2) + "\n";
	const existing = core.app.vault.getAbstractFileByPath(path);

	if (existing instanceof TFile) {
		await core.app.vault.modify(existing, body);
		return existing;
	}
	return await core.app.vault.create(path, body);
}

export async function reportCommand(core: SaintFlowCore): Promise<void> {
	const file = await writeReport(core);
	if (!file) {
		new Notice(t("리포트를 저장하지 못했습니다."));
		return;
	}
	new Notice(t("점검 리포트: {0}", file.path));
}
