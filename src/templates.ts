// 템플릿 읽기(설계안 3.9). 템플릿이 없어도 동작하도록 내장 골격을 둡니다.
// 플러그인은 골격과 링크 줄만 만듭니다(규칙 6).

import { App, TFile, normalizePath } from "obsidian";
import { CreatableType, TYPE_TEMPLATE } from "./model";
import { joinPath } from "./naming";
import { splitFrontMatter } from "./sections";
import type { SaintFlowSettings } from "./config";
import { todayISO } from "./dates";

/** 템플릿 파일이 없을 때 쓰는 최소 골격입니다. 본문 구조는 설계안 2.5를 따릅니다. */
const FALLBACK: Partial<Record<CreatableType, string>> = {
	task: ["---", "type: task", "status: next", "---", "", "## 체크리스트", "- [ ] ", ""].join("\n"),
	project: [
		"---",
		"type: project",
		"status: active",
		"---",
		"",
		"## 완료 조건",
		"판정 가능한 문장으로 적습니다.",
		"",
		"## 이 프로젝트의 Task",
		"![[Tasks.base#연결된 Task]]",
		"",
		"## 관련 지식",
		"![[Knowledge.base#연결된 지식]]",
		"",
	].join("\n"),
	area: ["---", "type: area", "status: active", "---", "", "## 유지 기준", ""].join("\n"),
	working: ["---", "type: working", "---", "", "## 목적", "", "## 내용", ""].join("\n"),
	output: [
		"---",
		"type: output",
		"status: draft",
		"---",
		"",
		"## 결과물",
		"",
		"## 사용한 지식",
		"uses 속성에 사용한 Zettel과 Source를 링크합니다.",
		"",
	].join("\n"),
	source: [
		"---",
		"type: source",
		"---",
		"",
		"## 핵심 내용",
		"",
		"## 자기 말 요약",
		"",
		"## 추출할 생각",
		"- [ ] ",
		"",
	].join("\n"),
	zettel: [
		"---",
		"type: zettel",
		"status: seed",
		"recall: false",
		"box: 1",
		"---",
		"",
		"## 생각",
		"원문을 닫고 자기 말로 씁니다.",
		"",
		"## 근거",
		"",
		"## 적용 조건과 한계",
		"",
		"## 연결",
		"- [[ ]] — 연결한 이유",
		"",
		"## 회상 질문",
		"",
		"## 인출 기록",
		"- YYYY-MM-DD pass/fail — 틀린 점",
		"",
	].join("\n"),
	map: [
		"---",
		"type: map",
		"---",
		"",
		"## 이 지도가 답하는 질문",
		"",
		"## 구조",
		"- [[ ]]",
		"",
		"## 열린 질문",
		"",
	].join("\n"),
	session: ["---", "type: session", "date: {{date}}", "---", "", "# 회상 세션 {{date}}", ""].join("\n"),
	review: ["---", "type: review", "cycle: weekly", "date: {{date}}", "---", "", "# 주간 검토 {{date}}", ""].join(
		"\n"
	),
	"review-close": [
		"---",
		"type: review",
		"cycle: project-close",
		"date: {{date}}",
		"---",
		"",
		"# 프로젝트 종료 검토",
		"",
		"## 회고",
		"",
	].join("\n"),
};

export interface TemplateVars {
	date?: string;
	time?: string;
	title?: string;
}

export function renderTemplate(raw: string, vars: TemplateVars = {}): string {
	const date = vars.date ?? todayISO();
	const time = vars.time ?? "";
	return raw
		.replace(/\{\{\s*date\s*\}\}/g, date)
		.replace(/\{\{\s*time\s*\}\}/g, time)
		.replace(/\{\{\s*title\s*\}\}/g, vars.title ?? "");
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
	const raw = file instanceof TFile ? await app.vault.cachedRead(file) : (FALLBACK[type] ?? "");
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
