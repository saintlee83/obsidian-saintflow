// 플러그인 UI 언어. Obsidian의 언어 설정을 따릅니다.
//
// 번역하는 것은 화면에 보이는 문구뿐입니다. vault에 남는 것(섹션 이름, frontmatter 키와 값,
// 파일명 접두사, Bases 보기 이름)은 설계안이 정한 그대로 두어야 링크와 검사가 깨지지 않습니다.
// 그것들은 sections.ts, templates.ts, placement.ts, panel.ts의 BASE_VIEW에 있습니다.
//
// 원문(한국어)이 곧 키입니다. 번역이 없으면 원문이 그대로 나오므로 ko 경로는 표가 필요 없습니다.
// obsidian을 import하지 않는 순수 모듈입니다(설계안 5.4).

export type Locale = "ko" | "en";

/** Obsidian의 기본 언어입니다. 모르는 언어는 여기로 떨어집니다. */
export const DEFAULT_LOCALE: Locale = "en";

const EN: Record<string, string> = {
	// main.ts — 리본, 명령 이름, 파일 메뉴
	"SaintFlow: 수집": "SaintFlow: Capture",
	"SaintFlow: 패널 열기": "SaintFlow: Open panel",
	"C1 수집": "C1 Capture",
	"C2 분류": "C2 Arrange",
	"C3 맥락 생성": "C3 Create in context",
	"C4 새 프로젝트": "C4 New project",
	"C4 새 영역": "C4 New area",
	"C5 관계 지정": "C5 Set relation",
	"C6 Zettel 연결 추가": "C6 Add Zettel link",
	"C7 상태 전환": "C7 Change status",
	"C8 회상 세션 시작": "C8 Start recall session",
	"C8 회상 채점": "C8 Grade recall",
	"C9 프로젝트 종료": "C9 Close project",
	"C10 주간 검토": "C10 Weekly review",
	"C12 Inbox 처리 모드": "C12 Inbox mode",
	"C13 Source에서 Zettel 추출": "C13 Extract Zettel from Source",
	"C14 선택 영역 승격": "C14 Promote selection",
	"C15 규칙 검사": "C15 Check rules",
	"C16 SaintFlow 패널 열기": "C16 Open SaintFlow panel",
	"C17 Home 열기": "C17 Open Home",
	"C18 허브 열기": "C18 Open hub",
	"C19 스키마 마이그레이션": "C19 Migrate schema",
	"C20 점검 리포트 내보내기": "C20 Export check report",
	"점검 스냅샷 보기": "Show check snapshot",
	"SaintFlow: 허브 열기": "SaintFlow: Open hub",
	"SaintFlow: 분류": "SaintFlow: Arrange",
	"SaintFlow: 여기서 만들기": "SaintFlow: Create here",
	"SaintFlow 오류: {0}": "SaintFlow error: {0}",

	// C11 블록 문법
	"읽을 수 없는 줄입니다: {0}": "Cannot read this line: {0}",
	"알 수 없는 키입니다: {0}": "Unknown key: {0}",
	"types가 비어 있습니다.": "types is empty.",
	"type: {0} 은(는) 자식을 만들 수 있는 부모가 아닙니다.": "type: {0} is not a parent that can create children.",
	"(없음)": "(none)",
	"{0}은(는) {1} 맥락에서 만들 수 없습니다. 허용: {2}": "{0} cannot be created in a {1} context. Allowed: {2}",
	"종료 검토": "Close review",
	"이 블록이 놓인 노트를 찾을 수 없습니다.": "Cannot find the note holding this block.",
	"만들지 못했습니다: {0}": "Could not create it: {0}",

	// 1.6 evergreen 승격 조건
	"생각 섹션이 비어 있습니다.": "The thought section is empty.",
	"연결이 {0}개입니다. 2개 이상이어야 합니다.": "Links: {0}. At least 2 are required.",
	"연결 이유가 없습니다: {0}": "These links have no reason: {0}",

	// C1 수집
	수집: "Capture",
	"지금 신경 쓰이는 것을 한 줄로 적습니다. 무엇인지는 나중에 분류에서 정합니다.":
		"Write down what is on your mind in one line. What it is gets decided later, in Arrange.",
	"회의 때 나온 아이디어": "An idea from the meeting",
	"수집함에 넣기": "Add to inbox",
	"내용이 비어 있습니다.": "The content is empty.",
	"파일명으로 쓸 수 있는 글자가 없습니다.": "Nothing here can be used as a file name.",
	"수집함: {0}": "Inbox: {0}",

	// C10 주간 검토
	"{0} · {1}건": "{0} · {1} items",
	"리포트: {0}": "Report: {0}",
	"계산 시각: {0}": "Computed: {0}",
	"| 점검 | 개수 |": "| Check | Count |",
	"- 없음": "- none",

	// C12 Inbox 처리 모드
	"1. 행동인가? → Task. 여러 행동이 필요하면 프로젝트":
		"1. Is it an action? → Task. If it needs several actions, a Project",
	"2. 특정 프로젝트·영역과 함께 끝나는가? → 그 컨테이너":
		"2. Does it end together with one project or area? → that container",
	"3. 자료가 말하는 것을 정리했는가? → Source": "3. Are you recording what a source says? → Source",
	"4. 내가 이해한 것을 자기 말로 썼는가? → Zettel":
		"4. Are you writing what you understood in your own words? → Zettel",
	"5. 보존만 하면 되는가? → vault 밖": "5. Does it only need to be kept? → outside the vault",
	"수집함이 비어 있습니다.": "The inbox is empty.",
	"2분 안에 끝나는 일이다": "It takes less than two minutes",
	"지금 하고 완료한 Task로 기록합니다.": "Do it now and record it as a completed Task.",
	분류한다: "Arrange it",
	건너뛰기: "Skip",
	"수집함에 그대로 둡니다.": "Leave it in the inbox.",
	삭제: "Delete",
	"휴지통으로 보냅니다.": "Moves it to the trash.",
	그만두기: "Stop",
	"여기까지 처리하고 요약을 봅니다.": "Stop here and see the summary.",
	"수집함 {0}/{1} · {2}": "Inbox {0}/{1} · {2}",
	"{0}을(를) 휴지통으로 보냅니다.": "Moves {0} to the trash.",
	휴지통으로: "To the trash",
	"무엇으로 분류할까요?": "Arrange it as what?",
	"지금 처리": "Do it now",
	'"{0}"을(를) 지금 처리했습니까?\n완료한 Task로 기록하고 4_Transform으로 옮깁니다.':
		'Did you just handle "{0}"?\nIt is recorded as a completed Task and moved to 4_Transform.',
	"완료로 기록": "Record as done",
	"처리 {0}건 (2분 규칙 {1}건)": "Processed: {0} (two-minute rule: {1})",
	"유형별: {0}": "By type: {0}",
	"건너뜀 {0}건 · 삭제 {1}건": "Skipped: {0} · deleted: {1}",
	"수집함 잔량 {0}건": "Left in the inbox: {0}",

	// C13 Source에서 Zettel 추출
	"체크리스트 항목에 커서를 두고 실행하세요.": "Put the cursor on a checklist item first.",
	"항목이 비어 있습니다.": "The item is empty.",
	"Zettel 제목": "Zettel title",
	"주장 문장으로 씁니다. 항목 문구가 후보로 들어가 있습니다.":
		"Write it as a claim. The item text is filled in as a starting point.",
	만들기: "Create",
	"제목이 비어 있어 만들지 않았습니다.": "The title was empty, so nothing was created.",
	"속성 상속": "Inherit properties",
	"Source의 {0}을(를) 새 Zettel에도 넣을까요?": "Copy {0} from the Source to the new Zettel?",
	상속: "Inherit",
	"추출: {0}": "Extracted: {0}",

	// C14 선택 영역 승격
	"승격할 텍스트를 먼저 고르세요.": "Select the text to promote first.",
	"고른 텍스트가 생각 섹션으로 갑니다. seed로 만듭니다.":
		"The selected text goes into the thought section, as a seed.",
	"고른 텍스트가 핵심 내용 섹션으로 갑니다.": "The selected text goes into the key content section.",
	"무엇으로 승격할까요?": "Promote it to what?",
	"Source 제목": "Source title",
	"주장 문장으로 씁니다. 접두사는 붙이지 않습니다.": "Write it as a claim. Do not add a prefix.",
	"원제목을 씁니다. S- 접두사는 자동으로 붙습니다.":
		"Use the original title. The S- prefix is added for you.",
	승격: "Promote",
	"제목이 비어 있어 승격하지 않았습니다.": "The title was empty, so nothing was promoted.",
	"승격: {0}": "Promoted: {0}",

	// C15 규칙 검사
	"외 {0}건": "and {0} more",
	'SaintFlow 규칙 위반 {0}건. "C15 규칙 검사"로 확인하세요.':
		'SaintFlow rule violations: {0}. Run "C15 Check rules" to see them.',
	"규칙 검사 · 위반 {0}건": "Check rules · violations: {0}",
	"위반이 없습니다.": "No violations.",
	닫기: "Close",
	"다시 검사": "Check again",
	"파일 열기": "Open the file",
	"{0} 값": "{0} value",
	"폴더입니다: {0}": "This is a folder: {0}",

	// C17 Home 열기
	"Home 노트를 찾지 못했습니다: {0}": "Home note not found: {0}",

	// C18 허브 열기
	"컨테이너 안의 파일이 아닙니다.": "This file is not inside a container.",
	"허브가 없습니다": "No hub",
	"{0} 컨테이너에 같은 이름의 허브 노트가 없습니다. 지금 만들까요?":
		"The container {0} has no hub note of the same name. Create one now?",

	// C19 스키마 마이그레이션
	"이름 변경 {0}": "Rename {0}",
	"추가 {0}": "Add {0}",
	"스키마 마이그레이션 · v{0}": "Schema migration · v{0}",
	"바꿀 노트가 없습니다. 본문은 어떤 경우에도 건드리지 않습니다.":
		"No note needs changing. The body is never touched.",
	"노트 {0}개에서 속성 {1}개를 추가하고 키 {2}개의 이름을 바꿉니다. 본문은 건드리지 않습니다.":
		"Adds {1} properties and renames {2} keys across {0} notes. The body is left alone.",
	"변경 미리보기 ({0})": "Preview of changes ({0})",
	"외 {0}개": "and {0} more",
	"보고만 하는 값 문제 ({0})": "Value problems, reported only ({0})",
	"허용값 밖의 값은 자동으로 바꾸지 않습니다. C15 규칙 검사에서 하나씩 고르세요.":
		"Values outside the allowed set are never rewritten for you. Pick them one by one in C15.",
	취소: "Cancel",
	"버전만 맞추기": "Only set the version",
	적용: "Apply",
	"변경 없음. 스키마 버전을 v{0}로 맞췄습니다.": "Nothing changed. The schema version is now v{0}.",
	"{0}개 노트를 갱신했습니다. 자세한 내용은 콘솔 로그에 있습니다.":
		"Updated {0} notes. The details are in the console log.",
	'SaintFlow 스키마가 v{0}로 올랐습니다. "C19 스키마 마이그레이션"을 실행하세요.':
		'The SaintFlow schema moved to v{0}. Run "C19 Migrate schema".',

	// C2 분류
	"분류할 파일을 먼저 여세요.": "Open the file to arrange first.",
	"{0}에 있는 파일만 분류합니다.": "Only files in {0} can be arranged.",
	"삭제 (휴지통)": "Delete (trash)",
	"휴지통으로 보냈습니다.": "Moved to the trash.",
	"파일명 규칙을 적용하면 이름이 비어 있습니다.": "Applying the naming rule leaves an empty name.",
	"Task로 분류": "Arrange as Task",
	"제목은 동사로 끝나는 행동 하나여야 합니다.": "The title must be one action, ending in a verb.",
	제목: "Title",
	분류: "Arrange",
	"Project로 분류": "Arrange as Project",
	"완료 조건은 판정 가능한 한 문장이어야 합니다.": "The completion criterion must be one checkable sentence.",
	이름: "Name",
	"완료 조건": "Completion criterion",
	"저장소 URL 또는 로컬 경로": "Repository URL or local path",
	"Area로 분류": "Arrange as Area",
	"유지 기준": "Standard to hold",
	"Source로 분류": "Arrange as Source",
	원제목: "Original title",
	"쪽, 장, 타임스탬프": "Page, chapter, timestamp",
	"Zettel로 분류": "Arrange as Zettel",
	"제목은 주장 문장으로 씁니다. status는 seed로 시작합니다.":
		"Write the title as a claim. The status starts as seed.",
	"주장 문장": "A claim",
	"Map으로 분류": "Arrange as Map",
	주제: "Subject",

	// C20 점검 리포트
	"리포트를 저장하지 못했습니다.": "Could not save the report.",
	"점검 리포트: {0}": "Check report: {0}",

	// C3 맥락 생성
	"{0}은(는) 자식을 만들 수 있는 부모가 아닙니다.": "{0} is not a parent that can create children.",
	"{0}은(는) {1} 맥락에서 만들 수 없습니다.": "{0} cannot be created in a {1} context.",
	"{0} 아래에 무엇을 만들까요?": "What do you want to create under {0}?",
	"부모가 될 노트가 없습니다. 먼저 프로젝트나 영역을 만드세요.":
		"There is no note that can be a parent. Create a project or an area first.",
	"부모 노트 고르기": "Pick a parent note",
	"연결 이유": "Reason for the link",
	'새 Zettel이 "{0}"과(와) 어떻게 이어지는지 한 줄로 씁니다.':
		'Write in one line how the new Zettel connects to "{0}".',
	다음: "Next",
	"연결 이유가 없으면 만들지 않습니다.": "Without a reason for the link, nothing is created.",
	행동: "Action",
	"프로젝트 만들기": "Create a project",
	"{0} 만들기": "Create {0}",
	"부모: {0}": "Parent: {0}",
	"제목이 비어 있습니다.": "The title is empty.",

	// C4 새 컨테이너
	"새 프로젝트": "New project",
	"완료 조건은 판정 가능한 한 문장이어야 합니다. 비면 만들지 않습니다.":
		"The completion criterion must be one checkable sentence. Empty means nothing is created.",
	기술비교보고서: "Technology comparison report",
	"무엇이 있으면 끝난 것인가?": "What has to exist for this to be done?",
	"완료 조건이 비어 있어 만들지 않았습니다.": "The completion criterion was empty, so nothing was created.",
	"새 영역": "New area",
	"영역은 유지 기준이 있는 책임입니다. 끝나는 날짜가 있으면 프로젝트입니다.":
		"An area is a responsibility with a standard to hold. If it has an end date, it is a project.",
	학업: "Study",
	"첫 다음 행동": "First next action",
	"다음 행동이 없으면 멈춘 프로젝트로 표시됩니다. 지금 하나 정할까요?\n정할 수 없다면 그것을 정하기 위해 확인할 질문을 Task로 두세요.":
		"Without a next action this shows up as a stalled project. Decide one now?\nIf you cannot, make the question you need answered the Task.",
	정하기: "Decide it",
	"다음 행동": "Next action",
	"동사로 끝나는 행동 하나를 씁니다.": "Write one action, ending in a verb.",
	"후보 기술 A 평가 조건 정리하기": "Write down the criteria for evaluating option A",
	"행동이 비어 있습니다.": "The action is empty.",
	"다음 행동: {0}": "Next action: {0}",

	// C5 관계 지정
	"파일을 먼저 여세요.": "Open a file first.",
	"{0}에는 지정할 관계 필드가 없습니다.": "{0} has no relation field to set.",
	"유형 없음": "no type",
	"어떤 관계를 지정할까요?": "Which relation do you want to set?",
	"{0}에 넣을 노트가 없습니다.": "There is no note to put in {0}.",
	"{0}에 더할 노트": "Note to add to {0}",
	"{0} 고르기": "Pick {0}",
	"자기 자신은 지정할 수 없습니다.": "A note cannot point at itself.",
	"현재: {0}": "Now: {0}",
	"비어 있음": "empty",

	// C6 Zettel 연결
	"Zettel에서만 쓸 수 있습니다.": "This only works on a Zettel.",
	"연결할 수 있는 다른 Zettel이 없습니다.": "There is no other Zettel to link to.",
	"연결할 Zettel": "Zettel to link",
	'"{0}"과(와) "{1}"을(를) 잇는 이유를 한 줄로 씁니다.':
		'Write in one line why "{0}" and "{1}" belong together.',
	연결: "Link",
	"이유가 비어 있어 연결하지 않았습니다.": "The reason was empty, so no link was added.",
	"연결: {0}": "Linked: {0}",

	// C7 상태 전환
	"Task, Project, Zettel, Output에서만 쓸 수 있습니다.":
		"This only works on a Task, Project, Zettel or Output.",
	"(현재)": "(current)",
	"{0} 상태": "Status of {0}",
	"대기 대상": "Waiting on",
	"누구의 무엇을 기다리는지와 요청일을 씁니다.": "Write who you are waiting on, for what, and since when.",
	"김OO 회신 요청 2026-09-21": "Reply requested from a teammate, 2026-09-21",
	저장: "Save",
	"프로젝트 종료": "Close project",
	"종료는 수확과 보관까지 함께 해야 합니다. 'SaintFlow: 프로젝트 종료(C9)'를 쓰는 편이 안전합니다. 그래도 상태만 바꿀까요?":
		"Closing also means harvesting and archiving. 'C9 Close project' is the safe way. Change only the status anyway?",
	"상태만 바꾸기": "Change only the status",
	"evergreen으로 올리지 않았습니다.": "Not promoted to evergreen.",
	"uses가 비어 있습니다": "uses is empty",
	"완료 증거는 결과물에 사용한 지식 링크입니다(설계안 1.6). uses 없이 shipped로 둘까요?":
		"The evidence of completion is the knowledge an output used (1.6). Ship it with an empty uses?",
	"그대로 shipped": "Ship it anyway",

	// C8 회상
	"오늘 세션이 이미 있습니다. 복습 대상 {0}건.": "Today's session already exists. Due for review: {0}.",
	"오늘 복습할 Zettel이 없습니다.": "No Zettel is due for review today.",
	"질문: {0}": "Question: {0}",
	"답안:": "Answer:",
	"판정:": "Verdict:",
	"회상 세션 {0}: {1}건": "Recall session {0}: {1} due",
	"핵심 주장, 근거, 적용 사례 또는 반례를 모두 썼습니다.":
		"You wrote the claim, the evidence, and an application or a counterexample.",
	"하나라도 빠졌습니다. box가 1로 돌아갑니다.": "Something was missing. The box goes back to 1.",
	"{0} 판정": "Verdict on {0}",
	"틀린 점": "What you missed",
	"무엇이 빠졌는지 한 줄로 씁니다.": "Write in one line what was missing.",
	"틀린 점을 적어야 fail을 기록합니다.": "A fail is only recorded once you write what you missed.",
	"남길 말 (선택)": "A note to leave (optional)",
	"비워 두어도 됩니다.": "You can leave this empty.",
	"{0} · box {1} · 다음 복습 {2}": "{0} · box {1} · next review {2}",
	"채점할 Zettel": "Zettel to grade",
	"recall: true인 Zettel이 없습니다.": "There is no Zettel with recall: true.",
	"판정: {0}": "Verdict: {0}",

	// C9 프로젝트 종료
	"프로젝트 허브에서 실행하세요.": "Run this from a project hub.",
	"{0}이(가) 같은 이름의 컨테이너 폴더 안에 있지 않습니다.":
		"{0} is not inside a container folder of the same name.",
	"완료 조건 판정": "Judge the completion criterion",
	"{0}\n\n충족했습니까?": "{0}\n\nHas it been met?",
	"(완료 조건이 비어 있습니다)": "(the completion criterion is empty)",
	충족: "Met",
	"종료하지 않았습니다. 완료 조건을 다시 보거나 status를 on-hold로 두세요.":
		"Not closed. Revisit the completion criterion, or set the status to on-hold.",
	"uses가 빈 결과물이 있습니다": "Some outputs have an empty uses",
	"{0}\n\n사용한 지식 링크는 Transform의 완료 증거입니다. 그래도 계속할까요?":
		"{0}\n\nThe knowledge an output used is the evidence that Transform happened. Continue anyway?",
	계속: "Continue",
	보관: "Archive",
	"컨테이너와 함께 Archive로 갑니다.": "Goes to Archive together with the container.",
	"Zettel로 승격": "Promote to Zettel",
	"2_Internalize로 옮기고 seed로 둡니다.": "Moves to 2_Internalize and stays a seed.",
	"Source로 승격": "Promote to Source",
	"1_Arrange/Resources로 옮깁니다.": "Moves to 1_Arrange/Resources.",
	"{0} 처리": "Handle {0}",
	완료: "Done",
	"status: done, completed 기록": "status: done, records completed",
	언젠가: "Someday",
	그대로: "Leave it",
	"상태를 바꾸지 않습니다.": "The status is not changed.",
	"다음에 다시 할 때 달라질 점을 한 줄로 씁니다. 비워 두고 나중에 써도 됩니다.":
		"Write in one line what you would do differently next time. You can leave it for later.",
	"{0} 종료": "Closed {0}",
	"승격 {0}건": "Promoted: {0}",

	// 2.3 점검 값
	수집함: "Inbox",
	"대기 중": "Waiting",
	"멈춘 프로젝트": "Stalled projects",
	"연결 없는 Zettel": "Unlinked Zettels",
	"오래된 seed": "Old seeds",
	"uses 없는 결과물": "Outputs without uses",
	"오늘 복습": "Due today",

	// C15 vault 쪽 절반
	본문: "body",
	"자동으로 고칠 수 없는 항목입니다.": "This one cannot be fixed automatically.",
	"폴더 규칙은 직접 고쳐야 합니다.": "Folder rules have to be fixed by hand.",
	"이동할 폴더가 없습니다.": "There is no folder to move it to.",
	"바꿀 이름이 없습니다.": "There is no name to change it to.",
	"이름 변경: {0}": "Renamed: {0}",
	"유형을 알 수 없습니다.": "The type is unknown.",
	"속성을 추가했습니다: {0}": "Properties added: {0}",
	"고를 값이 없습니다.": "There is no value to pick.",
	"취소했습니다.": "Cancelled.",
	"파일을 열었습니다.": "Opened the file.",
	"규칙 위반이 없습니다.": "No rule violations.",
	"규칙 위반 {0}건": "Rule violations: {0}",

	// C15 규칙 이름과 문구
	"유형과 거처": "Type vs. home folder",
	"필수 속성": "Required properties",
	파일명: "File name",
	"허브 이름": "Hub name",
	"컨테이너 내용": "Container contents",
	"폴더 깊이": "Folder depth",
	"관계 무결성": "Relation integrity",
	"값 범위": "Value range",
	"{0}이(가) 컨테이너 {1} 안에 있습니다. 관계는 속성으로만 표현합니다.":
		"{0} is inside the container {1}. Relations are expressed as properties only.",
	"{0}(으)로 이동": "Move to {0}",
	"허브 이름이 컨테이너 폴더 이름({0})과 다릅니다.":
		"The hub name differs from the container folder name ({0}).",
	"{0}(으)로 이름 변경": "Rename to {0}",
	"파일명 규칙에 맞지 않습니다. 제안: {0}": "This breaks the naming rule. Suggested: {0}",
	"필수 속성이 비어 있습니다: {0}": "Required properties are empty: {0}",
	"속성 추가 후 열기": "Add the properties, then open",
	"{0} 값 고르기": "Pick a value for {0}",
	"{0}의 링크 [[{1}]]이(가) 해석되지 않습니다.": "The link [[{1}]] in {0} does not resolve.",
	"보관된 {0} [[{1}]]을(를) 가리키는 활성 Task입니다.":
		"An active Task pointing at the archived {0} [[{1}]].",
	"{0}의 거처는 {1}입니다. 지금은 {2}에 있습니다.": "{0} belongs in {1}. It is in {2}.",
	"vault 루트": "the vault root",
	"{0} 허브는 같은 이름의 컨테이너 폴더 안에 있어야 합니다.":
		"A {0} hub has to live in a container folder of the same name.",
	"{0} 컨테이너는 {1} 바로 아래에 있어야 합니다. 지금은 {2}입니다.":
		"A {0} container has to sit directly under {1}. It is in {2}.",
	"{0}은(는) 프로젝트나 영역 컨테이너 안에 있어야 합니다. 지금은 {1}에 있습니다.":
		"{0} has to live inside a project or area container. It is in {1}.",
	"컨테이너에 같은 이름의 허브 노트({0}.md)가 없습니다.":
		"The container has no hub note of the same name ({0}.md).",
	"허브를 만들어야 합니다": "A hub has to be created",
	"컨테이너 안의 하위 폴더는 _files만 허용합니다: {0}":
		"Only _files is allowed as a subfolder of a container: {0}",
	"보고만 합니다": "Reported only",

	// 2.2 유형과 상태 라벨
	"Task (행동 하나)": "Task (one action)",
	"Project (컨테이너와 허브)": "Project (container and hub)",
	"Area (컨테이너와 허브)": "Area (container and hub)",
	"Working (작업 노트 W-)": "Working (work note, W-)",
	"Output (결과물 O-)": "Output (deliverable, O-)",
	"Source (참고 자료 S-)": "Source (reference, S-)",
	"Zettel (자기 말로 쓴 주장)": "Zettel (a claim in your own words)",
	"Map (지식 지도 M-)": "Map (knowledge map, M-)",
	"회상 세션 (N-)": "Recall session (N-)",
	검토: "Review",
	"Review (프로젝트 종료)": "Review (project close)",
	"next (다음 행동)": "next (next action)",
	"scheduled (예정)": "scheduled",
	"waiting (대기)": "waiting",
	"someday (언젠가)": "someday",
	"done (완료)": "done",
	"active (진행 중)": "active (in progress)",
	"on-hold (보류)": "on-hold",

	// 생성 공통
	"파일명 규칙을 적용하면 이름이 비어 있습니다. 다른 제목을 쓰세요.":
		"Applying the naming rule leaves an empty name. Use a different title.",
	"Zettel 제목이 {0}자입니다. {1}자 안팎을 권장합니다.":
		"This Zettel title is {0} characters. About {1} is recommended.",

	// 2.2 스키마 검사 문구
	'{0}는 "{1}"여야 합니다.': '{0} has to be "{1}".',
	'{0} 값 "{1}"은(는) 허용값이 아닙니다.': 'The {0} value "{1}" is not an allowed value.',
	"{0}는 숫자여야 합니다.": "{0} has to be a number.",
	"{0}는 {1}~{2} 범위여야 합니다. 지금은 {3}입니다.": "{0} has to be between {1} and {2}. It is {3}.",
	"{0}는 true 또는 false여야 합니다.": "{0} has to be true or false.",
	"{0}는 YYYY-MM-DD여야 합니다.": "{0} has to be YYYY-MM-DD.",
	"{0}는 링크 하나만 받습니다.": "{0} takes a single link.",

	// 5.5 설정 탭
	"수집함 (S)": "Inbox (S)",
	"회상 세션 (N)": "Recall sessions (N)",
	템플릿: "Templates",
	"점검 리포트": "Check reports",
	프로젝트: "Project",
	영역: "Area",
	"작업 노트": "Working note",
	결과물: "Output",
	"참고 자료": "Source",
	지도: "Map",
	"회상 세션": "Recall session",
	회상: "Recall",
	"회상 간격": "Recall intervals",
	"box 1부터 순서대로 쓸 간격(일)입니다. 쉼표로 구분합니다.":
		"Days between reviews, from box 1 upwards. Separate them with commas.",
	"오래된 seed 임계값": "Old seed threshold",
	"seed 상태로 이 일수를 넘긴 Zettel을 점검에서 표시합니다.":
		"Checks flag a Zettel that has been a seed for more days than this.",
	"시작과 화면": "Startup and screen",
	"시작 시 Home 열기": "Open Home on startup",
	"C17. Obsidian을 열면 Home 노트를 활성 탭으로 띄웁니다.":
		"C17. Makes the Home note the active tab when Obsidian opens.",
	"Home 경로": "Home path",
	"파일 탐색기에서 허브 구분 표시": "Mark hubs in the file explorer",
	"C18. 컨테이너 폴더와 이름이 같은 허브 노트를 굵게 표시합니다.":
		"C18. Shows the hub note of a container folder in bold.",
	점검: "Checks",
	"시작 시 규칙 검사": "Check rules on startup",
	"C15. Obsidian을 열 때 vault를 검사하고 위반 수를 알립니다.":
		"C15. Scans the vault when Obsidian opens and reports how many violations there are.",
	"이동·이름 변경 시 규칙 검사": "Check rules on move and rename",
	"C15. 파일을 옮기거나 이름을 바꿀 때 그 파일만 검사해 바로 알립니다.":
		"C15. Checks just that file when you move or rename it, and tells you right away.",
	"주간 검토 시 리포트 저장": "Save a report with the weekly review",
	"C20. C10을 실행하면 점검 리포트 JSON을 함께 저장합니다.":
		"C20. Running C10 also writes the check report as JSON.",
	"스키마 버전": "Schema version",
	"현재 플러그인 스키마는 v{0}, 이 vault에 맞춘 버전은 v{1}입니다.":
		"The plugin schema is v{0}; this vault was last matched to v{1}.",
	"C19 마이그레이션 실행": "Run the C19 migration",
	"폴더 경로": "Folder paths",
	"파일명 접두사": "File name prefixes",
	"기본값으로 되돌리기": "Restore the defaults",
	"폴더, 접두사, 회상 간격을 설계안 기본값으로 돌립니다.":
		"Puts folders, prefixes and recall intervals back to the design document's defaults.",
	되돌리기: "Restore",

	// 공용 입력 UI
	확인: "OK",
	없음: "none",
	고르기: "Pick",
	"고를 수 있는 노트가 없습니다.": "There is no note to pick.",
	비우기: "Clear",
	"{0}은(는) 필수입니다.": "{0} is required.",

	// 파일 조작
	"폴더를 만들 수 없습니다. 같은 이름의 파일이 있습니다: {0}":
		"Cannot create the folder: a file of the same name exists: {0}",
	"이미 같은 이름이 있습니다: {0}": "Something with that name already exists: {0}",

	// C16 패널
	"새로 고침": "Refresh",
	"주간 검토 (C10)": "Weekly review (C10)",
	"규칙 검사 (C15)": "Check rules (C15)",
	"수집함 처리 (C12)": "Process inbox (C12)",
	"{0} 보기 열기": "Open the {0} view",
	"규칙 위반": "Rule violations",
};

const TABLES: Record<Locale, Record<string, string> | null> = {
	// 원문이 한국어이므로 ko는 표가 없습니다.
	ko: null,
	en: EN,
};

let current: Locale | null = null;

/** "ko-KR"이나 "en-GB"처럼 지역이 붙은 값도 받습니다. 모르는 언어는 null입니다. */
export function normalizeLocale(raw: unknown): Locale | null {
	if (typeof raw !== "string") return null;
	const tag = raw.trim().toLowerCase().replace(/_/g, "-");
	if (tag === "ko" || tag.startsWith("ko-")) return "ko";
	if (tag === "en" || tag.startsWith("en-")) return "en";
	return null;
}

function fromStorage(): string | null {
	try {
		const storage = (globalThis as { localStorage?: { getItem(key: string): string | null } })
			.localStorage;
		return storage ? storage.getItem("language") : null;
	} catch {
		// 저장소가 막혀 있는 환경(비공개 창 등)에서도 죽지 않습니다.
		return null;
	}
}

function fromNavigator(): string | null {
	return (globalThis as { navigator?: { language?: string } }).navigator?.language ?? null;
}

/**
 * Obsidian은 앱 언어를 localStorage의 `language` 키에 둡니다. 영어면 키가 없을 수도 있어서
 * moment의 로케일(hint)과 브라우저 언어를 차례로 봅니다.
 */
export function detectLocale(hint?: string | null): Locale {
	return (
		normalizeLocale(fromStorage()) ??
		normalizeLocale(hint) ??
		normalizeLocale(fromNavigator()) ??
		DEFAULT_LOCALE
	);
}

/** 언어를 고정합니다. 플러그인 로드 때 한 번, 테스트에서 필요할 때 씁니다. */
export function setLocale(locale: Locale): void {
	current = locale;
}

export function currentLocale(): Locale {
	if (current === null) current = detectLocale();
	return current;
}

/** 다음 호출에서 다시 감지하게 합니다. */
export function resetLocale(): void {
	current = null;
}

/** 번역이 없으면 원문을 씁니다. {0}, {1}은 인자로 채웁니다. */
export function t(message: string, ...args: unknown[]): string {
	const table = TABLES[currentLocale()];
	const template = table?.[message] ?? message;
	if (args.length === 0) return template;
	return template.replace(/\{(\d+)\}/g, (whole, index) => {
		const value = args[Number(index)];
		return value === undefined ? whole : String(value);
	});
}

/**
 * 원문과 모든 번역입니다. 이미 노트에 쓰인 줄을 다시 찾을 때 씁니다.
 * 줄을 쓴 뒤에 언어를 바꿔도 찾을 수 있어야 하므로 지금 언어만 보면 안 됩니다.
 */
export function allTranslations(message: string): string[] {
	const out = [message];
	for (const table of Object.values(TABLES)) {
		const translated = table?.[message];
		if (translated && !out.includes(translated)) out.push(translated);
	}
	return out;
}

/** 테스트용: en 표에 있는 원문 목록입니다. */
export function translatedMessages(): string[] {
	return Object.keys(EN);
}
