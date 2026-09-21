// C4 새 프로젝트 / 새 영역: 컨테이너와 허브를 만들고 첫 다음 행동을 권유합니다.
// 완료 조건이 비면 프로젝트를 만들지 않습니다(설계안 C4 검증 기준).

import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { toLink } from "../links";
import { AREA_STATUS } from "../model";
import { createTypedNote, homeFolderFor } from "../relations";
import { confirm, file as pickedFile, openForm, promptRequired, str } from "../ui/modals";

export async function newProjectCommand(core: SaintFlowCore): Promise<TFile | null> {
	const areas = core.index.allOfType("area");
	const values = await openForm(core.app, {
		title: "새 프로젝트",
		description: "완료 조건은 판정 가능한 한 문장이어야 합니다. 비면 만들지 않습니다.",
		fields: [
			{ kind: "text", key: "title", label: "이름", required: true, placeholder: "기술비교보고서" },
			{
				kind: "textarea",
				key: "outcome",
				label: "완료 조건",
				required: true,
				placeholder: "무엇이 있으면 끝난 것인가?",
			},
			{ kind: "link", key: "area", label: "area", files: areas },
			{ kind: "text", key: "deadline", label: "deadline", placeholder: "YYYY-MM-DD" },
			{ kind: "text", key: "repo", label: "repo", placeholder: "저장소 URL 또는 로컬 경로" },
		],
	});
	if (!values) return null;

	const outcome = str(values, "outcome");
	if (!outcome) {
		new Notice("완료 조건이 비어 있어 만들지 않았습니다.");
		return null;
	}
	const area = pickedFile(values, "area");

	const hub = await createTypedNote(core, "project", {
		title: str(values, "title"),
		overrides: {
			status: "active",
			outcome,
			...(area ? { area: toLink(area.basename) } : {}),
			...(str(values, "deadline") ? { deadline: str(values, "deadline") } : {}),
			...(str(values, "repo") ? { repo: str(values, "repo") } : {}),
		},
	});
	if (!hub) return null;

	await core.app.workspace.getLeaf(false).openFile(hub);
	await promptFirstNextAction(core, hub);
	return hub;
}

export async function newAreaCommand(core: SaintFlowCore): Promise<TFile | null> {
	const values = await openForm(core.app, {
		title: "새 영역",
		description: "영역은 유지 기준이 있는 책임입니다. 끝나는 날짜가 있으면 프로젝트입니다.",
		fields: [
			{ kind: "text", key: "title", label: "이름", required: true, placeholder: "학업" },
			{ kind: "textarea", key: "standard", label: "유지 기준", required: true },
			{ kind: "dropdown", key: "status", label: "status", options: AREA_STATUS, value: "active" },
			{
				kind: "dropdown",
				key: "review_cycle",
				label: "review_cycle",
				options: { "": "(없음)", weekly: "weekly", monthly: "monthly", quarterly: "quarterly" },
				value: "",
			},
		],
	});
	if (!values) return null;

	const hub = await createTypedNote(core, "area", {
		title: str(values, "title"),
		overrides: {
			status: str(values, "status") || "active",
			standard: str(values, "standard"),
			...(str(values, "review_cycle") ? { review_cycle: str(values, "review_cycle") } : {}),
		},
	});
	if (!hub) return null;

	await core.app.workspace.getLeaf(false).openFile(hub);
	return hub;
}

/** 규칙 2: 진행 중인 프로젝트는 다음 행동을 가집니다. 없으면 멈춘 프로젝트로 표시됩니다. */
async function promptFirstNextAction(core: SaintFlowCore, hub: TFile): Promise<void> {
	const wants = await confirm(core.app, {
		title: "첫 다음 행동",
		message:
			"다음 행동이 없으면 멈춘 프로젝트로 표시됩니다. 지금 하나 정할까요?\n정할 수 없다면 그것을 정하기 위해 확인할 질문을 Task로 두세요.",
		cta: "정하기",
	});
	if (!wants) return;

	const title = await promptRequired(
		core.app,
		{
			title: "다음 행동",
			description: "동사로 끝나는 행동 하나를 씁니다.",
			placeholder: "후보 기술 A 평가 조건 정리하기",
			cta: "만들기",
		},
		"행동이 비어 있습니다."
	);
	if (!title) return;

	const task = await createTypedNote(core, "task", {
		title,
		folder: homeFolderFor(core.settings, "task"),
		overrides: { status: "next", project: toLink(hub.basename) },
	});
	if (task) new Notice(`다음 행동: ${task.basename}`);
}
