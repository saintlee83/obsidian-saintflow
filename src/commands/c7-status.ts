// C7 상태 전환: 유형별 규칙을 코드로 검증합니다(설계안 5.2, 5.3).
// 조건을 못 채우면 상태를 바꾸지 않습니다.

import { Notice, TFile } from "obsidian";
import { evergreenBlockers, isOutputWithoutUses } from "../checks";
import type { SaintFlowCore } from "../core";
import { t } from "../i18n";
import {
	areaStatusOptions,
	outputStatusOptions,
	projectStatusOptions,
	resourceStatusOptions,
	taskStatusOptions,
	zettelStatusOptions,
} from "../model";
import { SECTION, parseConnections, sectionText } from "../sections";
import { confirm, pickOne, promptText } from "../ui/modals";
import { frontMatterOf, readBody, setFrontMatter, typeOf } from "../vault-io";

export async function statusCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const file = target ?? core.app.workspace.getActiveFile();
	if (!file) {
		new Notice(t("파일을 먼저 여세요."));
		return;
	}
	const type = typeOf(core.app, file);
	const fm = frontMatterOf(core.app, file);
	const current = String((type === "zettel" ? fm.maturity : fm.status) ?? "");

	const options = optionsFor(type);
	if (!options) {
		new Notice(t("Task, Project, Area, Resource, Zettel, Output에서 쓸 수 있습니다."));
		return;
	}

	const next = await pickOne<string>(
		core.app,
		Object.entries(options).map(([value, label]) => ({
			value,
			label,
			description: value === current ? t("(현재)") : "",
		})),
		t("{0} 상태", file.basename)
	);
	if (!next || next === current) return;

	switch (type) {
		case "area":
		case "resource":
			await setFrontMatter(core.app, file, (fm) => { fm.status = next; });
			break;
		case "task":
			await applyTask(core, file, next);
			break;
		case "project":
			await applyProject(core, file, next);
			break;
		case "zettel":
			await applyZettel(core, file, next);
			break;
		case "output":
			await applyOutput(core, file, next);
			break;
	}
	core.index.invalidate();
}

function optionsFor(type: string | null): Record<string, string> | null {
	switch (type) {
		case "area": return areaStatusOptions();
		case "resource": return resourceStatusOptions();
		case "task":
			return taskStatusOptions();
		case "project":
			return projectStatusOptions();
		case "zettel":
			return zettelStatusOptions();
		case "output":
			return outputStatusOptions();
		default:
			return null;
	}
}

async function applyTask(core: SaintFlowCore, file: TFile, next: string): Promise<void> {
	let waitingOn = "";
	if (next === "waiting") {
		const value = await promptText(core.app, {
			title: t("대기 대상"),
			description: t("누구의 무엇을 기다리는지와 요청일을 씁니다."),
			placeholder: t("김OO 회신 요청 2026-09-21"),
			cta: t("저장"),
		});
		if (value === null) return;
		waitingOn = value.trim();
	}
	await setFrontMatter(core.app, file, (fm) => {
		fm.status = next;
		if (next === "waiting" && waitingOn) fm.waiting_on = waitingOn;
	});
	new Notice(`status: ${next}`);
}

async function applyProject(core: SaintFlowCore, file: TFile, next: string): Promise<void> {
	if (next === "done") {
		const ok = await confirm(core.app, {
			title: t("프로젝트 종료"),
			message:
				t("종료는 수확과 보관까지 함께 해야 합니다. 'SaintFlow: 프로젝트 종료(C9)'를 쓰는 편이 안전합니다. 그래도 상태만 바꿀까요?"),
			cta: t("상태만 바꾸기"),
			warning: true,
		});
		if (!ok) return;
	}
	await setFrontMatter(core.app, file, (fm) => {
		fm.status = next;
	});
	new Notice(`status: ${next}`);
}

/** evergreen 승격은 연결 2개 이상, 모든 연결에 이유, 생각 섹션이 필요합니다(설계안 1.6). */
async function applyZettel(core: SaintFlowCore, file: TFile, next: string): Promise<void> {
	if (next === "evergreen") {
		const body = await readBody(core.app, file);
		const blockers = evergreenBlockers({
			thought: sectionText(body, SECTION.thought).replace(/%%[\s\S]*?%%/g, "").replace(/^원문을 닫고 자기 말로 씁니다\.?$/m, "").trim(),
			links: parseConnections(body).map((c) => ({ target: c.target, reason: c.reason })),
		});
		if (blockers.length > 0) {
			new Notice([t("evergreen으로 올리지 않았습니다."), ...blockers.map((b) => `· ${b}`)].join("\n"), 8000);
			return;
		}
	}
	await setFrontMatter(core.app, file, (fm) => {
		fm.maturity = next;
	});
	new Notice(`maturity: ${next}`);
}

async function applyOutput(core: SaintFlowCore, file: TFile, next: string): Promise<void> {
	if (next === "shipped" && isOutputWithoutUses(frontMatterOf(core.app, file).uses)) {
		const ok = await confirm(core.app, {
			title: t("uses가 비어 있습니다"),
			message:
				t("완료 증거는 결과물에 사용한 지식 링크입니다(설계안 1.6). uses 없이 shipped로 둘까요?"),
			cta: t("그대로 shipped"),
			warning: true,
		});
		if (!ok) return;
	}
	await setFrontMatter(core.app, file, (fm) => {
		fm.status = next;
	});
	new Notice(`status: ${next}`);
}
