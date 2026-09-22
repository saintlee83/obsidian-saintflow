// C3 맥락 생성: 부모 맥락에서 자식을 만들면 관계가 자동으로 기록됩니다(설계안 2.4, 규칙 9).
// C11 버튼 블록도 이 함수를 씁니다.

import { Notice, TFile } from "obsidian";
import type { SaintFlowCore } from "../core";
import { todayISO } from "../dates";
import { t } from "../i18n";
import { toLink } from "../links";
import { allowedChildren, ARRANGE_TYPES, contextRelations, CreatableType, isContextParent, typeLabel } from "../model";
import {
	addConnection,
	addToMapStructure,
	closeReviewName,
	createTypedNote,
	homeFolderFor
} from "../relations";
import { openForm, pickOne, promptRequired, str } from "../ui/modals";
import { frontMatterOf, typeOf } from "../vault-io";

/** 부모를 정하고 허용된 자식 유형을 만듭니다. childType을 주면 유형 선택을 건너뜁니다. */
export async function createInContextCommand(
	core: SaintFlowCore,
	options: { parent?: TFile; childType?: CreatableType } = {}
): Promise<TFile | null> {
	const candidate = options.parent ?? core.app.workspace.getActiveFile();
	const parent = candidate && isContextParent(typeOf(core.app, candidate)) ? candidate : null;
	const parentType = parent ? typeOf(core.app, parent) : null;
	const allowed = parent ? allowedChildren(parentType) : ARRANGE_TYPES;
	let childType = options.childType ?? null;
	if (childType && !allowed.includes(childType)) {
		new Notice(t("{0}은(는) {1} 맥락에서 만들 수 없습니다.", typeLabel(childType), parentType));
		return null;
	}
	if (!childType) childType = await pickOne<CreatableType>(core.app, allowed.map(type => ({ value: type, label: typeLabel(type) })), parent ? t("{0} 아래에 무엇을 만들까요?", parent?.basename ?? "") : t("무엇으로 분류할까요?"));
	if (!childType) return null;
	return createChild(core, parent, parentType, childType);
}

async function createChild(
	core: SaintFlowCore,
	parent: TFile | null,
	parentType: string | null,
	childType: CreatableType
): Promise<TFile | null> {
	const parentLink = parent ? toLink(parent?.basename ?? "") : "";

	// Zettel 사이 연결은 이유가 필수입니다(설계안 2.4, C6).
	let connectionReason: string | null = null;
	if (parentType === "zettel" && childType === "zettel") {
		connectionReason = await promptRequired(
			core.app,
			{
				title: t("연결 이유"),
				description: t("새 Zettel이 \"{0}\"과(와) 어떻게 이어지는지 한 줄로 씁니다.", parent?.basename ?? ""),
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
				{ kind: "textarea", key: "done_criteria", label: t("완료 조건"), required: true },
				{ kind: "text", key: "due", label: "due", placeholder: "YYYY-MM-DD" },
			],
		});
		if (!values) return null;
		title = str(values, "title");
		extra = {
			done_criteria: str(values, "done_criteria"),
			...(str(values, "due") ? { due: str(values, "due") } : {}),
		};
	} else if (childType === "closing") {
		title = closeReviewName(core.settings, parent?.basename ?? "");
		extra = { date: todayISO() };
	} else {
		const value = await promptRequired(
			core.app,
			{
				title: t("{0} 만들기", typeLabel(childType)),
				description: t("부모: {0}", parent?.basename ?? ""),
				placeholder: titleLabel,
				cta: t("만들기"),
			},
			t("제목이 비어 있습니다.")
		);
		if (!value) return null;
		title = value;
	}

	const folder = homeFolderFor(core.settings, childType);
	const overrides = { ...contextRelations(parentType, childType, parentLink, parent ? frontMatterOf(core.app, parent) : {}), ...extra };

	const child = await createTypedNote(core, childType, { title, folder, overrides });
	if (!child) return null;

	if (parentType === "map" && childType === "zettel") {
		await addToMapStructure(core, parent!, child.basename);
	}
	if (connectionReason) {
		await addConnection(core, parent!, child.basename, connectionReason);
	}

	await core.app.workspace.getLeaf(false).openFile(child);
	new Notice(`${parent?.basename ?? ""} → ${child.basename}`);
	return child;
}
