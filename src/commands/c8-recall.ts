// C8 회상 세션과 채점(설계안 1.7, 5.3).
// 답안은 세션 노트에 씁니다. Zettel에는 판정 한 줄만 남깁니다.

import { Notice, TFile } from "obsidian";
import { RecallResult, gradeBox, nextReview, recallLogLine } from "../checks";
import type { SaintFlowCore } from "../core";
import { todayISO } from "../dates";
import { dueTodayZettels } from "../graph";
import { toLink } from "../links";
import { homeFolderFor } from "../relations";
import { SECTION, appendToSection, findSection, firstRecallQuestion } from "../sections";
import { templateContent } from "../templates";
import { pickFile, pickOne, promptRequired, promptText } from "../ui/modals";
import { createNote, fileByBaseName, readBody, setFrontMatter, typeOf, updateBody } from "../vault-io";

/** C8-a 세션: 오늘 복습할 Zettel마다 질문과 답안 칸을 만듭니다. */
export async function recallSessionCommand(core: SaintFlowCore): Promise<TFile | null> {
	const today = todayISO();
	const name = `${core.settings.prefixes.session}${today}`;
	const due = dueTodayZettels(core.app, core.settings, core.index, today);

	const existing = fileByBaseName(core.app, name);
	if (existing) {
		await core.app.workspace.getLeaf(false).openFile(existing);
		new Notice(`오늘 세션이 이미 있습니다. 복습 대상 ${due.length}건.`);
		return existing;
	}

	if (due.length === 0) {
		new Notice("오늘 복습할 Zettel이 없습니다.");
		return null;
	}

	const template = await templateContent(core.app, core.settings, "session", { date: today, title: name });
	const file = await createNote(core.app, homeFolderFor(core.settings, "session"), name, template);

	const blocks: string[] = [];
	for (const zettel of due) {
		const body = await readBody(core.app, zettel);
		const question = firstRecallQuestion(body);
		blocks.push(
			[
				`## ${toLink(zettel.basename)}`,
				`질문: ${question}`,
				"",
				"답안:",
				"",
				"판정:",
				"",
			].join("\n")
		);
	}

	await updateBody(core.app, file, (body) => stripSampleSection(body).trimEnd() + "\n\n" + blocks.join("\n"));
	await setFrontMatter(core.app, file, (fm) => {
		fm.type = "session";
		fm.date = today;
	});
	core.index.invalidate();

	await core.app.workspace.getLeaf(false).openFile(file);
	new Notice(`회상 세션 ${name}: ${due.length}건`);
	return file;
}

/** 템플릿이 예시로 둔 `## [[Zettel 이름]]` 블록을 지웁니다. */
function stripSampleSection(body: string): string {
	const range = findSection(body, "[[Zettel 이름]]");
	if (!range) return body;
	const lines = body.split("\n");
	return [...lines.slice(0, range.headingLine), ...lines.slice(range.end)].join("\n");
}

/** C8-b 채점: box, last_reviewed, last_result, 인출 기록을 한 번에 갱신합니다. */
export async function gradeRecallCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const zettel = await resolveZettel(core, target);
	if (!zettel) return;

	const result = await pickOne<RecallResult>(
		core.app,
		[
			{ value: "pass", label: "pass", description: "핵심 주장, 근거, 적용 사례 또는 반례를 모두 썼습니다." },
			{ value: "fail", label: "fail", description: "하나라도 빠졌습니다. box가 1로 돌아갑니다." },
		],
		`${zettel.basename} 판정`
	);
	if (!result) return;

	let note = "";
	if (result === "fail") {
		const required = await promptRequired(
			core.app,
			{ title: "틀린 점", description: "무엇이 빠졌는지 한 줄로 씁니다.", cta: "저장" },
			"틀린 점을 적어야 fail을 기록합니다."
		);
		if (!required) return;
		note = required;
	} else {
		const optional = await promptText(core.app, {
			title: "남길 말 (선택)",
			description: "비워 두어도 됩니다.",
			cta: "저장",
		});
		if (optional === null) return;
		note = optional.trim();
	}

	const today = todayISO();
	let newBox = 1;
	await setFrontMatter(core.app, zettel, (fm) => {
		if (fm.recall !== true) fm.recall = true;
		newBox = gradeBox(typeof fm.box === "number" ? fm.box : null, result);
		fm.box = newBox;
		fm.last_reviewed = today;
		fm.last_result = result;
	});

	const line = recallLogLine(today, result, note);
	await updateBody(core.app, zettel, (body) => appendToSection(body, SECTION.log, line));
	await fillSessionVerdict(core, zettel.basename, today, `${result}${note ? ` — ${note}` : ""}`);
	core.index.invalidate();

	const due = nextReview({ box: newBox, last_reviewed: today }, today, core.settings.recallIntervals);
	new Notice(`${result} · box ${newBox} · 다음 복습 ${due}`);
}

async function resolveZettel(core: SaintFlowCore, target?: TFile): Promise<TFile | null> {
	const file = target ?? core.app.workspace.getActiveFile();
	if (file && typeOf(core.app, file) === "zettel") return file;

	// 세션 노트에서 실행하면 그 세션에 올라온 Zettel 중에서 고릅니다.
	if (file && typeOf(core.app, file) === "session") {
		const body = await readBody(core.app, file);
		const names = [...body.matchAll(/^##\s+\[\[([^\]]+)\]\]/gm)].map((m) =>
			m[1].split("|")[0].split("#")[0].trim()
		);
		const files = names
			.map((n) => fileByBaseName(core.app, n))
			.filter((f): f is TFile => !!f && typeOf(core.app, f) === "zettel");
		if (files.length > 0) return await pickFile(core.app, files, "채점할 Zettel");
	}

	const recalls = core.index
		.allOfType("zettel")
		.filter((f) => (core.app.metadataCache.getFileCache(f)?.frontmatter?.recall as boolean) === true);
	if (recalls.length === 0) {
		new Notice("recall: true인 Zettel이 없습니다.");
		return null;
	}
	return await pickFile(core.app, recalls, "채점할 Zettel");
}

/** 오늘 세션 노트의 빈 `판정:` 줄만 채웁니다. 사용자가 쓴 답안은 건드리지 않습니다. */
async function fillSessionVerdict(
	core: SaintFlowCore,
	zettelName: string,
	today: string,
	verdict: string
): Promise<void> {
	const session = fileByBaseName(core.app, `${core.settings.prefixes.session}${today}`);
	if (!session) return;

	await updateBody(core.app, session, (body) => {
		const range = findSection(body, `[[${zettelName}]]`);
		if (!range) return body;
		const lines = body.split("\n");
		for (let i = range.start; i < range.end; i++) {
			const m = /^판정:\s*(.*)$/.exec(lines[i]);
			if (!m) continue;
			if (m[1].trim() !== "") return body;
			lines[i] = `판정: ${verdict}`;
			return lines.join("\n");
		}
		return body;
	});
}
