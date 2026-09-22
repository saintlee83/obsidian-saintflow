// Runs the installed plugin inside Obsidian. Requires the Obsidian CLI to be enabled.
// All temporary notes have a unique prefix and are removed in finally.
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function smoke() {
	const core = app.plugins.plugins.saintflow;
	if (!core) throw new Error("SaintFlow must be enabled first");
	if (document.querySelector(".modal")) throw new Error("Close the current dialog before testing");
	const tag = `SF-Smoke-${Date.now()}`;
	const before = new Set(app.vault.getFiles().map(file => file.path));
	const settings = structuredClone(core.settings);
	const original = app.workspace.getActiveFile();
	const checks = [];
	window.__saintflowSmokeProgress = checks;
	const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
	const assert = (condition, message) => { if (!condition) throw new Error(message); };
	async function until(get, message) {
		for (let i = 0; i < 100; i++) { const value = await get(); if (value) return value; await pause(100); }
		throw new Error(`Timed out: ${message}`);
	}
	const fm = file => app.metadataCache.getFileCache(file)?.frontmatter ?? {};
	const run = id => { assert(app.commands.executeCommandById(`saintflow:${id}`), `Unavailable command: ${id}`); };
	async function open(file) { await app.workspace.getLeaf(false).openFile(file); await pause(150); }
	async function pick(label) {
		const option = await until(() => [...document.querySelectorAll(".suggestion-item")].find(el => el.textContent.trim().startsWith(label)), `choice ${label}`);
		option.click(); await pause(100);
	}
	function value(el, text) { el.value = text; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
	async function submit(title, details) {
		const modal = await until(() => document.querySelector(".modal button.mod-cta")?.closest(".modal"), "input dialog");
		if (title !== undefined) value(modal.querySelector("input"), title);
		if (details !== undefined) value(modal.querySelector("textarea"), details);
		modal.querySelector("button.mod-cta").click(); await pause(100);
	}
	async function note(folder, title, type) {
		const file = await until(() => { const file = app.vault.getAbstractFileByPath(`${folder}/${title}.md`); return file && (!type || fm(file).type === type) ? file : null; }, title);
		await pause(300); // Metadata updates follow the command's file writes asynchronously.
		return file;
	}
	async function child(parent, type, suffix, details) {
		await open(parent); run("create-in-context"); await pick(type);
		await submit(`${tag}-${suffix}`, details);
		const folder = ({ Project: settings.folders.projects, Task: settings.folders.transform, Output: settings.folders.outputs, Zettel: settings.folders.zettels })[type];
		return note(folder, `${tag}-${suffix}`, type.toLowerCase());
	}
	let failure;
	try {
		core.settings.prefixes.session = `N-${tag}-`;
		core.settings.prefixes.review = `R-${tag}-`;
		core.settings.reportOnWeekly = false;
		const home = app.vault.getAbstractFileByPath(settings.homePath);
		assert(home, "Home must exist");
		await open(home);
		run("capture"); await submit(`${tag}-Resource`);
		const captured = await note(settings.folders.sweep, `${tag}-Resource`);
		await app.fileManager.processFrontMatter(captured, data => { data.dispatch = "Resources"; data.link = "https://example.com"; data.created = "2026-01-02"; data.custom = false; });
		await app.vault.append(captured, "\n# Captured body\nKeep this exact sentence.\n");
		await until(() => fm(captured).dispatch === "Resources", "capture metadata");
		await open(captured); run("arrange"); await submit();
		const resource = await note(settings.folders.resources, `${tag}-Resource`, "resource");
		assert(fm(resource).created === "2026-01-02" && fm(resource).link === "https://example.com" && fm(resource).custom === false && !("dispatch" in fm(resource)), "Capture metadata preservation");
		assert((await app.vault.read(resource)).includes("Keep this exact sentence."), "Capture body preservation");
		checks.push("capture and dispatch preserve content, link, created and custom fields");
		const claim = await child(resource, "Zettel", "Claim");
		assert(fm(claim).source?.[0] === `[[${resource.basename}]]` && fm(claim).maturity === "seed" && !fm(claim).status, "Resource → Zettel relation");
		checks.push("Resource creates a seed Zettel with source list");
		await open(home); run("create-in-context"); await pick("Project"); await submit(`${tag}-Project`, "Ship the smoke test");
		const project = await note(settings.folders.projects, `${tag}-Project`, "project");
		const subproject = await child(project, "Project", "Subproject", "Complete a child outcome");
		assert(fm(subproject).parent === `[[${project.basename}]]` && !fm(subproject).project, `Subproject parent: ${JSON.stringify(fm(subproject))}`);
		const task = await child(project, "Task", "Task");
		const subtask = await child(task, "Task", "Subtask");
		assert(fm(task).project?.[0] === `[[${project.basename}]]` && fm(subtask).parent === `[[${task.basename}]]` && !fm(subtask).project, "Subtask must not duplicate project");
		checks.push("flat projects, subprojects, tasks and subtasks have correct relations");
		const output = await child(project, "Output", "Output");
		assert(fm(output).project?.[0] === `[[${project.basename}]]`, "Output project list");
		run("set-status"); await pick("done"); await until(() => fm(output).status === "done", "Output status");
		checks.push("Output creation and status transition");
		await app.fileManager.processFrontMatter(claim, data => { data.recall = true; data.question = "Why does this claim hold?"; data.box = 2; data.last_reviewed = null; });
		await until(() => fm(claim).recall === true, "recall metadata");
		const originalBody = (await app.vault.read(claim)).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
		run("recall-session");
		const session = await until(() => app.vault.getMarkdownFiles().find(file => file.basename.startsWith(`N-${tag}-`) && fm(file).type === "recall"), "recall session");
		await until(async () => (await app.vault.read(session)).includes("Why does this claim hold?"), "question property rendered");
		await until(() => app.workspace.getActiveFile()?.path === session.path, "recall command completed");
		await pause(300);
		await open(claim); run("grade-recall"); await pick("pass"); await submit("");
		await until(() => fm(claim).box === 3 && fm(claim).last_result === "pass", "recall grading");
		await until(async () => (await app.vault.read(session)).includes(`- [[${claim.basename}]] pass`), "recall verdict");
		assert((await app.vault.read(claim)).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "") === originalBody, "Grading must preserve Zettel body");
		checks.push("recall uses question, advances box and records verdict in recall note");
		run("weekly-review");
		await until(() => app.vault.getMarkdownFiles().some(file => file.basename.startsWith(`R-${tag}-`) && fm(file).type === "weekly"), "weekly review");
		await open(project); run("project-close");
		const closing = await until(() => app.vault.getMarkdownFiles().find(file => file.basename.includes(tag) && fm(file).type === "closing"), "closing review");
		await open(project); run("project-close"); await pause(200);
		assert(fm(project).status === "active" && fm(project).archived === false && fm(closing).project?.[0] === `[[${project.basename}]]`, "Closing checklist preserves project state");
		assert(app.vault.getMarkdownFiles().filter(file => file.basename.includes(tag) && fm(file).type === "closing").length === 1, "Closing must be idempotent");
		checks.push("weekly and closing templates, idempotent closing checklist");
		run("open-panel");
		await until(() => app.workspace.getLeavesOfType("saintflow-panel").length, "panel");
		core.index.rebuild();
		assert(core.index.nextTaskCount(project) === 1 && core.index.activeChildCount(project) === 1, "Project counts");
		checks.push("sidebar panel and project counts");
	} catch (error) { failure = String(error.stack ?? error) + `\nDialog: ${document.querySelector(".modal")?.textContent ?? "none"}`; }
	finally {
		document.querySelector(".modal-close-button")?.click();
		core.settings = settings;
		await open(original ?? app.vault.getAbstractFileByPath(settings.homePath));
		// Exact files created by this run only; never delete a pre-existing path.
		for (const file of [...app.vault.getFiles()]) {
			if (!before.has(file.path) && file.basename.includes(tag)) await app.vault.delete(file, true);
		}
		core.index.invalidate();
	}
	return { version: core.manifest.version, checks, failure, temporaryNotesRemaining: app.vault.getFiles().filter(file => file.basename.includes(tag)).length };
}

function evaluate(code) {
	const encoded = Buffer.from(code).toString("base64");
	const expression = `eval(new TextDecoder().decode(Uint8Array.from(atob('${encoded}'),c=>c.charCodeAt(0))))`;
	const result = spawnSync(process.env.OBSIDIAN_CLI ?? "obsidian", [`vault=${process.argv[2] ?? "SaintFlow"}`, "eval", `code=${expression}`], { encoding: "utf8", timeout: 15000, maxBuffer: 4 * 1024 * 1024 });
	if (result.error) throw result.error;
	if (result.status || !result.stdout.includes("=>")) throw new Error(result.stdout || result.stderr || "No CLI response");
	return result.stdout.slice(result.stdout.indexOf("=>") + 2).trim();
}
// The Windows CLI redirector limits argument length; load the long test body from a temporary file.
const scriptPath = join(tmpdir(), `saintflow-smoke-${Date.now()}.js`);
writeFileSync(scriptPath, `window.__saintflowSmokeResult=null; (${smoke.toString()})().then(result=>window.__saintflowSmokeResult=result).catch(error=>window.__saintflowSmokeResult={failure:String(error.stack??error)}); 'started'`);
try { evaluate(`eval(require('fs').readFileSync(${JSON.stringify(scriptPath)},'utf8'))`); }
finally { unlinkSync(scriptPath); }
let result;
for (let i = 0; i < 120; i++) {
	await new Promise(resolve => setTimeout(resolve, 500));
	const output = evaluate("window.__saintflowSmokeResult");
	if (output === "null" || output === "undefined") continue;
	result = JSON.parse(output); break;
}
if (!result) throw new Error("Smoke test timed out; inspect the app before running again");
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.failure || result.temporaryNotesRemaining ? 1 : 0;
