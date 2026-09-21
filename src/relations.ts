// 노트 생성과 관계 기록(설계안 2.4). 거처와 파일명 규칙 자체는 placement.ts에 있습니다.
// C2 분류, C3 맥락 생성, C4 새 컨테이너, C11~C14가 모두 이 모듈을 씁니다.

import { App, Notice, TFile, TFolder } from "obsidian";
import type { SaintFlowCore } from "./core";
import { addLinkToList, linkTargets, toLink } from "./links";
import { CreatableType, RelationField, TYPE_DEFAULTS, fieldIsMulti } from "./model";
import { ZETTEL_TITLE_HINT } from "./naming";
import { closeReviewName, fileNameFor, homeFolderFor, prefixFor } from "./placement";
import { SECTION, appendToSection } from "./sections";
import { TemplateVars, templateContent } from "./templates";
import { containerFolderOf, createNote, setFrontMatter, uniqueBaseName, updateBody } from "./vault-io";
import { t } from "./i18n";

export { closeReviewName, fileNameFor, homeFolderFor, prefixFor };

/** 컨테이너 폴더 경로. 허브가 컨테이너 안에 없으면 허브가 있는 폴더를 씁니다. */
export function containerPathOf(app: App, hub: TFile): string {
	const container = containerFolderOf(app, hub);
	if (container) return container.path;
	return hub.parent?.path ?? "";
}

export interface CreateOptions {
	title: string;
	folder?: string;
	overrides?: Record<string, unknown>;
	templateVars?: TemplateVars;
	/** 만든 뒤 본문에 더할 줄. 연결 섹션 삽입이나 선택 영역 이동에 씁니다. */
	bodyEdit?: (body: string) => string;
}

/** 템플릿 골격으로 노트 하나를 만들고 기본값과 관계를 기록합니다. */
export async function createTypedNote(
	core: SaintFlowCore,
	type: CreatableType,
	opts: CreateOptions
): Promise<TFile | null> {
	const desired = fileNameFor(core.settings, type, opts.title);
	if (!desired) {
		new Notice(t("파일명 규칙을 적용하면 이름이 비어 있습니다. 다른 제목을 쓰세요."));
		return null;
	}
	if (type === "zettel" && desired.length > ZETTEL_TITLE_HINT) {
		new Notice(t("Zettel 제목이 {0}자입니다. {1}자 안팎을 권장합니다.", desired.length, ZETTEL_TITLE_HINT));
	}
	// 허브 이름은 컨테이너 폴더 이름과 같아야 하므로(규칙 3) 번호를 먼저 확정합니다.
	const name = uniqueBaseName(core.app, desired);
	const folder = opts.folder ?? homeFolderFor(core.settings, type, { containerName: name });
	const content = await templateContent(core.app, core.settings, type, {
		title: name,
		...(opts.templateVars ?? {}),
	});
	const file = await createNote(core.app, folder, name, content);

	await setFrontMatter(core.app, file, (fm) => {
		const defaults = TYPE_DEFAULTS[type] ?? {};
		for (const [key, value] of Object.entries(defaults)) {
			if (fm[key] === undefined || fm[key] === null || fm[key] === "") fm[key] = value;
		}
		for (const [key, value] of Object.entries(opts.overrides ?? {})) {
			if (value === undefined) continue;
			fm[key] = value;
		}
	});

	if (opts.bodyEdit) await updateBody(core.app, file, opts.bodyEdit);
	core.index.invalidate();
	return file;
}

/** 관계 한 건을 자식 쪽 속성에 씁니다(규칙 8). 다중 필드는 리스트에 더합니다. */
export async function recordRelation(
	core: SaintFlowCore,
	child: TFile,
	field: RelationField,
	parentName: string,
	childType: unknown
): Promise<void> {
	await setFrontMatter(core.app, child, (fm) => {
		if (fieldIsMulti(childType, field)) fm[field] = addLinkToList(fm[field], parentName);
		else fm[field] = toLink(parentName);
	});
	core.index.invalidate();
}

/** Map은 링크를 부모가 소유합니다(설계안 2.4). 부모의 구조 섹션에 자식을 더합니다. */
export async function addToMapStructure(core: SaintFlowCore, map: TFile, childName: string): Promise<void> {
	await updateBody(core.app, map, (body) =>
		appendToSection(body, SECTION.structure, `- ${toLink(childName)}`)
	);
	core.index.invalidate();
}

/** Zettel 사이의 연결은 자식의 연결 섹션에 이유와 함께 씁니다(설계안 2.4, C6). */
export async function addConnection(
	core: SaintFlowCore,
	zettel: TFile,
	targetName: string,
	reason: string
): Promise<void> {
	await updateBody(core.app, zettel, (body) =>
		appendToSection(body, SECTION.links, `- ${toLink(targetName)} — ${reason.trim()}`)
	);
	core.index.invalidate();
}

/**
 * 부모 노트의 project와 area를 자식이 물려받게 만듭니다(C13, C14).
 * 자식 유형에 따라 단일 링크와 리스트를 가려 씁니다.
 */
export function inheritedRelations(
	parentFm: Record<string, unknown>,
	childType: CreatableType
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const field of ["project", "area"] as const) {
		const targets = linkTargets(parentFm[field]);
		if (targets.length === 0) continue;
		out[field] = fieldIsMulti(childType, field) ? targets.map(toLink) : toLink(targets[0]);
	}
	return out;
}

export function folderByPath(app: App, path: string): TFolder | null {
	const f = app.vault.getAbstractFileByPath(path);
	return f instanceof TFolder ? f : null;
}
