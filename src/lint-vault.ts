// C15의 vault 쪽 절반. 사실을 모아 lint.ts에 넘기고, 빠른 수정을 Obsidian API로 적용합니다.

import { App, Notice, TFile, TFolder } from "obsidian";
import type { SaintFlowCore } from "./core";
import type { SaintFlowSettings } from "./config";
import { linkTargets } from "./links";
import {
	FolderFacts,
	LinkFact,
	NoteFacts,
	Violation,
	checkFolder,
	checkNote,
} from "./lint";
import { RELATION_FIELDS, RelationField } from "./model";
import { folderOf } from "./naming";
import { emptyValueFor, schemaFor } from "./schema";
import { frontMatterOf, isArchived, moveNote, resolveLink, setFrontMatter } from "./vault-io";
import { t } from "./i18n";

const LINK_FIELDS = Object.keys(RELATION_FIELDS) as RelationField[];

/** 이 경로를 담고 있는 컨테이너 폴더. Projects나 Areas 바로 아래 폴더를 찾습니다. */
export function containerOf(settings: SaintFlowSettings, path: string): string | null {
	let dir = folderOf(path);
	while (dir) {
		const parent = folderOf(dir);
		if (parent === settings.folders.projects || parent === settings.folders.areas) return dir;
		dir = parent;
	}
	return null;
}

export function noteFacts(app: App, settings: SaintFlowSettings, file: TFile): NoteFacts {
	const fm = frontMatterOf(app, file);
	const links: LinkFact[] = [];

	for (const field of LINK_FIELDS) {
		for (const target of linkTargets(fm[field])) {
			const dest = resolveLink(app, target, file.path);
			links.push({
				field,
				target,
				resolved: !!dest,
				targetArchived: dest ? isArchived(dest.path, settings.folders.archive) : false,
			});
		}
	}

	// 본문의 해석되지 않는 링크도 관계 무결성 대상입니다.
	// Obsidian 버전에 따라 unresolvedLinks에 frontmatter 링크가 섞여 들어오므로 중복을 걸러 냅니다.
	const seen = new Set(links.map((l) => l.target));
	const unresolved = app.metadataCache.unresolvedLinks[file.path] ?? {};
	for (const [target, count] of Object.entries(unresolved)) {
		if (count > 0 && !seen.has(target)) {
			links.push({ field: t("본문"), target, resolved: false, targetArchived: false });
			seen.add(target);
		}
	}

	return {
		path: file.path,
		basename: file.basename,
		folder: file.parent?.path === "/" ? "" : (file.parent?.path ?? ""),
		type: typeof fm.type === "string" ? fm.type : null,
		fm,
		archived: isArchived(file.path, settings.folders.archive),
		container: containerOf(settings, file.path),
		links,
	};
}

function folderFacts(app: App, settings: SaintFlowSettings, folder: TFolder): FolderFacts {
	const parent = folder.parent?.path === "/" ? "" : (folder.parent?.path ?? "");
	const isContainer = parent === settings.folders.projects || parent === settings.folders.areas;
	const hasHub = folder.children.some(
		(c) => c instanceof TFile && c.extension === "md" && c.basename === folder.name
	);
	const subfolders = folder.children
		.filter((c): c is TFolder => c instanceof TFolder && c.name !== "_files")
		.map((c) => c.name);
	return {
		path: folder.path,
		name: folder.name,
		archived: isArchived(folder.path, settings.folders.archive),
		isContainer,
		hasHub,
		subfolders,
	};
}

/** vault 전체 검사. 템플릿 폴더는 값이 비어 있는 골격이라 건너뜁니다. */
export function lintVault(core: SaintFlowCore): Violation[] {
	const { app, settings } = core;
	const out: Violation[] = [];
	const skip = settings.folders.templates;

	for (const file of app.vault.getMarkdownFiles()) {
		if (file.path === skip || file.path.startsWith(skip + "/")) continue;
		out.push(...checkNote(noteFacts(app, settings, file), settings));
	}

	for (const folder of allFolders(app)) {
		out.push(...checkFolder(folderFacts(app, settings, folder), settings));
	}

	return out;
}

/** 파일 하나만 검사합니다. 이동·이름 변경 이벤트에서 씁니다. */
export function lintFile(core: SaintFlowCore, file: TFile): Violation[] {
	const skip = core.settings.folders.templates;
	if (file.path === skip || file.path.startsWith(skip + "/")) return [];
	return checkNote(noteFacts(core.app, core.settings, file), core.settings);
}

function allFolders(app: App): TFolder[] {
	const out: TFolder[] = [];
	const walk = (folder: TFolder) => {
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				out.push(child);
				walk(child);
			}
		}
	};
	walk(app.vault.getRoot());
	return out;
}

export interface FixResult {
	applied: boolean;
	message: string;
}

/**
 * 빠른 수정을 적용합니다. 값 선택이 필요한 수정은 pickValue로 물어봅니다.
 * 파일 열기는 openFile이 맡습니다.
 */
export async function applyFix(
	core: SaintFlowCore,
	violation: Violation,
	helpers: {
		pickValue: (key: string, values: readonly string[]) => Promise<string | null>;
		openFile: (file: TFile) => Promise<void>;
	}
): Promise<FixResult> {
	const { app } = core;
	const target = app.vault.getAbstractFileByPath(violation.path);
	const fix = violation.fix;

	if (fix.kind === "none") return { applied: false, message: t("자동으로 고칠 수 없는 항목입니다.") };
	if (!(target instanceof TFile)) {
		return { applied: false, message: t("폴더 규칙은 직접 고쳐야 합니다.") };
	}

	switch (fix.kind) {
		case "move": {
			if (!fix.folder) return { applied: false, message: t("이동할 폴더가 없습니다.") };
			await moveNote(app, target, fix.folder);
			core.index.invalidate();
			return { applied: true, message: `${target.basename} → ${fix.folder}` };
		}
		case "rename": {
			if (!fix.name) return { applied: false, message: t("바꿀 이름이 없습니다.") };
			await moveNote(app, target, folderOf(target.path), fix.name);
			core.index.invalidate();
			return { applied: true, message: t("이름 변경: {0}", fix.name) };
		}
		case "add-props": {
			const schema = schemaFor(frontMatterOf(app, target).type);
			if (!schema) return { applied: false, message: t("유형을 알 수 없습니다.") };
			await setFrontMatter(app, target, (fm) => {
				for (const key of fix.keys ?? []) {
					const field = schema.fields.find((f) => f.key === key);
					if (!field) continue;
					if (fm[key] === undefined) fm[key] = emptyValueFor(field);
				}
			});
			core.index.invalidate();
			await helpers.openFile(target);
			return { applied: true, message: t("속성을 추가했습니다: {0}", (fix.keys ?? []).join(", ")) };
		}
		case "set-value": {
			if (!fix.key || !fix.values) return { applied: false, message: t("고를 값이 없습니다.") };
			const picked = await helpers.pickValue(fix.key, fix.values);
			if (picked === null) return { applied: false, message: t("취소했습니다.") };
			await setFrontMatter(app, target, (fm) => {
				fm[fix.key as string] = coerce(picked);
			});
			core.index.invalidate();
			return { applied: true, message: `${fix.key}: ${picked}` };
		}
		case "open": {
			await helpers.openFile(target);
			return { applied: false, message: t("파일을 열었습니다.") };
		}
	}
}

/** 선택기가 돌려주는 문자열을 스키마가 기대하는 타입으로 바꿉니다. */
function coerce(value: string): unknown {
	if (value === "true") return true;
	if (value === "false") return false;
	if (/^-?\d+$/.test(value)) return Number(value);
	return value;
}

export function noticeForViolations(count: number): void {
	if (count === 0) new Notice(t("규칙 위반이 없습니다."));
	else new Notice(t("규칙 위반 {0}건", count));
}
