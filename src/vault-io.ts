// 파일 조작은 Obsidian API로만 합니다(설계안 5.2).
// 이동·이름 변경은 fileManager.renameFile(링크 자동 갱신), 속성은 processFrontMatter, 생성은 vault.create.
// Node API를 쓰지 않으므로 모바일에서도 동작합니다.

import { App, TFile, TFolder, normalizePath } from "obsidian";
import { baseNameOf, folderOf, joinPath, uniqueName } from "./naming";
import { splitFrontMatter } from "./sections";
import { t } from "./i18n";

export async function ensureFolder(app: App, path: string): Promise<void> {
	const clean = normalizePath(path);
	if (!clean || clean === "/" || clean === ".") return;
	const parts = clean.split("/");
	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		const existing = app.vault.getAbstractFileByPath(current);
		if (existing instanceof TFolder) continue;
		if (existing) throw new Error(t("폴더를 만들 수 없습니다. 같은 이름의 파일이 있습니다: {0}", current));
		await app.vault.createFolder(current);
	}
}

/** vault 전체에서 쓰이지 않은 파일명을 고릅니다(설계안 3.5 규칙 4). */
export function uniqueBaseName(app: App, base: string): string {
	const used = new Set(app.vault.getMarkdownFiles().map((f) => f.basename));
	return uniqueName(base, (candidate) => used.has(candidate));
}

export async function createNote(
	app: App,
	folder: string,
	baseName: string,
	content: string
): Promise<TFile> {
	await ensureFolder(app, folder);
	const name = uniqueBaseName(app, baseName);
	const path = normalizePath(joinPath(folder, `${name}.md`));
	return await app.vault.create(path, content);
}

/** 파일을 옮기거나 이름을 바꿉니다. 링크는 Obsidian이 갱신합니다. */
export async function moveNote(
	app: App,
	file: TFile,
	targetFolder: string,
	newBaseName?: string
): Promise<TFile> {
	await ensureFolder(app, targetFolder);
	const desired = newBaseName ?? file.basename;
	const name = desired === file.basename ? desired : uniqueBaseName(app, desired);
	const path = normalizePath(joinPath(targetFolder, `${name}.md`));
	if (path === file.path) return file;
	await app.fileManager.renameFile(file, path);
	return file;
}

/** 폴더를 통째로 옮깁니다. 컨테이너 보관(C9)에 씁니다. */
export async function moveFolder(app: App, folder: TFolder, targetParent: string): Promise<void> {
	await ensureFolder(app, targetParent);
	const path = normalizePath(joinPath(targetParent, folder.name));
	if (path === folder.path) return;
	if (app.vault.getAbstractFileByPath(path)) {
		throw new Error(t("이미 같은 이름이 있습니다: {0}", path));
	}
	await app.fileManager.renameFile(folder, path);
}

export async function setFrontMatter(
	app: App,
	file: TFile,
	mutate: (fm: Record<string, unknown>) => void
): Promise<void> {
	await app.fileManager.processFrontMatter(file, mutate);
}

export function frontMatterOf(app: App, file: TFile): Record<string, unknown> {
	return (app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown>) ?? {};
}

export function typeOf(app: App, file: TFile): string | null {
	const value = frontMatterOf(app, file).type;
	return typeof value === "string" ? value : null;
}

/** 본문만 바꿉니다. frontmatter 블록은 그대로 둡니다. */
export async function updateBody(
	app: App,
	file: TFile,
	mutate: (body: string) => string
): Promise<void> {
	await app.vault.process(file, (content) => {
		const { frontmatter, body } = splitFrontMatter(content);
		return (frontmatter ?? "") + mutate(body);
	});
}

export async function readBody(app: App, file: TFile): Promise<string> {
	const content = await app.vault.cachedRead(file);
	return splitFrontMatter(content).body;
}

/** 보관 판정: 경로가 Archive 폴더로 시작하면 보관된 것으로 봅니다(설계안 5.4). */
export function isArchived(path: string, archiveRoot: string): boolean {
	const root = normalizePath(archiveRoot);
	return path === root || path.startsWith(root + "/");
}

/** frontmatter 속성 값의 [[...]]를 실제 파일로 해석합니다(설계안 5.4). */
export function resolveLink(app: App, target: string, sourcePath: string): TFile | null {
	return app.metadataCache.getFirstLinkpathDest(target, sourcePath);
}

/** 컨테이너 폴더: 폴더와 같은 이름의 허브 노트를 가진 폴더입니다(설계안 3.3). */
export function containerFolderOf(app: App, hub: TFile): TFolder | null {
	const parent = hub.parent;
	if (parent instanceof TFolder && parent.name === hub.basename) return parent;
	return null;
}

export function fileByBaseName(app: App, name: string): TFile | null {
	return app.vault.getMarkdownFiles().find((f) => f.basename === name) ?? null;
}

export function childrenOfFolder(app: App, folder: TFolder): TFile[] {
	return folder.children.filter((c): c is TFile => c instanceof TFile && c.extension === "md");
}

export { baseNameOf, folderOf, joinPath };
