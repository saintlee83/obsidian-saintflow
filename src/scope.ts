import type { SaintFlowSettings } from "./config";

export function isContentNote(settings: SaintFlowSettings, path: string, fm: Record<string, unknown>): boolean {
	const templates = settings.folders.templates.replace(/\/$/, "");
	return path !== settings.homePath && fm.type !== "room" &&
		path !== templates && !path.startsWith(templates + "/") &&
		!path.startsWith(templates.replace(/[^/]+$/, "Commands/"));
}

export function isInboxNote(settings: SaintFlowSettings, path: string, fm: Record<string, unknown>): boolean {
	return path.startsWith(settings.folders.sweep + "/") && isContentNote(settings, path, fm);
}
