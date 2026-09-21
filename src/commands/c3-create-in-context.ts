// C3 맥락 생성: 부모 맥락에서 자식을 만들면 관계가 자동으로 기록됩니다(설계안 2.4, 규칙 9).
// C11 버튼 블록도 이 함수를 씁니다.

import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { todayISO } from "../dates";
import { toLink } from "../links";
import { CreatableType, allowedChildren, isContextParent, typeLabel } from "../model";
import {
	addConnection,
	addToMapStructure,
	closeReviewName,
	containerPathOf,
	createTypedNote,
	homeFolderFor,
} from "../relations";
import { openForm, pickFile, pickOne, promptRequired, str } from "../ui/modals";
import { typeOf } from "../vault-io";
import { t } from "../i18n";

/** 부모를 정하고 허용된 자식 유형을 만듭니다. childType을 주면 유형 선택을 건너뜁니다. */
export async function createInContextCommand(
	core: SaintFlowCore,
	options: { parent?: TFile; childType?: CreatableType } = {}
): Promise<TFile | null> {
	const parent = await resolveParent(core, options.parent);
	if (!parent) return null;

	const parentType = typeOf(core.app, parent);
	const allowed = allowedChildren(parentType);
	if (allowed.length === 0) {
		new Notice(t("{0}은(는) 자식을 만들 수 있는 부모가 아닙니다.", parent.basename));
		return null;
	}

	let childType = options.childType ?? null;
	if (childType && !allowed.includes(childType)) {
		new Notice(t("{0}은(는) {1} 맥락에서 만들 수 없습니다.", typeLabel(childType), parentType));
		return null;
	}
	if (!childType) {
		childType = await pickOne<CreatableType>(
			core.app,
			allowed.map((type) => ({ value: type, label: typeLabel(type) })),
			t("{0} 아래에 무엇을 만들까요?", parent.basename)
		);
	}
	if (!childType) return null;

	return await createChild(core, parent, parentType, childType);
}

/** 부모가 없으면 선택기로 고릅니다(설계안 C3: 부모가 없으면 C5 선택기). */
async function resolveParent(core: SaintFlowCore, given?: TFile): Promise<TFile | null> {
	const candidate = given ?? core.app.workspace.getActiveFile();
	if (candidate && isContextParent(typeOf(core.app, candidate))) return candidate;

	const parents = core.app.vault
		.getMarkdownFiles()
		.filter((f) => isContextParent(typeOf(core.app, f)))
		.sort((a, b) => a.basename.localeCompare(b.basename));
	if (parents.length === 0) {
		new Notice(t("부모가 될 노트가 없습니다. 먼저 프로젝트나 영역을 만드세요."));
		return null;
	}
	return await pickFile(core.app, parents, t("부모 노트 고르기"));
}

async function createChild(
	core: SaintFlowCore,
	parent: TFile,
	parentType: string | null,
	childType: CreatableType
): Promise<TFile | null> {
	const parentLink = toLink(parent.basename);

	// Zettel 사이 연결은 이유가 필수입니다(설계안 2.4, C6).
	let connectionReason: string | null = null;
	if (parentType === "zettel" && childType === "zettel") {
		connectionReason = await promptRequired(
			core.app,
			{
				title: t("연결 이유"),
				description: t("새 Zettel이 \"{0}\"과(와) 어떻게 이어지는지 한 줄로 씁니다.", parent.basename),
				cta: t("다음"),
			},
			t("연결 이유가 없으면 만들지 않습니다.")
		);
		if (!connectionReason) return null;
	}

	const titleLabel = childType === "zettel" ? t("주장 문장") : childType === "task" ? t("행동") : t("제목");
	let title = "";
	let extra: Record<string, unknown> = {};

	if (childType === "project") {
		const values = await openForm(core.app, {
			title: t("프로젝트 만들기"),
			description: t("완료 조건은 판정 가능한 한 문장이어야 합니다."),
			fields: [
				{ kind: "text", key: "title", label: t("이름"), required: true },
				{ kind: "textarea", key: "outcome", label: t("완료 조건"), required: true },
				{ kind: "text", key: "deadline", label: "deadline", placeholder: "YYYY-MM-DD" },
			],
		});
		if (!values) return null;
		title = str(values, "title");
		extra = {
			outcome: str(values, "outcome"),
			...(str(values, "deadline") ? { deadline: str(values, "deadline") } : {}),
		};
	} else if (childType === "review-close") {
		title = closeReviewName(core.settings, parent.basename);
		extra = { date: todayISO() };
	} else {
		const value = await promptRequired(
			core.app,
			{
				title: t("{0} 만들기", typeLabel(childType)),
				description: t("부모: {0}", parent.basename),
				placeholder: titleLabel,
				cta: t("만들기"),
			},
			t("제목이 비어 있습니다.")
		);
		if (!value) return null;
		title = value;
	}

	const folder = folderFor(core, parent, childType);
	const overrides = { ...relationOverrides(parentType, childType, parentLink), ...extra };

	const child = await createTypedNote(core, childType, { title, folder, overrides });
	if (!child) return null;

	if (parentType === "map" && childType === "zettel") {
		await addToMapStructure(core, parent, child.basename);
	}
	if (connectionReason) {
		await addConnection(core, child, parent.basename, connectionReason);
	}

	await core.app.workspace.getLeaf(false).openFile(child);
	new Notice(`${parent.basename} → ${child.basename}`);
	return child;
}

/** 2.4 자동 기록: 관계는 자식 쪽 속성에 씁니다. Map만 부모가 링크를 소유합니다. */
function relationOverrides(
	parentType: string | null,
	childType: CreatableType,
	parentLink: string
): Record<string, unknown> {
	if (parentType === "project") {
		if (childType === "zettel") return { project: [parentLink] };
		if (childType === "source") return { project: [parentLink] };
		return { project: parentLink };
	}
	if (parentType === "area") {
		if (childType === "zettel" || childType === "source") return { area: [parentLink] };
		return { area: parentLink };
	}
	if (parentType === "source" && childType === "zettel") return { sources: [parentLink] };
	return {};
}

/** Working과 Output은 부모 컨테이너 안에 둡니다(설계안 3.3). */
function folderFor(core: SaintFlowCore, parent: TFile, childType: CreatableType): string | undefined {
	if (childType === "working" || childType === "output") return containerPathOf(core.app, parent);
	// 프로젝트와 영역은 컨테이너 폴더 이름이 확정된 파일명과 같아야 하므로 createTypedNote에 맡깁니다.
	if (childType === "project" || childType === "area") return undefined;
	return homeFolderFor(core.settings, childType);
}
