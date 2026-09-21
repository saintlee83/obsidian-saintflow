// 관계 인덱스와 점검 계산(설계안 5.4, C10).
// frontmatter 링크는 resolvedLinks에 의존하지 않고 getFirstLinkpathDest로 직접 해석합니다.

import { App, TFile } from "obsidian";
import {
	isDueToday,
	isOldSeed,
	isOrphanZettel,
	isOutputWithoutUses,
	isStalled,
	nextReview,
} from "./checks";
import { isoFromTimestamp, todayISO } from "./dates";
import { linkTargets } from "./links";
import { RelationField, SaintType } from "./model";
import { SECTION } from "./sections";
import type { SaintFlowSettings } from "./config";
import { frontMatterOf, isArchived, resolveLink } from "./vault-io";

const LINK_FIELDS: RelationField[] = ["project", "area", "sources", "uses"];

interface Entry {
	file: TFile;
	type: string | null;
	fm: Record<string, unknown>;
	archived: boolean;
	/** 필드별로 해석된 부모 경로입니다. */
	parents: Map<RelationField, string[]>;
	/** 연결 섹션의 Zettel 링크 대상 경로입니다. */
	connections: string[];
}

export class SaintFlowIndex {
	private app: App;
	private settings: () => SaintFlowSettings;
	private entries = new Map<string, Entry>();
	private childrenOf = new Map<string, Map<RelationField, string[]>>();
	private connectionsIn = new Map<string, Set<string>>();
	private dirty = true;

	constructor(app: App, settings: () => SaintFlowSettings) {
		this.app = app;
		this.settings = settings;
	}

	invalidate(): void {
		this.dirty = true;
	}

	private ensure(): void {
		if (!this.dirty) return;
		this.rebuild();
	}

	rebuild(): void {
		const archiveRoot = this.settings().folders.archive;
		this.entries.clear();
		this.childrenOf.clear();
		this.connectionsIn.clear();

		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			const fm = frontMatterOf(this.app, file);
			const type = typeof fm.type === "string" ? fm.type : null;
			const parents = new Map<RelationField, string[]>();
			for (const field of LINK_FIELDS) {
				const targets = linkTargets(fm[field]);
				if (targets.length === 0) continue;
				const paths: string[] = [];
				for (const target of targets) {
					const dest = resolveLink(this.app, target, file.path);
					if (dest) paths.push(dest.path);
				}
				if (paths.length > 0) parents.set(field, paths);
			}
			const connections = type === "zettel" ? this.readConnections(file) : [];
			this.entries.set(file.path, {
				file,
				type,
				fm,
				archived: isArchived(file.path, archiveRoot),
				parents,
				connections,
			});
		}

		for (const entry of this.entries.values()) {
			for (const [field, paths] of entry.parents) {
				for (const parent of paths) {
					let byField = this.childrenOf.get(parent);
					if (!byField) {
						byField = new Map();
						this.childrenOf.set(parent, byField);
					}
					const list = byField.get(field) ?? [];
					list.push(entry.file.path);
					byField.set(field, list);
				}
			}
			for (const target of entry.connections) {
				let set = this.connectionsIn.get(target);
				if (!set) {
					set = new Set();
					this.connectionsIn.set(target, set);
				}
				set.add(entry.file.path);
			}
		}

		this.dirty = false;
	}

	/**
	 * 연결 섹션 안의 Zettel 링크만 셉니다(설계안 2.3 orphan_zettel 정밀 판정).
	 * 헤딩과 링크의 줄 위치로 판정하므로 본문을 다시 읽지 않습니다.
	 */
	private readConnections(file: TFile): string[] {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return [];
		const headings = cache.headings ?? [];
		const idx = headings.findIndex((h) => h.heading.trim() === SECTION.links);
		if (idx < 0) return [];
		const startLine = headings[idx].position.start.line;
		let endLine = Number.POSITIVE_INFINITY;
		for (let i = idx + 1; i < headings.length; i++) {
			if (headings[i].level <= headings[idx].level) {
				endLine = headings[i].position.start.line;
				break;
			}
		}
		const out: string[] = [];
		for (const link of cache.links ?? []) {
			const line = link.position.start.line;
			if (line <= startLine || line >= endLine) continue;
			const target = link.link.split("|")[0].split("#")[0].trim();
			if (!target) continue;
			const dest = resolveLink(this.app, target, file.path);
			if (dest && dest.path !== file.path) out.push(dest.path);
		}
		return out;
	}

	entryOf(file: TFile): Entry | null {
		this.ensure();
		return this.entries.get(file.path) ?? null;
	}

	allOfType(type: SaintType): TFile[] {
		this.ensure();
		const out: TFile[] = [];
		for (const entry of this.entries.values()) {
			if (entry.type === type) out.push(entry.file);
		}
		return out.sort((a, b) => a.basename.localeCompare(b.basename));
	}

	/** 이 파일을 field로 가리키는 자식들입니다(역방향 조회). */
	children(parent: TFile, field: RelationField): TFile[] {
		this.ensure();
		const paths = this.childrenOf.get(parent.path)?.get(field) ?? [];
		return paths
			.map((p) => this.entries.get(p)?.file)
			.filter((f): f is TFile => !!f)
			.sort((a, b) => a.basename.localeCompare(b.basename));
	}

	isArchivedFile(file: TFile): boolean {
		this.ensure();
		return this.entries.get(file.path)?.archived ?? false;
	}

	/** stalled 판정을 위한 개수: 이 프로젝트를 가리키는 status = next인 미보관 Task. */
	nextTaskCount(project: TFile): number {
		this.ensure();
		return this.children(project, "project").filter((f) => {
			const entry = this.entries.get(f.path);
			if (!entry || entry.archived) return false;
			return entry.type === "task" && entry.fm.status === "next";
		}).length;
	}

	connectionCount(zettel: TFile): { outgoing: number; incoming: number } {
		this.ensure();
		const entry = this.entries.get(zettel.path);
		const outgoing = entry ? new Set(entry.connections).size : 0;
		const incoming = this.connectionsIn.get(zettel.path)?.size ?? 0;
		return { outgoing, incoming };
	}
}

export interface SnapshotItem {
	file: TFile;
	note?: string;
}

export interface SnapshotGroup {
	key: string;
	title: string;
	items: SnapshotItem[];
}

/** 설계안 2.3 점검 값을 한 번에 계산합니다. C10 주간 검토와 검증에 씁니다. */
export function computeSnapshot(
	app: App,
	settings: SaintFlowSettings,
	index: SaintFlowIndex,
	today: string = todayISO()
): SnapshotGroup[] {
	index.rebuild();
	const intervals = settings.recallIntervals;
	const archiveRoot = settings.folders.archive;
	const sweepRoot = settings.folders.sweep;

	const inbox: SnapshotItem[] = [];
	const waiting: SnapshotItem[] = [];
	const stalled: SnapshotItem[] = [];
	const orphans: SnapshotItem[] = [];
	const oldSeeds: SnapshotItem[] = [];
	const noUses: SnapshotItem[] = [];
	const due: SnapshotItem[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		if (file.path === sweepRoot || file.path.startsWith(sweepRoot + "/")) {
			inbox.push({ file });
			continue;
		}
		const archived = isArchived(file.path, archiveRoot);
		if (archived) continue;
		const fm = frontMatterOf(app, file);
		const type = fm.type;

		if (type === "task" && fm.status === "waiting") {
			const on = typeof fm.waiting_on === "string" ? fm.waiting_on : "";
			waiting.push({ file, note: on });
		}

		if (type === "project" && isStalled({ status: fm.status, archived }, index.nextTaskCount(file))) {
			stalled.push({ file });
		}

		if (type === "zettel") {
			const counts = index.connectionCount(file);
			if (isOrphanZettel(counts.outgoing, counts.incoming)) orphans.push({ file });
			if (isOldSeed(fm.status, isoFromTimestamp(file.stat.ctime), today, settings.oldSeedDays)) {
				oldSeeds.push({ file, note: isoFromTimestamp(file.stat.ctime) });
			}
			const state = {
				recall: fm.recall === true,
				box: typeof fm.box === "number" ? fm.box : null,
				last_reviewed: typeof fm.last_reviewed === "string" ? fm.last_reviewed : null,
				archived,
			};
			if (isDueToday(state, today, intervals)) {
				due.push({ file, note: `box ${state.box ?? 1}` });
			}
		}

		if (type === "output" && isOutputWithoutUses(fm.uses)) {
			noUses.push({ file, note: typeof fm.status === "string" ? fm.status : "" });
		}
	}

	return [
		{ key: "inbox", title: "수집함", items: inbox },
		{ key: "waiting", title: "대기 중", items: waiting },
		{ key: "stalled", title: "멈춘 프로젝트", items: stalled },
		{ key: "orphan", title: "연결 없는 Zettel", items: orphans },
		{ key: "old_seed", title: "오래된 seed", items: oldSeeds },
		{ key: "no_uses", title: "uses 없는 결과물", items: noUses },
		{ key: "due_today", title: "오늘 복습", items: due },
	];
}

/** 오늘 복습할 Zettel(설계안 2.3 due_today). C8 세션 생성에 씁니다. */
export function dueTodayZettels(
	app: App,
	settings: SaintFlowSettings,
	index: SaintFlowIndex,
	today: string = todayISO()
): TFile[] {
	index.rebuild();
	return index
		.allOfType("zettel")
		.filter((file) => {
			if (index.isArchivedFile(file)) return false;
			const fm = frontMatterOf(app, file);
			return isDueToday(
				{
					recall: fm.recall === true,
					box: typeof fm.box === "number" ? fm.box : null,
					last_reviewed: typeof fm.last_reviewed === "string" ? fm.last_reviewed : null,
					archived: false,
				},
				today,
				settings.recallIntervals
			);
		})
		.sort((a, b) => {
			const fa = frontMatterOf(app, a);
			const fb = frontMatterOf(app, b);
			const na = nextReview(
				{ box: typeof fa.box === "number" ? fa.box : null, last_reviewed: fa.last_reviewed as string },
				today,
				settings.recallIntervals
			);
			const nb = nextReview(
				{ box: typeof fb.box === "number" ? fb.box : null, last_reviewed: fb.last_reviewed as string },
				today,
				settings.recallIntervals
			);
			return na.localeCompare(nb) || a.basename.localeCompare(b.basename);
		});
}
