// 템플릿 읽기(설계안 3.9). 템플릿이 없어도 동작하도록 내장 골격을 둡니다.
// 플러그인은 골격과 링크 줄만 만듭니다(규칙 6).

import { App, TFile, moment, normalizePath } from "obsidian";
import type { SaintFlowSettings } from "./config";
import { todayISO } from "./dates";
import { CreatableType, TYPE_TEMPLATE } from "./model";
import { joinPath } from "./naming";
import { splitFrontMatter } from "./sections";

import type momentFn from "moment";
import { DEFAULT_TEMPLATES } from "./default-templates";

export interface TemplateVars {
	date?: string;
	time?: string;
	title?: string;
}

export function renderTemplate(raw: string, vars: TemplateVars = {}): string {
	const date = vars.date ?? todayISO();
	const time = vars.time ?? "";
	return raw
		.replace(/\{\{\s*date(?:\s*:\s*([^}]+?))?\s*\}\}/g, (_match, format: string | undefined) => format ? (moment as unknown as typeof momentFn)(date).format(format.trim()) : date)
		.replace(/\{\{\s*time\s*\}\}/g, () => time)
		.replace(/\{\{\s*title\s*\}\}/g, () => vars.title ?? "");
}

function templatePath(settings: SaintFlowSettings, type: CreatableType): string {
	return normalizePath(joinPath(settings.folders.templates, `${TYPE_TEMPLATE[type]}.md`));
}

/** 템플릿 원문을 읽습니다. 파일이 없으면 내장 골격을 씁니다. */
export async function templateContent(
	app: App,
	settings: SaintFlowSettings,
	type: CreatableType,
	vars: TemplateVars = {}
): Promise<string> {
	const file = app.vault.getAbstractFileByPath(templatePath(settings, type));
	const raw = file instanceof TFile ? await app.vault.cachedRead(file) : (DEFAULT_TEMPLATES[type] ?? "");
	return renderTemplate(raw, vars);
}

/** 템플릿의 frontmatter 블록과 본문을 따로 돌려줍니다. C2가 속성만 병합할 때 씁니다. */
export async function templateParts(
	app: App,
	settings: SaintFlowSettings,
	type: CreatableType,
	vars: TemplateVars = {}
): Promise<{ frontmatter: string; body: string }> {
	const raw = await templateContent(app, settings, type, vars);
	const split = splitFrontMatter(raw);
	return { frontmatter: split.frontmatter ?? "---\n---\n", body: split.body };
}
