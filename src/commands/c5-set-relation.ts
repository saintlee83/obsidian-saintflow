// C5 관계 지정: 유형으로 걸러진 선택기로 project, area, sources, uses를 채웁니다.
// 링크 표기는 [[파일명]]으로 통일합니다.

import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { addLinkToList, linkTargets, toLink } from "../links";
import { FIELDS_BY_TYPE, RELATION_FIELDS, RelationField, SaintType, fieldIsMulti } from "../model";
import { pickFile, pickOne } from "../ui/modals";
import { frontMatterOf, isArchived, setFrontMatter, typeOf } from "../vault-io";

export async function setRelationCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const file = target ?? core.app.workspace.getActiveFile();
	if (!file) {
		new Notice("파일을 먼저 여세요.");
		return;
	}
	const type = typeOf(core.app, file);
	const fields = FIELDS_BY_TYPE[(type ?? "") as SaintType] ?? [];
	if (fields.length === 0) {
		new Notice(`${type ?? "유형 없음"}에는 지정할 관계 필드가 없습니다.`);
		return;
	}

	const fm = frontMatterOf(core.app, file);
	const field = await pickOne<RelationField>(
		core.app,
		fields.map((f) => ({
			value: f,
			label: RELATION_FIELDS[f].label,
			description: describeCurrent(fm[f]),
		})),
		"어떤 관계를 지정할까요?"
	);
	if (!field) return;

	const multi = fieldIsMulti(type, field);
	const candidates = candidatesFor(core, field);
	if (candidates.length === 0) {
		new Notice(`${field}에 넣을 노트가 없습니다.`);
		return;
	}

	const picked = await pickFile(core.app, candidates, multi ? `${field}에 더할 노트` : `${field} 고르기`);
	if (!picked) return;
	if (picked.path === file.path) {
		new Notice("자기 자신은 지정할 수 없습니다.");
		return;
	}

	await setFrontMatter(core.app, file, (frontmatter) => {
		if (multi) frontmatter[field] = addLinkToList(frontmatter[field], picked.basename);
		else frontmatter[field] = toLink(picked.basename);
	});
	core.index.invalidate();
	new Notice(`${field}: ${picked.basename}`);
}

function describeCurrent(value: unknown): string {
	const targets = linkTargets(value);
	return targets.length > 0 ? `현재: ${targets.join(", ")}` : "비어 있음";
}

/** project 선택기는 active와 on-hold 허브만 보여줍니다(설계안 C5). */
function candidatesFor(core: SaintFlowCore, field: RelationField): TFile[] {
	const types = RELATION_FIELDS[field].types;
	const files: TFile[] = [];
	for (const t of types) files.push(...core.index.allOfType(t));

	return files.filter((f) => {
		if (isArchived(f.path, core.settings.folders.archive)) return false;
		if (field !== "project") return true;
		const status = frontMatterOf(core.app, f).status;
		return status === "active" || status === "on-hold";
	});
}
