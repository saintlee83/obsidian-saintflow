// C10 주간 검토: R-YYYY-Www를 만들고 2.3 점검 값을 스냅샷으로 기록합니다.

import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { isoWeekName, todayISO } from "../dates";
import { SnapshotGroup, computeSnapshot } from "../graph";
import { toLink } from "../links";
import { homeFolderFor } from "../relations";
import { SECTION, replaceSection } from "../sections";
import { templateContent } from "../templates";
import { createNote, fileByBaseName, setFrontMatter, updateBody } from "../vault-io";
import { writeReport } from "./c20-report";
import { t } from "../i18n";

export async function weeklyReviewCommand(core: SaintFlowCore): Promise<TFile | null> {
	const today = todayISO();
	const name = `${core.settings.prefixes.review}${isoWeekName(today)}`;

	let file = fileByBaseName(core.app, name);
	if (!file) {
		const template = await templateContent(core.app, core.settings, "review", { date: today, title: name });
		file = await createNote(core.app, homeFolderFor(core.settings, "review"), name, template);
		await setFrontMatter(core.app, file, (fm) => {
			fm.type = "review";
			fm.cycle = "weekly";
			fm.date = today;
		});
	}

	const groups = computeSnapshot(core.app, core.settings, core.index, today);
	await updateBody(core.app, file, (body) =>
		replaceSection(body, SECTION.snapshot, renderSnapshot(groups, today))
	);
	core.index.invalidate();

	// C20: 설정이 켜져 있으면 같은 값으로 리포트도 남깁니다.
	let report: TFile | null = null;
	if (core.settings.reportOnWeekly) {
		report = await writeReport(core, today);
	}

	await core.app.workspace.getLeaf(false).openFile(file);
	const total = groups.reduce((n, g) => n + g.items.length, 0);
	new Notice([t("{0} · {1}건", name, total), report ? t("리포트: {0}", report.path) : ""].filter(Boolean).join("\n"));
	return file;
}

export function renderSnapshot(groups: SnapshotGroup[], today: string): string {
	const lines: string[] = [t("계산 시각: {0}", today), "", t("| 점검 | 개수 |"), "| --- | --- |"];
	for (const group of groups) lines.push(`| ${group.title} | ${group.items.length} |`);

	for (const group of groups) {
		lines.push("", `### ${group.title} (${group.items.length})`);
		if (group.items.length === 0) {
			lines.push(t("- 없음"));
			continue;
		}
		for (const item of group.items) {
			const note = item.note ? ` — ${item.note}` : "";
			lines.push(`- ${toLink(item.file.basename)}${note}`);
		}
	}
	return lines.join("\n");
}

/** 검증용: 스냅샷 개수만 뽑습니다(설계안 6.3 C10). */
export function snapshotCounts(groups: SnapshotGroup[]): Record<string, number> {
	const out: Record<string, number> = {};
	for (const group of groups) out[group.key] = group.items.length;
	return out;
}
