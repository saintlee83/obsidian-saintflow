import type { App } from "obsidian";
import type { SaintFlowIndex } from "./graph";
import type { SaintFlowSettings } from "./config";

/** 명령이 필요로 하는 것만 모은 좁은 인터페이스입니다. 플러그인 클래스가 이를 만족합니다. */
export interface SaintFlowCore {
	app: App;
	settings: SaintFlowSettings;
	index: SaintFlowIndex;
	saveSettings(): Promise<void>;
}
