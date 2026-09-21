// C15 규칙 검사. 판정은 vault를 모르는 순수 함수로 두고, 사실 수집과 수정 적용은 lint-vault.ts가 합니다.

import type { SaintFlowSettings } from "./config";
import { SaintType } from "./model";
import { baseNameOf, folderOf, joinPath } from "./naming";
import { containerRootFor, fileNameFor, fixedHomeFor, placementKind } from "./placement";
import { missingRequired, schemaFor, valueProblems } from "./schema";
import { t } from "./i18n";

export type RuleId =
	| "home"
	| "required"
	| "filename"
	| "hub-name"
	| "container-contents"
	| "folder-depth"
	| "relation"
	| "value-range";

/** 규칙 이름은 화면과 리포트에만 쓰므로 언어 설정을 따릅니다. */
export function ruleLabel(rule: RuleId): string {
	switch (rule) {
		case "home":
			return t("유형과 거처");
		case "required":
			return t("필수 속성");
		case "filename":
			return t("파일명");
		case "hub-name":
			return t("허브 이름");
		case "container-contents":
			return t("컨테이너 내용");
		case "folder-depth":
			return t("폴더 깊이");
		case "relation":
			return t("관계 무결성");
		case "value-range":
			return t("값 범위");
	}
}

export type QuickFixKind = "move" | "rename" | "open" | "set-value" | "add-props" | "none";

export interface QuickFix {
	kind: QuickFixKind;
	label: string;
	folder?: string;
	name?: string;
	key?: string;
	values?: readonly string[];
	keys?: string[];
}

export interface Violation {
	rule: RuleId;
	/** 파일 경로. 폴더 규칙이면 폴더 경로입니다. */
	path: string;
	name: string;
	message: string;
	fix: QuickFix;
}

export interface LinkFact {
	field: string;
	target: string;
	resolved: boolean;
	targetArchived: boolean;
}

export interface NoteFacts {
	path: string;
	basename: string;
	folder: string;
	type: string | null;
	fm: Record<string, unknown>;
	archived: boolean;
	/** 이 노트를 담고 있는 컨테이너 폴더 경로. 컨테이너 밖이면 null입니다. */
	container: string | null;
	links: LinkFact[];
}

export interface FolderFacts {
	path: string;
	name: string;
	archived: boolean;
	/** 컨테이너 루트(Projects, Areas) 바로 아래 폴더인지. */
	isContainer: boolean;
	/** 폴더와 이름이 같은 허브 노트가 있는지. */
	hasHub: boolean;
	/** `_files`를 뺀 하위 폴더 이름. */
	subfolders: string[];
}

const CONTAINER_FORBIDDEN: SaintType[] = ["task", "zettel", "source"];

function parentOf(path: string): string {
	return folderOf(path);
}

function lastSegment(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1);
}

/** 노트 하나를 검사합니다. 보관된 노트는 거처와 파일명 규칙에서 빼고 봅니다. */
export function checkNote(facts: NoteFacts, settings: SaintFlowSettings): Violation[] {
	const out: Violation[] = [];
	const type = facts.type;
	const schema = schemaFor(type);
	const base = { path: facts.path, name: facts.basename };

	if (!type || !schema) return out;
	const saintType = type as SaintType;

	// 컨테이너 내용: Task, Zettel, Source는 컨테이너에 넣지 않습니다(설계안 3.3).
	const inForbiddenContainer = facts.container !== null && CONTAINER_FORBIDDEN.includes(saintType);
	if (inForbiddenContainer && !facts.archived) {
		const home = fixedHomeFor(settings, saintType);
		out.push({
			...base,
			rule: "container-contents",
			message: t(
				"{0}이(가) 컨테이너 {1} 안에 있습니다. 관계는 속성으로만 표현합니다.",
				schema.label,
				lastSegment(facts.container!)
			),
			fix: home
				? { kind: "move", label: t("{0}(으)로 이동", home), folder: home }
				: { kind: "open", label: t("파일 열기") },
		});
	}

	// 유형과 거처
	if (!facts.archived && !inForbiddenContainer) {
		out.push(...checkHome(facts, settings, saintType, schema.label));
	}

	// 허브 이름
	if (!facts.archived && (saintType === "project" || saintType === "area")) {
		const root = containerRootFor(settings, saintType);
		if (root && parentOf(facts.folder) === root) {
			const folderName = lastSegment(facts.folder);
			if (folderName !== facts.basename) {
				out.push({
					...base,
					rule: "hub-name",
					message: t("허브 이름이 컨테이너 폴더 이름({0})과 다릅니다.", folderName),
					fix: { kind: "rename", label: t("{0}(으)로 이름 변경", folderName), name: folderName },
				});
			}
		}
	}

	// 파일명
	if (!facts.archived) {
		const expected = fileNameFor(settings, saintType, facts.basename);
		if (expected && expected !== facts.basename) {
			out.push({
				...base,
				rule: "filename",
				message: t("파일명 규칙에 맞지 않습니다. 제안: {0}", expected),
				fix: { kind: "rename", label: t("{0}(으)로 이름 변경", expected), name: expected },
			});
		}
	}

	// 필수 속성
	const missing = missingRequired(schema, facts.fm);
	if (missing.length > 0) {
		out.push({
			...base,
			rule: "required",
			message: t("필수 속성이 비어 있습니다: {0}", missing.join(", ")),
			fix: { kind: "add-props", label: t("속성 추가 후 열기"), keys: missing },
		});
	}

	// 값 범위
	for (const problem of valueProblems(schema, facts.fm)) {
		out.push({
			...base,
			rule: "value-range",
			message: problem.message,
			fix: problem.allowed
				? { kind: "set-value", label: t("{0} 값 고르기", problem.key), key: problem.key, values: problem.allowed }
				: { kind: "open", label: t("파일 열기") },
		});
	}

	// 관계 무결성
	for (const link of facts.links) {
		if (!link.resolved) {
			out.push({
				...base,
				rule: "relation",
				message: t("{0}의 링크 [[{1}]]이(가) 해석되지 않습니다.", link.field, link.target),
				fix: { kind: "open", label: t("파일 열기") },
			});
			continue;
		}
		if (
			link.targetArchived &&
			!facts.archived &&
			saintType === "task" &&
			facts.fm.status !== "done" &&
			(link.field === "project" || link.field === "area")
		) {
			out.push({
				...base,
				rule: "relation",
				message: t("보관된 {0} [[{1}]]을(를) 가리키는 활성 Task입니다.", link.field, link.target),
				fix: { kind: "open", label: t("파일 열기") },
			});
		}
	}

	return out;
}

function checkHome(
	facts: NoteFacts,
	settings: SaintFlowSettings,
	type: SaintType,
	label: string
): Violation[] {
	const base = { path: facts.path, name: facts.basename };
	const kind = placementKind(type);

	if (kind === "folder") {
		const home = fixedHomeFor(settings, type);
		if (home && facts.folder !== home) {
			return [
				{
					...base,
					rule: "home",
					message: t("{0}의 거처는 {1}입니다. 지금은 {2}에 있습니다.", label, home, facts.folder || t("vault 루트")),
					fix: { kind: "move", label: t("{0}(으)로 이동", home), folder: home },
				},
			];
		}
		return [];
	}

	if (type === "project" || type === "area") {
		const root = containerRootFor(settings, type);
		if (!root) return [];
		if (facts.folder === root) {
			const expected = joinPath(root, facts.basename);
			return [
				{
					...base,
					rule: "home",
					message: t("{0} 허브는 같은 이름의 컨테이너 폴더 안에 있어야 합니다.", label),
					fix: { kind: "move", label: t("{0}(으)로 이동", expected), folder: expected },
				},
			];
		}
		if (parentOf(facts.folder) !== root) {
			const expected = joinPath(root, facts.basename);
			return [
				{
					...base,
					rule: "home",
					message: t("{0} 컨테이너는 {1} 바로 아래에 있어야 합니다. 지금은 {2}입니다.", label, root, facts.folder),
					fix: { kind: "move", label: t("{0}(으)로 이동", expected), folder: expected },
				},
			];
		}
		return [];
	}

	// working, output
	if (!facts.container) {
		return [
			{
				...base,
				rule: "home",
				message: t(
					"{0}은(는) 프로젝트나 영역 컨테이너 안에 있어야 합니다. 지금은 {1}에 있습니다.",
					label,
					facts.folder || t("vault 루트")
				),
				fix: { kind: "open", label: t("파일 열기") },
			},
		];
	}
	return [];
}

/** 컨테이너 폴더를 검사합니다. 허브 누락과 하위 폴더가 대상입니다(설계안 3.3). */
export function checkFolder(facts: FolderFacts, _settings: SaintFlowSettings): Violation[] {
	const out: Violation[] = [];
	if (!facts.isContainer || facts.archived) return out;
	const base = { path: facts.path, name: facts.name };

	if (!facts.hasHub) {
		out.push({
			...base,
			rule: "hub-name",
			message: t("컨테이너에 같은 이름의 허브 노트({0}.md)가 없습니다.", facts.name),
			fix: { kind: "none", label: t("허브를 만들어야 합니다") },
		});
	}

	if (facts.subfolders.length > 0) {
		out.push({
			...base,
			rule: "folder-depth",
			message: t("컨테이너 안의 하위 폴더는 _files만 허용합니다: {0}", facts.subfolders.join(", ")),
			fix: { kind: "none", label: t("보고만 합니다") },
		});
	}

	return out;
}

/** 규칙별로 묶습니다. 결과 화면과 리포트가 같은 순서를 씁니다. */
export function groupByRule(violations: Violation[]): { rule: RuleId; items: Violation[] }[] {
	const order: RuleId[] = [
		"home",
		"required",
		"filename",
		"hub-name",
		"container-contents",
		"folder-depth",
		"relation",
		"value-range",
	];
	return order
		.map((rule) => ({ rule, items: violations.filter((v) => v.rule === rule) }))
		.filter((group) => group.items.length > 0);
}

export { baseNameOf };
