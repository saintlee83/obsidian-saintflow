// C2 분류: 0_Sweep의 파일을 유형별 거처로 보냅니다.
// 템플릿 속성을 병합하고 본문은 보존합니다. 파일명 규칙을 적용한 뒤 이동합니다.

import { Notice, TFile, parseYaml } from "obsidian";
import { DISPATCH, appendMissingSections, arrangeProperties } from "../arrange";
import type { SaintFlowCore } from "../core";
import { isoFromTimestamp } from "../dates";
import { t } from "../i18n";
import { toLink } from "../links";
import {
	ARRANGE_TYPES,
	CreatableType,
	areaStatusOptions,
	outputStatusOptions, resourceStatusOptions,
	reviewCycleOptions,
	taskStatusOptions,
	typeLabel
} from "../model";
import { fileNameFor, homeFolderFor } from "../relations";
import { isInboxNote } from "../scope";
import { splitFrontMatter } from "../sections";
import { templateParts } from "../templates";
import { confirm, openForm, pickOne, file as pickedFile, str } from "../ui/modals";
import { frontMatterOf, moveNote, setFrontMatter, uniqueBaseName } from "../vault-io";

type ArrangeChoice = CreatableType | "delete";

export interface ArrangeResult {
	title: string;
	overrides: Record<string, unknown>;
	folder: string;
}

export async function arrangeCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const file = target ?? core.app.workspace.getActiveFile();
	if (!file) {
		new Notice(t("분류할 파일을 먼저 여세요."));
		return;
	}
	const sweep = core.settings.folders.sweep;
	if (!isInboxNote(core.settings, file.path, frontMatterOf(core.app, file))) {
		new Notice(t("{0}에 있는 파일만 분류합니다.", sweep));
		return;
	}

	const dispatch = frontMatterOf(core.app, file).dispatch;
	const choice = (typeof dispatch === "string" ? DISPATCH[dispatch] : null) ?? await pickOne<ArrangeChoice>(
		core.app,
		[
			...ARRANGE_TYPES.map((type) => ({ value: type as ArrangeChoice, label: typeLabel(type) })),
			{ value: "delete" as ArrangeChoice, label: t("삭제 (휴지통)") },
		],
		t("무엇으로 분류할까요?")
	);
	if (!choice) return;

	if (choice === "delete") {
		const ok = await confirm(core.app, {
			title: t("삭제"),
			message: t("{0}을(를) 휴지통으로 보냅니다.", file.basename),
			cta: t("휴지통으로"),
			warning: true,
		});
		if (!ok) return;
		await core.app.fileManager.trashFile(file);
		core.index.invalidate();
		new Notice(t("휴지통으로 보냈습니다."));
		return;
	}

	const result = await collectInput(core, choice, file);
	if (!result) return;

	const ok = await applyArrange(core, file, choice, result);
	if (ok) new Notice(`${typeLabel(choice)} → ${file.path}`);
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
		new Notice(t("파일명 규칙을 적용하면 이름이 비어 있습니다."));
		return false;
	}
	// 이동 전에 이름을 확정합니다.
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
	const current = frontMatterOf(core.app, file);

	switch (type) {
		case "task": {
			const values = await openForm(core.app, {
				title: t("Task로 분류"),
				description: t("제목은 동사로 끝나는 행동 하나여야 합니다."),
				fields: [
					{ kind: "text", key: "title", label: t("제목"), required: true, value: defaultTitle },
					{ kind: "dropdown", key: "status", label: "status", options: taskStatusOptions(), value: String(current.status ?? "next") },
					{ kind: "link", key: "project", label: "project", files: projects },
					{ kind: "link", key: "area", label: "area", files: areas },
				],
				cta: t("분류"),
			});
			if (!values) return null;
			const project = pickedFile(values, "project");
			const area = pickedFile(values, "area");
			return {
				title: str(values, "title"),
				folder: homeFolderFor(core.settings, "task"),
				overrides: {
					status: str(values, "status") || "next",
					...(project ? { project: [toLink(project.basename)] } : {}),
					...(area ? { area: [toLink(area.basename)] } : {}),
				},
			};
		}
		case "project": {
			const values = await openForm(core.app, {
				title: t("Project로 분류"),
				description: t("완료 조건은 판정 가능한 한 문장이어야 합니다."),
				fields: [
					{ kind: "text", key: "title", label: t("이름"), required: true, value: defaultTitle },
					{ kind: "textarea", key: "done_criteria", label: t("완료 조건"), required: true, value: String(current.done_criteria ?? "") },
					{ kind: "link", key: "area", label: "area", files: areas },
					{ kind: "text", key: "due", label: "due", placeholder: "YYYY-MM-DD" },
					{ kind: "text", key: "repo", label: "repo", placeholder: t("저장소 URL 또는 로컬 경로") },
				],
				cta: t("분류"),
			});
			if (!values) return null;
			const area = pickedFile(values, "area");
			return {
				title: str(values, "title"),
				folder: "",
				overrides: {
					status: current.status ?? "active",
					done_criteria: str(values, "done_criteria"),
					...(area ? { area: [toLink(area.basename)] } : {}),
					...(str(values, "due") ? { due: str(values, "due") } : {}),
					...(str(values, "repo") ? { repo: str(values, "repo") } : {}),
				},
			};
		}
		case "area": {
			const values = await openForm(core.app, {
				title: t("Area로 분류"),
				fields: [
					{ kind: "text", key: "title", label: t("이름"), required: true, value: defaultTitle },
					{ kind: "textarea", key: "standard", label: t("유지 기준"), required: true, value: String(current.standard ?? "") },
					{ kind: "dropdown", key: "status", label: "status", options: areaStatusOptions(), value: String(current.status ?? "active") },
					{
						kind: "dropdown",
						key: "review_cycle",
						label: "review_cycle",
						options: reviewCycleOptions(),
						value: String(current.review_cycle ?? "매월"),
					},
				],
				cta: t("분류"),
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
		case "resource": {
			const values = await openForm(core.app, {
				title: t("Resource로 분류"),
				fields: [
					{ kind: "text", key: "title", label: t("원제목"), required: true, value: defaultTitle },
					{ kind: "text", key: "author", label: "author" },
					{ kind: "text", key: "link", label: "link", value: String(current.link ?? "") },
					{ kind: "dropdown", key: "status", label: "status", options: resourceStatusOptions(), value: String(current.status ?? "to read") },
					{ kind: "text", key: "kind", label: "kind", value: String(current.kind ?? "") },
					{ kind: "link", key: "project", label: "project", files: projects },
					{ kind: "link", key: "area", label: "area", files: areas },
				],
				cta: t("분류"),
			});
			if (!values) return null;
			const project = pickedFile(values, "project");
			const area = pickedFile(values, "area");
			return {
				title: str(values, "title"),
				folder: homeFolderFor(core.settings, "resource"),
				overrides: {
					status: str(values, "status"),
					...(str(values, "author") ? { author: str(values, "author") } : {}),
					...(str(values, "link") ? { link: str(values, "link") } : {}),
					...(str(values, "kind") ? { kind: str(values, "kind") } : {}),
					...(project ? { project: [toLink(project.basename)] } : {}),
					...(area ? { area: [toLink(area.basename)] } : {}),
				},
			};
		}
		case "zettel": {
			const values = await openForm(core.app, {
				title: t("Zettel로 분류"),
				description: t("제목은 주장 문장으로 씁니다. maturity는 seed로 시작합니다."),
				fields: [
					{ kind: "text", key: "title", label: t("주장 문장"), required: true, value: defaultTitle },
					{ kind: "link", key: "source", label: "source", files: core.index.allOfType("resource") },
					{ kind: "link", key: "project", label: "project", files: projects },
				],
				cta: t("분류"),
			});
			if (!values) return null;
			const source = pickedFile(values, "source");
			const project = pickedFile(values, "project");
			return {
				title: str(values, "title"),
				folder: homeFolderFor(core.settings, "zettel"),
				overrides: {

					...(source ? { source: [toLink(source.basename)] } : {}),
					...(project ? { project: [toLink(project.basename)] } : {}),
				},
			};
		}
		case "output": {
			const values = await openForm(core.app, {
				title: "Output", fields: [
					{ kind: "text", key: "title", label: t("제목"), required: true, value: defaultTitle },
					{ kind: "dropdown", key: "status", label: "status", options: outputStatusOptions(), value: String(current.status ?? "draft") },
					{ kind: "link", key: "project", label: "project", files: projects },
				], cta: t("분류"),
			});
			if (!values) return null;
			const project = pickedFile(values, "project");
			return { title: str(values, "title"), folder: homeFolderFor(core.settings, "output"), overrides: { status: str(values, "status"), ...(project ? { project: [toLink(project.basename)] } : {}) } };
		}
		case "map": {
			const values = await openForm(core.app, {
				title: t("Map으로 분류"),
				fields: [{ kind: "text", key: "title", label: t("주제"), required: true, value: defaultTitle }],
				cta: t("분류"),
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
	const template = await templateParts(core.app, core.settings, type, { title: file.basename });
	const templateFm = parseYaml(template.frontmatter.replace(/^---\r?\n/, "").replace(/\r?\n---\s*$/, "")) ?? {};
	await setFrontMatter(core.app, file, (fm) => {
		const merged = arrangeProperties(fm, templateFm, type, isoFromTimestamp(file.stat.ctime), overrides);
		for (const key of Object.keys(fm)) delete fm[key];
		Object.assign(fm, merged);
	});
	await core.app.vault.process(file, content => {
		const { frontmatter, body } = splitFrontMatter(content);
		return (frontmatter ?? "") + appendMissingSections(body, template.body);
	});
}

/** 보관되거나 종료되지 않은 프로젝트를 고릅니다. */
export function activeProjectHubs(core: SaintFlowCore): TFile[] {
	return core.index.allOfType("project").filter((f) => {
		if (core.index.isArchivedFile(f)) return false;
		const status = frontMatterOf(core.app, f).status;
		return ["planned", "active", "paused", "someday"].includes(String(status));
	});
}
