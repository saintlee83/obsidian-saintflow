// 유형별 접두사, 파일명, 거처(설계안 3.1, 3.5). obsidian을 import하지 않는 순수 모듈입니다.
// C15 규칙 검사와 C19 마이그레이션이 이 규칙을 그대로 다시 씁니다.

import type { SaintFlowSettings } from "./config";
import { CreatableType, SaintType } from "./model";
import { joinPath, sanitizeFileName, stripPrefix, withPrefix } from "./naming";

/** 유형별 접두사. Task와 Zettel에는 접두사가 없습니다. */
export function prefixFor(settings: SaintFlowSettings, type: CreatableType): string {
	switch (type) {
		case "project":
			return settings.prefixes.project;
		case "area":
			return settings.prefixes.area;
		case "working":
			return settings.prefixes.working;
		case "output":
			return settings.prefixes.output;
		case "source":
			return settings.prefixes.source;
		case "map":
			return settings.prefixes.map;
		case "session":
			return settings.prefixes.session;
		case "review":
		case "review-close":
			return settings.prefixes.review;
		default:
			return "";
	}
}

/** 규칙에 맞는 파일명을 만듭니다. 결과가 비면 빈 문자열입니다. */
export function fileNameFor(settings: SaintFlowSettings, type: CreatableType, title: string): string {
	const prefix = prefixFor(settings, type);
	return prefix ? withPrefix(prefix, title) : sanitizeFileName(title);
}

/** 유형의 고정 거처(설계안 3.1). 컨테이너에 사는 유형은 parentContainer가 필요합니다. */
export function homeFolderFor(
	settings: SaintFlowSettings,
	type: CreatableType,
	ctx: { containerName?: string; parentContainer?: string } = {}
): string {
	const f = settings.folders;
	switch (type) {
		case "task":
			return f.transform;
		case "zettel":
			return f.zettels;
		case "map":
			return f.maps;
		case "source":
			return f.resources;
		case "session":
			return f.narrate;
		case "daily":
			return f.daily;
		case "review":
		case "review-close":
			return f.reviews;
		case "project":
			return joinPath(f.projects, ctx.containerName ?? "");
		case "area":
			return joinPath(f.areas, ctx.containerName ?? "");
		case "working":
		case "output":
			// 컨테이너와 함께 끝나는 파일입니다(설계안 3.3).
			return ctx.parentContainer ?? f.transform;
	}
}

/** 거처를 고정 폴더로 판정할 수 있는 유형인지. 컨테이너에 사는 유형은 폴더로 못 정합니다. */
export function placementKind(type: SaintType): "folder" | "container" | "any" {
	switch (type) {
		case "task":
		case "zettel":
		case "map":
		case "source":
		case "session":
		case "daily":
		case "review":
			return "folder";
		case "project":
		case "area":
		case "working":
		case "output":
			return "container";
	}
}

/** 고정 거처가 있는 유형의 폴더 경로. 없으면 null입니다. */
export function fixedHomeFor(settings: SaintFlowSettings, type: SaintType): string | null {
	return placementKind(type) === "folder" ? homeFolderFor(settings, type) : null;
}

/** 컨테이너를 담는 상위 폴더. Project는 Projects, Area는 Areas입니다. */
export function containerRootFor(settings: SaintFlowSettings, type: SaintType): string | null {
	if (type === "project") return settings.folders.projects;
	if (type === "area") return settings.folders.areas;
	return null;
}

/** 종료 검토 이름: R-종료-프로젝트명(설계안 3.5). */
export function closeReviewName(settings: SaintFlowSettings, projectHubName: string): string {
	const bare = stripPrefix(settings.prefixes.project, projectHubName);
	return `${settings.prefixes.review}종료-${bare}`;
}
