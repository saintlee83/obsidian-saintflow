// C8 회상 세션과 채점(설계안 1.7, 5.3).
// 답안과 판정은 세션 노트에, Zettel에는 회상 속성만 기록합니다.

import { Notice, TFile } from "obsidian";
import { RecallResult, gradeBox, nextReview } from "../checks";
import type { SaintFlowCore } from "../core";
import { todayISO } from "../dates";
import { dueTodayZettels } from "../graph";
import { t } from "../i18n";
import { toLink } from "../links";
import { homeFolderFor } from "../relations";
import { appendToSection, findSection, firstRecallQuestion } from "../sections";
import { templateContent } from "../templates";
import { pickFile, pickOne, promptRequired, promptText } from "../ui/modals";
import { createNote, fileByBaseName, frontMatterOf, readBody, setFrontMatter, typeOf, updateBody } from "../vault-io";

/** C8-a 세션: 오늘 복습할 Zettel마다 질문과 답안 칸을 만듭니다. */
export async function recallSessionCommand(core: SaintFlowCore): Promise<TFile | null> {
	const today = todayISO();
	const name = `${core.settings.prefixes.session}${today}`;
	const due = dueTodayZettels(core.app, core.settings, core.index, today);

	const path = `${homeFolderFor(core.settings, "recall")}/${name}.md`;
	const existing = core.app.vault.getAbstractFileByPath(path);
	const template = await templateContent(core.app, core.settings, "recall", { date: today, title: name });
	const file = existing instanceof TFile ? existing : await createNote(core.app, homeFolderFor(core.settings, "recall"), name, template);

	const blocks: string[] = [];
	for (const zettel of due) {
		const body = await readBody(core.app, zettel);
		const question = String(frontMatterOf(core.app, zettel).question ?? "").trim() || firstRecallQuestion(body);
		blocks.push(
			[
				`## ${toLink(zettel.basename)}`,
				t("질문: {0}", question),
				"",
				t("답안:"),
				"",
				t("판정:"),
				"",
			].join("\n")
		);
	}

	await updateBody(core.app, file, (body) => {
		let next = stripSampleSection(body);
		const missing = blocks.filter((_block, index) => !findSection(next, toLink(due[index].basename)));
		if (missing.length === 0) return next;
		const judge = findSection(next, "판정");
		const lines = next.split("\n");
		if (judge) lines.splice(judge.headingLine, 0, missing.join("\n"));
		else lines.push("", ...missing, "## 판정", "");
		return lines.join("\n");
	});
	await setFrontMatter(core.app, file, (fm) => {
		fm.type = "recall";
		fm.date = today;
	});
	core.index.invalidate();

	await core.app.workspace.getLeaf(false).openFile(file);
	new Notice(t("회상 세션 {0}: {1}건", name, due.length));
	return file;
}

/** 템플릿이 예시로 둔 `## [[Zettel 이름]]` 블록을 지웁니다. */
function stripSampleSection(body: string): string {
	const range = findSection(body, "[[Zettel 이름]]");
	if (!range) return body;
	const lines = body.split("\n");
	return [...lines.slice(0, range.headingLine), ...lines.slice(range.end)].join("\n");
}

/** C8-b 채점: 회상 속성과 세션 노트의 판정을 갱신합니다. */
export async function gradeRecallCommand(core: SaintFlowCore, target?: TFile): Promise<void> {
	const zettel = await resolveZettel(core, target);
	if (!zettel) return;

	const result = await pickOne<RecallResult>(
		core.app,
		[
			{ value: "pass", label: "pass", description: t("핵심 주장, 근거, 적용 사례 또는 반례를 모두 썼습니다.") },
			{ value: "fail", label: "fail", description: t("하나라도 빠졌습니다. box가 1로 돌아갑니다.") },
		],
		t("{0} 판정", zettel.basename)
	);
	if (!result) return;

	let note = "";
	if (result === "fail") {
		const required = await promptRequired(
			core.app,
			{ title: t("틀린 점"), description: t("무엇이 빠졌는지 한 줄로 씁니다."), cta: t("저장") },
			t("틀린 점을 적어야 fail을 기록합니다.")
		);
		if (!required) return;
		note = required;
	} else {
		const optional = await promptText(core.app, {
			title: t("남길 말 (선택)"),
			description: t("비워 두어도 됩니다."),
			cta: t("저장"),
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

	await fillSessionVerdict(core, zettel.basename, today, `${result}${note ? ` — ${note}` : ""} · box ${newBox}`);
	core.index.invalidate();

	const due = nextReview({ box: newBox, last_reviewed: today }, today, core.settings.recallIntervals);
	new Notice(t("{0} · box {1} · 다음 복습 {2}", result, newBox, due));
}

async function resolveZettel(core: SaintFlowCore, target?: TFile): Promise<TFile | null> {
	const file = target ?? core.app.workspace.getActiveFile();
	if (file && typeOf(core.app, file) === "zettel") return file;

	// 세션 노트에서 실행하면 그 세션에 올라온 Zettel 중에서 고릅니다.
	if (file && typeOf(core.app, file) === "recall") {
		const body = await readBody(core.app, file);
		const names = [...body.matchAll(/^##\s+\[\[([^\]]+)\]\]/gm)].map((m) =>
			m[1].split("|")[0].split("#")[0].trim()
		);
		const files = names
			.map((n) => fileByBaseName(core.app, n))
			.filter((f): f is TFile => !!f && typeOf(core.app, f) === "zettel");
		if (files.length > 0) return await pickFile(core.app, files, t("채점할 Zettel"));
	}

	const recalls = core.index
		.allOfType("zettel")
		.filter((f) => !core.index.isArchivedFile(f))
		.filter((f) => (core.app.metadataCache.getFileCache(f)?.frontmatter?.recall as boolean) === true);
	if (recalls.length === 0) {
		new Notice(t("recall: true인 Zettel이 없습니다."));
		return null;
	}
	return await pickFile(core.app, recalls, t("채점할 Zettel"));
}

/** 회상 노트의 판정 섹션에 결과를 추가합니다. 기존 답안은 유지합니다. */
async function fillSessionVerdict(
	core: SaintFlowCore,
	zettelName: string,
	today: string,
	verdict: string
): Promise<void> {
	const active = core.app.workspace.getActiveFile();
	const name = `${core.settings.prefixes.session}${today}`;
	const folder = homeFolderFor(core.settings, "recall");
	const existing = core.app.vault.getAbstractFileByPath(`${folder}/${name}.md`);
	const session = active && typeOf(core.app, active) === "recall" ? active : existing instanceof TFile ? existing :
		await createNote(core.app, folder, name, await templateContent(core.app, core.settings, "recall", { date: today, title: name }));
	await updateBody(core.app, session, body => appendToSection(body, "판정", `- ${toLink(zettelName)} ${verdict}`));
}
