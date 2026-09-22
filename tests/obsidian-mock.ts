import moment from "moment";
import { parse, stringify } from "yaml";
export { moment };
export const parseYaml = parse;
export const normalizePath = (path: string) => path.replace(/\\/g, "/").replace(/\/$/, "");
export class TFolder {
	children: (TFile | TFolder)[] = [];
	parent: TFolder | null = null;
	constructor(public path: string) { }
	get name() { return this.path.split("/").pop()!; }
}
export class TFile {
	parent: TFolder | null = null;
	stat = { ctime: new Date("2026-09-01T12:00:00").getTime(), mtime: Date.now(), size: 0 };
	constructor(public path: string, public content = "") { }
	get name() { return this.path.split("/").pop()!; }
	get basename() { return this.name.replace(/\.[^.]+$/, ""); }
	get extension() { return this.name.split(".").pop()!; }
}
export class Notice { constructor(..._args: unknown[]) { } }
export class Modal { }
export const choiceModals: FuzzySuggestModal[] = [];
export class FuzzySuggestModal {
	setPlaceholder(_text: string) { }
	open() { choiceModals.push(this); }
	onClose() { }
	onChooseItem(_value: unknown) { }
}
export class Setting { }
export class ItemView { }
export class WorkspaceLeaf { }
export function setIcon() { }
export function metadata(file: TFile) {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(file.content);
	const body = match ? file.content.slice(match[0].length) : file.content;
	return {
		frontmatter: (match ? parse(match[1]) : {}) ?? {},
		links: [...body.replace(/%%[\s\S]*?%%/g, "").matchAll(/\[\[([^\]]+)\]\]/g)].map(m => ({ link: m[1] })),
	};
}
export function mockApp() {
	const files = new Map<string, TFile | TFolder>();
	const root = new TFolder(""); files.set("", root);
	let active: TFile | null = null;
	function folder(path: string): TFolder {
		const existing = files.get(path);
		if (existing instanceof TFolder) return existing;
		const created = new TFolder(path);
		created.parent = folder(path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
		created.parent.children.push(created); files.set(path, created); return created;
	}
	function add(path: string, content: string) {
		if (files.has(path)) throw new Error(`Duplicate file: ${path}`);
		const file = new TFile(path, content);
		file.parent = folder(path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
		file.parent.children.push(file); files.set(path, file); return file;
	}
	const getFiles = () => [...files.values()].filter((file): file is TFile => file instanceof TFile);
	const app = {
		vault: {
			getFiles, getMarkdownFiles: () => getFiles().filter(file => file.extension === "md"),
			getAbstractFileByPath: (path: string) => files.get(path) ?? null,
			getRoot: () => root, createFolder: async (path: string) => folder(path),
			create: async (path: string, content: string) => add(path, content),
			cachedRead: async (file: TFile) => file.content,
			process: async (file: TFile, update: (body: string) => string) => { file.content = update(file.content); },
		},
		metadataCache: {
			getFileCache: metadata, unresolvedLinks: {},
			getFirstLinkpathDest: (target: string) => {
				const path = target.split("|")[0].split("#")[0];
				return getFiles().find(file => file.path === path || file.path === path + ".md" || file.basename === path) ?? null;
			},
		},
		fileManager: {
			processFrontMatter: async (file: TFile, mutate: (fm: Record<string, unknown>) => void) => {
				const fm = metadata(file).frontmatter;
				const body = file.content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
				mutate(fm); file.content = `---\n${stringify(fm)}---\n${body}`;
			},
			renameFile: async (file: TFile, path: string) => {
				if (files.has(path)) throw new Error("Destination exists");
				files.delete(file.path); file.parent!.children = file.parent!.children.filter(child => child !== file);
				file.path = path; file.parent = folder(path.slice(0, path.lastIndexOf("/"))); file.parent.children.push(file); files.set(path, file);
			},
		},
		workspace: {
			getActiveFile: () => active,
			getLeaf: () => ({ openFile: async (file: TFile) => { active = file; } }),
		},
	};
	return { app, add, activate: (file: TFile) => { active = file; } };
}
