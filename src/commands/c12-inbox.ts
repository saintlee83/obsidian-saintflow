// C12 Inbox 처리 모드: 0_Sweep 파일을 생성 순으로 하나씩 열고 판단 순서(설계안 4.1)를 묻습니다.
// 2분 안에 끝나는 일이면 지금 하고 done Task로 기록한 뒤 다음으로 넘어갑니다.

import { Notice, TFile } from "obsidian";
import { ARRANGE_TYPES, CreatableType, typeLabel } from "../model";
import type { SaintFlowCore } from "../core";
import { todayISO } from "../dates";
import { homeFolderFor } from "../placement";
import { ArrangeResult, applyArrange, collectInput } from "./c2-arrange";
import { confirm, pickOne } from "../ui/modals";
import { t } from "../i18n";

type Step = "two-minute" | "arrange" | "skip" | "delete" | "stop";

interface Tally {
	processed: number;
	skipped: number;
	deleted: number;
	twoMinute: number;
	byType: Map<CreatableType, number>;
}

/** 2.6 판단 순서. 분류를 고를 때 함께 띄웁니다. */
function judgement(): string {
	return [
		t("1. 행동인가? → Task. 여러 행동이 필요하면 프로젝트"),
		t("2. 특정 프로젝트·영역과 함께 끝나는가? → 그 컨테이너"),
		t("3. 자료가 말하는 것을 정리했는가? → Source"),
		t("4. 내가 이해한 것을 자기 말로 썼는가? → Zettel"),
		t("5. 보존만 하면 되는가? → vault 밖"),
	].join("\n");
}

export async function inboxCommand(core: SaintFlowCore): Promise<void> {
	const items = sweepFiles(core);
	if (items.length === 0) {
		new Notice(t("수집함이 비어 있습니다."));
		return;
	}

	const tally: Tally = { processed: 0, skipped: 0, deleted: 0, twoMinute: 0, byType: new Map() };

	for (let i = 0; i < items.length; i++) {
		const file = items[i];
		// 파일이 사이에 사라졌을 수 있습니다.
		if (!(core.app.vault.getAbstractFileByPath(file.path) instanceof TFile)) continue;

		await core.app.workspace.getLeaf(false).openFile(file);

		const step = await pickOne<Step>(
			core.app,
			[
				{
					value: "two-minute",
					label: t("2분 안에 끝나는 일이다"),
					description: t("지금 하고 완료한 Task로 기록합니다."),
				},
				{ value: "arrange", label: t("분류한다"), description: judgement() },
				{ value: "skip", label: t("건너뛰기"), description: t("수집함에 그대로 둡니다.") },
				{ value: "delete", label: t("삭제"), description: t("휴지통으로 보냅니다.") },
				{ value: "stop", label: t("그만두기"), description: t("여기까지 처리하고 요약을 봅니다.") },
			],
			t("수집함 {0}/{1} · {2}", i + 1, items.length, file.basename)
		);

		if (step === null || step === "stop") break;

		switch (step) {
			case "skip":
				tally.skipped++;
				break;
			case "delete": {
				const ok = await confirm(core.app, {
					title: t("삭제"),
					message: t("{0}을(를) 휴지통으로 보냅니다.", file.basename),
					cta: t("휴지통으로"),
					warning: true,
				});
				if (ok) {
					await core.app.fileManager.trashFile(file);
					core.index.invalidate();
					tally.deleted++;
				} else {
					tally.skipped++;
				}
				break;
			}
			case "two-minute": {
				const done = await handleTwoMinute(core, file);
				if (done) {
					tally.processed++;
					tally.twoMinute++;
					bump(tally, "task");
				} else {
					tally.skipped++;
				}
				break;
			}
			case "arrange": {
				const type = await pickOne<CreatableType>(
					core.app,
					ARRANGE_TYPES.map((type) => ({ value: type, label: typeLabel(type) })),
					t("무엇으로 분류할까요?")
				);
				if (!type) {
					tally.skipped++;
					break;
				}
				const result = await collectInput(core, type, file);
				if (!result) {
					tally.skipped++;
					break;
				}
				const ok = await applyArrange(core, file, type, result);
				if (ok) {
					tally.processed++;
					bump(tally, type);
				} else {
					tally.skipped++;
				}
				break;
			}
		}
	}

	showSummary(core, tally);
}

/** 2분 규칙: 지금 처리했다고 확인받은 뒤 done Task로 기록합니다. */
async function handleTwoMinute(core: SaintFlowCore, file: TFile): Promise<boolean> {
	const ok = await confirm(core.app, {
		title: t("지금 처리"),
		message: t("\"{0}\"을(를) 지금 처리했습니까?\n완료한 Task로 기록하고 4_Transform으로 옮깁니다.", file.basename),
		cta: t("완료로 기록"),
	});
	if (!ok) return false;

	const result: ArrangeResult = {
		title: file.basename,
		folder: homeFolderFor(core.settings, "task"),
		overrides: { status: "done", completed: todayISO() },
	};
	return await applyArrange(core, file, "task", result);
}

function bump(tally: Tally, type: CreatableType): void {
	tally.byType.set(type, (tally.byType.get(type) ?? 0) + 1);
}

/** 생성 순(ctime)으로 수집함 파일을 모읍니다. */
export function sweepFiles(core: SaintFlowCore): TFile[] {
	const sweep = core.settings.folders.sweep;
	return core.app.vault
		.getMarkdownFiles()
		.filter((f) => f.path === sweep || f.path.startsWith(sweep + "/"))
		.sort((a, b) => a.stat.ctime - b.stat.ctime);
}

function showSummary(core: SaintFlowCore, tally: Tally): void {
	const remaining = sweepFiles(core).length;
	const byType = [...tally.byType.entries()]
		.map(([type, n]) => `${typeLabel(type).split(" ")[0]} ${n}`)
		.join(", ");

	const lines = [
		t("처리 {0}건 (2분 규칙 {1}건)", tally.processed, tally.twoMinute),
		byType ? t("유형별: {0}", byType) : "",
		t("건너뜀 {0}건 · 삭제 {1}건", tally.skipped, tally.deleted),
		t("수집함 잔량 {0}건", remaining),
	].filter(Boolean);

	new Notice(lines.join("\n"), 10000);
}
