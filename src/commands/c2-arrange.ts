// C2 분류: 0_Sweep의 파일을 유형별 거처로 보냅니다.
// 템플릿 속성을 병합하고 본문은 보존합니다. 파일명 규칙을 적용한 뒤 이동합니다.

import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { toLink } from "../links";
import {
	ARRANGE_TYPES,
	AREA_STATUS,
	CreatableType,
	TASK_STATUS,
	TYPE_DEFAULTS,
	TYPE_LABEL,
} from "../model";
import { fileNameFor, homeFolderFor } from "../relations";
import { splitFrontMatter } from "../sections";
import { templateParts } from "../templates";
import { confirm, file as pickedFile, openForm, pickOne, str } from "../ui/modals";
import { frontMatterOf, isArchived, moveNote, setFrontMatter, uniqueBaseName } from "../vault-io";

type ArrangeChoice = CreatableType | "delete";

export interface ArrangeResult {
	title: string;
	overrides: Record<string, unknown>;
	folder: string;
}

export async function arrangeCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const file = target ?? core.app.workspace.getActiveFile();
	if (!file) {
		new Notice("분류할 파일을 먼저 여세요.");
		return;
	}
	const sweep = core.settings.folders.sweep;
	if (!(file.path === sweep || file.path.startsWith(sweep + "/"))) {
		new Notice(`${sweep}에 있는 파일만 분류합니다.`);
		return;
	}

	const choice = await pickOne<ArrangeChoice>(
		core.app,
		[
			...ARRANGE_TYPES.map((t) => ({ value: t as ArrangeChoice, label: TYPE_LABEL[t] })),
			{ value: "delete" as ArrangeChoice, label: "삭제 (휴지통)" },
		],
		"무엇으로 분류할까요?"
	);
	if (!choice) return;

	if (choice === "delete") {
		const ok = await confirm(core.app, {
			title: "삭제",
			message: `${file.basename}을(를) 휴지통으로 보냅니다.`,
			cta: "휴지통으로",
			warning: true,
		});
		if (!ok) return;
		await core.app.fileManager.trashFile(file);
		core.index.invalidate();
		new Notice("휴지통으로 보냈습니다.");
		return;
	}

	const result = await collectInput(core, choice, file);
	if (!result) return;

	const ok = await applyArrange(core, file, choice, result);
	if (ok) new Notice(`${TYPE_LABEL[choice]} → ${file.path}`);
}

/**
 * 분류를 실제로 적용합니다. 템플릿 속성을 병합하고 본문을 보존한 뒤
 * 파일명 규칙을 적용해 거처로 옮깁니다. C12 Inbox 처리 모드도 이 함수를 씁니다.
 */
export async function applyArrange(
	core: SaintFlowCore,
	file: TFile,
	type: CreatableType,
	result: ArrangeResult
): Promise<boolean> {
	const desired = fileNameFor(core.settings, type, result.title);
	if (!desired) {
		new Notice("파일명 규칙을 적용하면 이름이 비어 있습니다.");
		return false;
	}
	// 허브 이름은 컨테이너 폴더 이름과 같아야 하므로(규칙 3) 번호를 먼저 확정합니다.
	const name = desired === file.basename ? desired : uniqueBaseName(core.app, desired);

	await mergeTemplate(core, file, type, result.overrides);

	const folder =
		type === "project" || type === "area"
			? homeFolderFor(core.settings, type, { containerName: name })
			: result.folder;

	await moveNote(core.app, file, folder, name);
	core.index.invalidate();
	return true;
}

export async function collectInput(
	core: SaintFlowCore,
	type: CreatableType,
	file: TFile
): Promise<ArrangeResult | null> {
	const projects = activeProjectHubs(core);
	const areas = core.index.allOfType("area");
	const defaultTitle = file.basename;

	switch (type) {
		case "task": {
			const values = await openForm(core.app, {
				title: "Task로 분류",
				description: "제목은 동사로 끝나는 행동 하나여야 합니다.",
				fields: [
					{ kind: "text", key: "title", label: "제목", required: true, value: defaultTitle },
					{ kind: "dropdown", key: "status", label: "status", options: TASK_STATUS, value: "next" },
					{ kind: "link", key: "project", label: "project", files: projects },
					{ kind: "link", key: "area", label: "area", files: areas },
				],
				cta: "분류",
			});
			if (!values) return null;
			const project = pickedFile(values, "project");
			const area = pickedFile(values, "area");
			return {
				title: str(values, "title"),
				folder: homeFolderFor(core.settings, "task"),
				overrides: {
					status: str(values, "status") || "next",
					...(project ? { project: toLink(project.basename) } : {}),
					...(area ? { area: toLink(area.basename) } : {}),
				},
			};
		}
		case "project": {
			const values = await openForm(core.app, {
				title: "Project로 분류",
				description: "완료 조건은 판정 가능한 한 문장이어야 합니다.",
				fields: [
					{ kind: "text", key: "title", label: "이름", required: true, value: defaultTitle },
					{ kind: "textarea", key: "outcome", label: "완료 조건", required: true },
					{ kind: "link", key: "area", label: "area", files: areas },
					{ kind: "text", key: "deadline", label: "deadline", placeholder: "YYYY-MM-DD" },
					{ kind: "text", key: "repo", label: "repo", placeholder: "저장소 URL 또는 로컬 경로" },
				],
				cta: "분류",
			});
			if (!values) return null;
			const area = pickedFile(values, "area");
			return {
				title: str(values, "title"),
				folder: "",
				overrides: {
					status: "active",
					outcome: str(values, "outcome"),
					...(area ? { area: toLink(area.basename) } : {}),
					...(str(values, "deadline") ? { deadline: str(values, "deadline") } : {}),
					...(str(values, "repo") ? { repo: str(values, "repo") } : {}),
				},
			};
		}
		case "area": {
			const values = await openForm(core.app, {
				title: "Area로 분류",
				fields: [
					{ kind: "text", key: "title", label: "이름", required: true, value: defaultTitle },
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
				cta: "분류",
			});
			if (!values) return null;
			return {
				title: str(values, "title"),
				folder: "",
				overrides: {
					status: str(values, "status") || "active",
					standard: str(values, "standard"),
					...(str(values, "review_cycle") ? { review_cycle: str(values, "review_cycle") } : {}),
				},
			};
		}
		case "source": {
			const values = await openForm(core.app, {
				title: "Source로 분류",
				fields: [
					{ kind: "text", key: "title", label: "원제목", required: true, value: defaultTitle },
					{ kind: "text", key: "author", label: "author" },
					{ kind: "text", key: "url", label: "url" },
					{ kind: "text", key: "location", label: "location", placeholder: "쪽, 장, 타임스탬프" },
					{ kind: "link", key: "project", label: "project", files: projects },
					{ kind: "link", key: "area", label: "area", files: areas },
				],
				cta: "분류",
			});
			if (!values) return null;
			const project = pickedFile(values, "project");
			const area = pickedFile(values, "area");
			return {
				title: str(values, "title"),
				folder: homeFolderFor(core.settings, "source"),
				overrides: {
					...(str(values, "author") ? { author: str(values, "author") } : {}),
					...(str(values, "url") ? { url: str(values, "url") } : {}),
					...(str(values, "location") ? { location: str(values, "location") } : {}),
					...(project ? { project: [toLink(project.basename)] } : {}),
					...(area ? { area: [toLink(area.basename)] } : {}),
				},
			};
		}
		case "zettel": {
			const values = await openForm(core.app, {
				title: "Zettel로 분류",
				description: "제목은 주장 문장으로 씁니다. status는 seed로 시작합니다.",
				fields: [
					{ kind: "text", key: "title", label: "주장 문장", required: true, value: defaultTitle },
					{ kind: "link", key: "source", label: "sources", files: core.index.allOfType("source") },
					{ kind: "link", key: "project", label: "project", files: projects },
				],
				cta: "분류",
			});
			if (!values) return null;
			const source = pickedFile(values, "source");
			const project = pickedFile(values, "project");
			return {
				title: str(values, "title"),
				folder: homeFolderFor(core.settings, "zettel"),
				overrides: {
					status: "seed",
					recall: false,
					box: 1,
					...(source ? { sources: [toLink(source.basename)] } : {}),
					...(project ? { project: [toLink(project.basename)] } : {}),
				},
			};
		}
		case "map": {
			const values = await openForm(core.app, {
				title: "Map으로 분류",
				fields: [{ kind: "text", key: "title", label: "주제", required: true, value: defaultTitle }],
				cta: "분류",
			});
			if (!values) return null;
			return {
				title: str(values, "title"),
				folder: homeFolderFor(core.settings, "map"),
				overrides: {},
			};
		}
		default:
			return null;
	}
}

/**
 * 템플릿의 속성 블록을 붙이고 본문은 그대로 둡니다.
 * 본문에 헤딩이 하나도 없으면 템플릿 골격을 아래에 덧붙입니다.
 */
async function mergeTemplate(
	core: SaintFlowCore,
	file: TFile,
	type: CreatableType,
	overrides: Record<string, unknown>
): Promise<void> {
	const existing = { ...frontMatterOf(core.app, file) };
	const template = await templateParts(core.app, core.settings, type);

	await core.app.vault.process(file, (content) => {
		const { body } = splitFrontMatter(content);
		const kept = body.replace(/^\s+/, "");
		const hasHeading = /^#{1,6}\s+/m.test(kept);
		const skeleton = hasHeading || template.body.trim() === "" ? "" : "\n" + template.body.trimStart();
		return template.frontmatter + kept + skeleton;
	});

	await setFrontMatter(core.app, file, (fm) => {
		// 수집함 항목이 이미 가지고 있던 값은 유지합니다.
		for (const [key, value] of Object.entries(existing)) {
			if (key === "type") continue;
			if (value === null || value === undefined || value === "") continue;
			if (fm[key] === null || fm[key] === undefined || fm[key] === "") fm[key] = value;
		}
		const defaults = TYPE_DEFAULTS[type] ?? {};
		for (const [key, value] of Object.entries(defaults)) {
			if (fm[key] === null || fm[key] === undefined || fm[key] === "") fm[key] = value;
		}
		fm.type = defaults.type ?? type;
		for (const [key, value] of Object.entries(overrides)) {
			if (value === undefined) continue;
			fm[key] = value;
		}
	});
}

/** C5 규칙: project 선택기는 active와 on-hold 허브만 보여줍니다. */
export function activeProjectHubs(core: SaintFlowCore): TFile[] {
	return core.index.allOfType("project").filter((f) => {
		if (isArchived(f.path, core.settings.folders.archive)) return false;
		const status = frontMatterOf(core.app, f).status;
		return status === "active" || status === "on-hold";
	});
}
