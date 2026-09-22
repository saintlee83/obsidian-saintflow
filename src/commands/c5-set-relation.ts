// C5 관계 지정: 유형으로 걸러진 선택기로 project, area, source, parent, uses를 채웁니다.
// 링크 표기는 [[파일명]]으로 통일합니다.

import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { t } from "../i18n";
import { addLinkToList, linkTargets, toLink } from "../links";
import { FIELDS_BY_TYPE, RELATION_FIELDS, RelationField, SaintType, fieldIsMulti } from "../model";
import { pickFile, pickOne } from "../ui/modals";
import { frontMatterOf, setFrontMatter, typeOf } from "../vault-io";

export async function setRelationCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const file = target ?? core.app.workspace.getActiveFile();
	if (!file) {
		new Notice(t("파일을 먼저 여세요."));
		return;
	}
	const type = typeOf(core.app, file);
	const fields = FIELDS_BY_TYPE[(type ?? "") as SaintType] ?? [];
	if (fields.length === 0) {
		new Notice(t("{0}에는 지정할 관계 필드가 없습니다.", type ?? t("유형 없음")));
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
		t("어떤 관계를 지정할까요?")
	);
	if (!field) return;

	const multi = fieldIsMulti(type, field);
	const candidates = candidatesFor(core, field, type);
	if (candidates.length === 0) {
		new Notice(t("{0}에 넣을 노트가 없습니다.", field));
		return;
	}

	const picked = await pickFile(core.app, candidates, multi ? t("{0}에 더할 노트", field) : t("{0} 고르기", field));
	if (!picked) return;
	if (picked.path === file.path) {
		new Notice(t("자기 자신은 지정할 수 없습니다."));
		return;
	}

	await setFrontMatter(core.app, file, (frontmatter) => {
		if (multi) frontmatter[field] = addLinkToList(frontmatter[field], picked.basename);
		else frontmatter[field] = toLink(picked.basename);
		if (field === "parent" && type === "task") delete frontmatter.project;
	});
	core.index.invalidate();
	new Notice(`${field}: ${picked.basename}`);
}

function describeCurrent(value: unknown): string {
	const targets = linkTargets(value);
	return targets.length > 0 ? t("현재: {0}", targets.join(", ")) : t("비어 있음");
}

/** parent는 같은 유형, project는 미보관·미종료 프로젝트만 받습니다. */
function candidatesFor(core: SaintFlowCore, field: RelationField, childType: string | null): TFile[] {
	const types = field === "parent" ? [childType as SaintType] : RELATION_FIELDS[field].types;
	const files: TFile[] = [];
	for (const type of types) files.push(...core.index.allOfType(type));

	return files.filter((f) => {
		if (core.index.isArchivedFile(f)) return false;
		if (field !== "project") return true;
		const status = frontMatterOf(core.app, f).status;
		return ["planned", "active", "paused", "someday"].includes(String(status));
	});
}
