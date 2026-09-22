// 설정 값과 기본값(설계안 5.5). obsidian을 import하지 않는 순수 모듈입니다.
// 설정 탭 UI는 settings.ts에 있습니다.

import { DEFAULT_RECALL_INTERVALS } from "./checks";

export interface FolderSettings {
	sweep: string;
	projects: string;
	areas: string;
	resources: string;
	archive: string;
	zettels: string;
	maps: string;
	narrate: string;
	transform: string;
	outputs: string;
	daily: string;
	reviews: string;
	templates: string;
	reports: string;
}

export interface PrefixSettings {
	project: string;
	area: string;
	working: string;
	output: string;
	source: string;
	map: string;
	session: string;
	review: string;
}

export interface SaintFlowSettings {
	folders: FolderSettings;
	prefixes: PrefixSettings;
	recallIntervals: number[];
	oldSeedDays: number;
	/** C17 시작 시 Home 열기. */
	openHomeOnStart: boolean;
	homePath: string;
	/** C15 규칙 검사를 언제 돌릴지. */
	lintOnStartup: boolean;
	lintOnRename: boolean;
	/** C20 점검 리포트를 C10 실행 시 함께 저장할지. */
	reportOnWeekly: boolean;
	/** C18 파일 탐색기에서 허브 노트 구분 표시. */
	markHubsInExplorer: boolean;
	/** C19 마이그레이션 안내에 쓰는, 마지막으로 맞춘 스키마 버전. */
	schemaVersion: number;
}

/** 기본 폴더는 설계안 3.1 구조를 따릅니다. */
export const DEFAULT_SETTINGS: SaintFlowSettings = {
	folders: {
		sweep: "0_Sweep",
		projects: "1_Arrange/Projects",
		areas: "1_Arrange/Areas",
		resources: "1_Arrange/Resources",
		archive: "1_Arrange/Archive",
		zettels: "2_Internalize/Zettels",
		maps: "2_Internalize/Maps",
		narrate: "3_Narrate",
		transform: "4_Transform/Tasks",
		outputs: "4_Transform/Outputs",
		daily: "5_Flow/Daily",
		reviews: "5_Flow/Reviews",
		templates: "9_System/Templates",
		reports: "9_System/reports",
	},
	prefixes: {
		project: "",
		area: "",
		working: "W-",
		output: "",
		source: "",
		map: "",
		session: "N-",
		review: "R-",
	},
	recallIntervals: [...DEFAULT_RECALL_INTERVALS],
	oldSeedDays: 14,
	openHomeOnStart: true,
	homePath: "Home.md",
	lintOnStartup: false,
	lintOnRename: false,
	reportOnWeekly: true,
	markHubsInExplorer: true,
	schemaVersion: 2,
};

export function parseIntervals(raw: string, fallback: number[]): number[] {
	const parts = raw
		.split(/[,\s]+/)
		.map((s) => Number(s.trim()))
		.filter((n) => Number.isFinite(n) && n > 0)
		.map((n) => Math.floor(n));
	return parts.length > 0 ? parts : fallback;
}

/** 저장된 설정을 기본값과 합칩니다. 키가 늘어도 기존 data.json이 깨지지 않습니다. */
export function mergeSettings(stored: Partial<SaintFlowSettings> | null): SaintFlowSettings {
	const base = structuredClone(DEFAULT_SETTINGS);
	// Update only former defaults; preserve customized locations and prefixes.
	if (stored && (stored.schemaVersion ?? 0) < 2) {
		stored = structuredClone(stored);
		if (stored.folders?.transform === "4_Transform") stored.folders.transform = base.folders.transform;
		const old = { project: "P-", area: "A-", output: "O-", source: "S-", map: "M-" };
		for (const [key, value] of Object.entries(old)) {
			const prefix = key as keyof PrefixSettings;
			if (stored.prefixes?.[prefix] === value) stored.prefixes[prefix] = base.prefixes[prefix];
		}
	}
	return {
		...base,
		...(stored ?? {}),
		folders: { ...base.folders, ...(stored?.folders ?? {}) },
		prefixes: { ...base.prefixes, ...(stored?.prefixes ?? {}) },
		recallIntervals:
			Array.isArray(stored?.recallIntervals) && stored.recallIntervals.length > 0
				? stored.recallIntervals
				: base.recallIntervals,
	};
}
