// C9 프로젝트 종료(설계안 1.4, 5.3).
// 순서가 중요합니다. 재사용할 내용을 먼저 수확한 뒤에 컨테이너를 보관합니다(규칙 4).

import { Notice, TFile, TFolder } from "obsidian";
import { isOutputWithoutUses } from "../checks";
import type { SaintFlowCore } from "../core";
import { todayISO } from "../dates";
import { toLink } from "../links";
import { stripPrefix } from "../naming";
import { closeReviewName, createTypedNote, fileNameFor, homeFolderFor } from "../relations";
import { appendToSection } from "../sections";
import { confirm, pickOne, promptRequired, promptText } from "../ui/modals";
import {
	childrenOfFolder,
	containerFolderOf,
	frontMatterOf,
	joinPath,
	moveFolder,
	moveNote,
	setFrontMatter,
	typeOf,
} from "../vault-io";

type HarvestChoice = "zettel" | "source" | "keep";
type TaskChoice = "done" | "someday" | "keep";

export async function projectCloseCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const hub = target ?? core.app.workspace.getActiveFile();
	if (!hub || typeOf(core.app, hub) !== "project") {
		new Notice("프로젝트 허브에서 실행하세요.");
		return;
	}
	const container = containerFolderOf(core.app, hub);
	if (!container) {
		new Notice(`${hub.basename}이(가) 같은 이름의 컨테이너 폴더 안에 있지 않습니다.`);
		return;
	}

	// 1. 완료 조건 판정
	const outcome = frontMatterOf(core.app, hub).outcome;
	const met = await confirm(core.app, {
		title: "완료 조건 판정",
		message: `${typeof outcome === "string" && outcome ? outcome : "(완료 조건이 비어 있습니다)"}\n\n충족했습니까?`,
		cta: "충족",
	});
	if (!met) {
		new Notice("종료하지 않았습니다. 완료 조건을 다시 보거나 status를 on-hold로 두세요.");
		return;
	}

	// 2. 결과물의 uses 확인
	const files = childrenOfFolder(core.app, container);
	const outputs = files.filter((f) => typeOf(core.app, f) === "output");
	const missing = outputs.filter((f) => isOutputWithoutUses(frontMatterOf(core.app, f).uses));
	if (missing.length > 0) {
		const proceed = await confirm(core.app, {
			title: "uses가 빈 결과물이 있습니다",
			message: `${missing.map((f) => f.basename).join(", ")}\n\n사용한 지식 링크는 Transform의 완료 증거입니다. 그래도 계속할까요?`,
			cta: "계속",
			warning: true,
		});
		if (!proceed) return;
	}

	// 3. 작업 노트 수확
	const workings = files.filter((f) => typeOf(core.app, f) === "working");
	const promoted: string[] = [];
	for (const working of workings) {
		const choice = await pickOne<HarvestChoice>(
			core.app,
			[
				{ value: "keep", label: "보관", description: "컨테이너와 함께 Archive로 갑니다." },
				{ value: "zettel", label: "Zettel로 승격", description: "2_Internalize로 옮기고 seed로 둡니다." },
				{ value: "source", label: "Source로 승격", description: "1_Arrange/Resources로 옮깁니다." },
			],
			`${working.basename} 처리`
		);
		if (!choice) return;
		if (choice === "keep") continue;
		const moved = await promote(core, working, choice, hub.basename);
		if (moved) promoted.push(moved.basename);
	}

	// 4. 남은 Task 처리. project 링크는 유지합니다.
	const tasks = core.index
		.children(hub, "project")
		.filter((f) => typeOf(core.app, f) === "task" && frontMatterOf(core.app, f).status !== "done");
	for (const task of tasks) {
		const choice = await pickOne<TaskChoice>(
			core.app,
			[
				{ value: "done", label: "완료", description: "status: done, completed 기록" },
				{ value: "someday", label: "언젠가", description: "status: someday" },
				{ value: "keep", label: "그대로", description: "상태를 바꾸지 않습니다." },
			],
			`${task.basename} 처리`
		);
		if (!choice) return;
		if (choice === "keep") continue;
		await setFrontMatter(core.app, task, (fm) => {
			fm.status = choice;
			if (choice === "done") fm.completed = todayISO();
		});
	}

	// 5. 종료 검토 노트. 회고는 선택입니다. 여기까지 왔으면 Task를 이미 바꿨으므로 되돌리지 않습니다.
	const reflection = (
		await promptText(core.app, {
			title: "종료 검토",
			description: "다음에 다시 할 때 달라질 점을 한 줄로 씁니다. 비워 두고 나중에 써도 됩니다.",
			cta: "만들기",
			multiline: true,
		})
	)?.trim();

	const reviewName = closeReviewName(core.settings, hub.basename);
	const review = await createTypedNote(core, "review-close", {
		title: reviewName,
		folder: homeFolderFor(core.settings, "review-close"),
		overrides: { project: toLink(hub.basename), date: todayISO() },
		templateVars: { date: todayISO() },
		bodyEdit: reflection ? (body) => appendToSection(body, "회고", reflection) : undefined,
	});

	// 6. 상태 전환과 보관
	await setFrontMatter(core.app, hub, (fm) => {
		fm.status = "done";
	});
	await archiveContainer(core, container);
	core.index.invalidate();

	const parts = [`${hub.basename} 종료`];
	if (promoted.length > 0) parts.push(`승격 ${promoted.length}건`);
	if (review) parts.push(review.basename);
	new Notice(parts.join(" · "));
}

/** 작업 노트를 지식 거처로 옮깁니다. 본문은 그대로 두고 속성과 위치만 바꿉니다. */
async function promote(
	core: SaintFlowCore,
	working: TFile,
	to: "zettel" | "source",
	projectName: string
): Promise<TFile | null> {
	const title = await promptRequired(
		core.app,
		{
			title: to === "zettel" ? "Zettel 제목" : "Source 제목",
			description:
				to === "zettel"
					? "주장 문장으로 씁니다. 접두사는 붙이지 않습니다."
					: "원제목을 씁니다. S- 접두사는 자동으로 붙습니다.",
			value: stripPrefix(core.settings.prefixes.working, working.basename),
			cta: "승격",
		},
		"제목이 비어 있어 승격하지 않았습니다."
	);
	if (!title) return null;

	const name = fileNameFor(core.settings, to, title);
	if (!name) {
		new Notice("파일명 규칙을 적용하면 이름이 비어 있습니다.");
		return null;
	}

	await setFrontMatter(core.app, working, (fm) => {
		fm.type = to;
		if (to === "zettel") {
			fm.status = "seed";
			if (fm.recall === undefined || fm.recall === null) fm.recall = false;
			if (fm.box === undefined || fm.box === null) fm.box = 1;
		} else {
			delete fm.status;
		}
		fm.project = [toLink(projectName)];
		delete fm.area;
		delete fm.repo;
	});
	await moveNote(core.app, working, homeFolderFor(core.settings, to), name);
	return working;
}

async function archiveContainer(core: SaintFlowCore, container: TFolder): Promise<void> {
	const target = joinPath(core.settings.folders.archive, "Projects");
	await moveFolder(core.app, container, target);
}
