# SaintFlow Obsidian 플러그인

영문 README는 [README.md](README.md)에 있습니다.

SaintFlow vault의 `9_System/SaintFlow 최종 설계안.md` 5장의 구현입니다.
설계안이 단일 기준이고, 동작을 바꿀 때는 설계안을 먼저 고칩니다.

- 플러그인 ID: `saintflow`
- Node API를 쓰지 않으므로 모바일에서도 동작합니다(`isDesktopOnly: false`).
- 역할 분담(5.2): Bases가 보기를 맡고, 플러그인은 생성·변경·점검 계산을 맡습니다.
- 사용자 본문은 쓰지 않습니다(규칙 6). 플러그인이 만드는 것은 골격과 링크 줄뿐입니다.

## 빌드

이 저장소는 vault 밖에 있습니다. 빌드 산출물만 vault의 `.obsidian/plugins/saintflow/`로 나갑니다.
`node_modules`가 vault 안에 들어가지 않고 Obsidian Sync 대상에서도 빠집니다.

```
npm install
npm run build      # 타입 검사 + vault로 번들
npm run dev        # 감시 모드
npm test           # 순수 함수 단위 테스트
npm run typecheck
```

vault 경로 기본값은 이 저장소 옆의 `../SaintFlow`입니다. 다르면 환경 변수로 지정합니다.

```
SAINTFLOW_VAULT="D:/vaults/SaintFlow" npm run build
```

빌드한 뒤 Obsidian에서 설정 → 커뮤니티 플러그인 → SaintFlow를 켭니다.

## 명령

| ID | 명령 팔레트 | 조건 | 하는 일 |
| --- | --- | --- | --- |
| C1 | `C1 수집` (리본 아이콘) | 어디서나 | 한 줄 입력 → `0_Sweep/`에 파일. 중복이면 번호 |
| C2 | `C2 분류` | 활성 파일이 `0_Sweep/`에 있음 | 유형 선택 → 유형별 입력 → 템플릿 속성 병합(본문 보존) → 파일명 규칙 → 거처로 이동 |
| C3 | `C3 맥락 생성` | 활성 파일이 2.4의 부모 | 허용 유형 선택 → 제목 입력 → 관계 자동 기록 → 기본값 → 생성 후 열기 |
| C4 | `C4 새 프로젝트` / `C4 새 영역` | 어디서나 | 컨테이너와 허브 생성. 완료 조건이 비면 거부 |
| C5 | `C5 관계 지정` | 해당 필드가 있는 파일 | project, area, sources, uses를 유형 필터 선택기로 채움 |
| C6 | `C6 Zettel 연결 추가` | 활성 파일이 Zettel | 연결 섹션에 `- [[X]] — 이유`. 이유가 비면 거부 |
| C7 | `C7 상태 전환` | Task, Project, Zettel, Output | 전환 조건을 검사. 미충족이면 상태 불변 |
| C8 | `C8 회상 세션 시작` / `C8 회상 채점` | 세션은 어디서나, 채점은 recall Zettel | 세션 노트 생성, box·last_reviewed·last_result·인출 기록 갱신 |
| C9 | `C9 프로젝트 종료` | 활성 파일이 `P-` 허브 | 판정 → uses 확인 → W- 수확 → 남은 Task 처리 → done → `R-종료-이름` → 컨테이너 보관 |
| C10 | `C10 주간 검토` | 어디서나 | `R-YYYY-Www` 생성 → 2.3 점검 값을 "점검 스냅샷"에 기록 (+ C20 리포트) |
| C11 | `saintflow-new` 코드 블록 | 블록이 놓인 노트가 부모 | 허용 유형 버튼 렌더링 → C3 실행 |
| C12 | `C12 Inbox 처리 모드` | `0_Sweep`에 파일이 있을 때 | 생성 순으로 하나씩 열고 판단 순서를 제시 → 2분 규칙 / 분류 / 건너뛰기 / 삭제 → 처리 요약 |
| C13 | `C13 Source에서 Zettel 추출` | Source의 "추출할 생각" 체크리스트에 커서 | 항목 문구를 제목 후보로 → seed Zettel 생성 → 항목을 체크하고 링크로 치환 |
| C14 | `C14 선택 영역 승격` | W- 노트에서 텍스트 선택 | 선택 텍스트를 Zettel(생각) 또는 Source(핵심 내용)로 **이동**, 자리에 링크만 남김 |
| C15 | `C15 규칙 검사` | 어디서나 (설정으로 시작 시·이름 변경 시에도) | vault 검사 → 규칙별 목록 → 항목마다 열기와 빠른 수정 |
| C16 | `C16 SaintFlow 패널 열기` (리본 아이콘) | 사이드바 | 점검 개수 상시 표시, 클릭하면 목록이나 Bases 보기 |
| C17 | `C17 Home 열기` | 시작 시 자동 (설정) | 워크스페이스 로드 후 Home을 활성 탭으로 |
| C18 | `C18 허브 열기` | 컨테이너 안의 파일, 또는 폴더 메뉴 | 컨테이너 허브로 이동. 없으면 생성 제안. 탐색기에서 허브 구분 표시 |
| C19 | `C19 스키마 마이그레이션` | 명령 실행 (버전이 오르면 안내) | 스키마와 frontmatter 비교 → 미리보기 → 적용. 본문 불변, 멱등 |
| C20 | `C20 점검 리포트 내보내기` | 명령 실행, C10 시 자동 | `9_System/reports/YYYY-MM-DD.json` 저장 |

`점검 스냅샷 보기` 명령은 노트를 만들지 않고 개수만 알림으로 보여줍니다.

파일 탐색기 우클릭 메뉴에도 항목이 붙습니다. `0_Sweep`의 파일에는 "분류", 부모가 될 수 있는
노트에는 "여기서 만들기", 컨테이너 폴더에는 "허브 열기"입니다.

### C11 블록 문법

````markdown
```saintflow-new
types: task, working, output, zettel, source
```
````

`types`는 설계안 2.4에서 부모 유형에 허용된 자식만 받습니다. 허용되지 않은 유형은 오류 문구로 표시됩니다.
부모 유형은 블록이 놓인 노트의 `type` 속성으로 판정합니다.

| 부모 | 허용되는 자식 |
| --- | --- |
| project | task, zettel, source, working, output, review-close |
| area | task, project, zettel, source, working |
| source | zettel |
| zettel | zettel |
| map | zettel |

### C15 검사 항목

| 규칙 | 위반 예 | 빠른 수정 |
| --- | --- | --- |
| 유형과 거처 | `type: task`인데 4_Transform 밖에 있음 | 거처로 이동 |
| 필수 속성 | Project에 `outcome` 없음 | 속성 추가 후 파일 열기 |
| 파일명 | 접두사 누락, 금지 문자 포함 | 규칙에 맞는 이름 제안 |
| 허브 이름 | 컨테이너 폴더명과 허브 파일명 불일치, 허브 없음 | 허브 이름 변경 (허브 없음은 보고만) |
| 컨테이너 내용 | 컨테이너 안에 Task, Zettel, Source | 거처로 이동 |
| 폴더 깊이 | 컨테이너 안에 하위 폴더(`_files` 제외) | 보고만 |
| 관계 무결성 | 보관된 프로젝트를 가리키는 활성 Task, 해석되지 않는 링크 | 파일 열기 |
| 값 범위 | 허용값 밖의 `status`, 1~5 밖의 `box` | 값 선택 |

템플릿 폴더는 값이 비어 있는 골격이라 검사에서 뺍니다.

### C20 리포트 스키마

```json
{
  "schema": "saintflow-report/1",
  "generated": "2026-09-21",
  "checks": [{ "key": "inbox", "title": "수집함", "count": 1, "items": [{ "path": "...", "name": "...", "note": "..." }] }],
  "violations": [{ "rule": "home", "ruleLabel": "유형과 거처", "path": "...", "name": "...", "message": "...", "fix": "move" }],
  "totals": {
    "checks": { "inbox": 1 },
    "violations": { "home": 1 },
    "checkTotal": 7,
    "violationTotal": 9
  }
}
```

## 구조

```
saintflow/
├── main.ts                    명령 등록, 인덱스와 이벤트 수명 주기
├── src/
│   ├── checks.ts              2.3 파생 값, 1.7 회상 판정        (순수)
│   ├── dates.ts               ISO 날짜와 주차 계산               (순수)
│   ├── naming.ts              3.5 파일명 규칙                    (순수)
│   ├── links.ts               [[파일명]] 표기                    (순수)
│   ├── sections.ts            2.5 본문 섹션 읽기·쓰기            (순수)
│   ├── model.ts               2.2 유형, 2.4 매트릭스             (순수)
│   ├── schema.ts              2.2 스키마와 검사 규칙             (순수)
│   ├── config.ts              설정 값과 기본값                   (순수)
│   ├── i18n.ts                UI 언어와 메시지 표                (순수)
│   ├── placement.ts           3.1 거처, 3.5 파일명 생성          (순수)
│   ├── lint.ts                C15 판정 규칙                      (순수)
│   ├── blocks/block-syntax.ts C11 블록 문법                      (순수)
│   ├── graph.ts               관계 인덱스와 점검 계산
│   ├── lint-vault.ts          C15 사실 수집과 빠른 수정 적용
│   ├── relations.ts           노트 생성과 관계 기록
│   ├── vault-io.ts            Obsidian API 래퍼
│   ├── templates.ts           템플릿 읽기와 내장 골격
│   ├── settings.ts            5.5 설정 탭
│   ├── ui/modals.ts           입력 UI
│   ├── views/panel.ts         C16 사이드바 패널
│   └── commands/              C1~C20
└── tests/
    ├── *.test.ts              순수 함수 단위 테스트, 메시지 표 검사
    └── fixture-vault/         6.2 픽스처, 심어 둔 C15 위반, 수용 테스트 절차
```

`(순수)` 표시한 모듈은 `obsidian`을 import하지 않습니다. 설계안 5.4가 요구하는 대로
판정 규칙을 순수 함수로 떼어 두어 단위 테스트할 수 있게 했습니다.

## 언어

화면 언어는 Obsidian 언어 설정을 따릅니다. 지금은 한국어와 영어가 있고, 그 밖의 언어는
Obsidian 기본값인 영어로 떨어집니다.

- 언어는 `onload`에서 명령을 등록하기 전에 한 번 정합니다. Obsidian이 설정을 두는
  `localStorage.language`를 먼저 보고, 없으면 moment 로케일과 브라우저 언어를 봅니다.
  언어를 바꾸면 Obsidian이 다시 로드되므로 플러그인도 같이 따라갑니다.
- 메시지 표는 `src/i18n.ts` 하나입니다. 한국어 원문이 곧 키라서 번역이 없으면 빈 칸이 아니라
  원문이 그대로 나옵니다.
- **번역하는 것은 화면 문구뿐입니다.** vault에 남는 말은 설계안이 정한 그대로 둡니다.
  섹션 이름(`sections.ts`), 템플릿 골격(`templates.ts`), `R-종료-` 이름(`placement.ts`),
  Bases 보기 이름(`panel.ts`), frontmatter의 키와 값이 그렇습니다. 이것들을 번역하면 링크와
  `findSection`과 C15 검사가 깨집니다.
- 플러그인이 만드는 글(주간 검토의 점검 스냅샷, 회상 세션 노트, C20 리포트의 `title`과
  `ruleLabel`)은 그때의 언어로 나옵니다. `key`, `rule`, `fix`는 언어와 무관한 식별자입니다.
  C8은 세션 노트의 `판정:` 줄을 모든 번역으로 찾으므로 중간에 언어를 바꿔도 채점이 됩니다.
- 언어를 더하려면 `src/i18n.ts`의 `TABLES`에 표를 넣고 `normalizeLocale`에 태그를 알려 줍니다.
  `tests/i18n.test.ts`가 빠진 번역과 남은 번역을 잡습니다.

## 구현 메모

- **관계는 자식 쪽에만 씁니다**(규칙 8). 예외는 Map 하나로, 구조 섹션의 링크를 부모가 소유합니다(2.4).
- **frontmatter 링크는 `getFirstLinkpathDest`로 직접 해석합니다.** `resolvedLinks`에 frontmatter 링크가
  들어가는지에 기대지 않습니다(5.4).
- **orphan 판정은 연결 섹션 안의 링크만 셉니다.** 헤딩과 링크의 줄 위치를 `metadataCache`에서 읽어
  본문을 다시 읽지 않고 가릅니다.
- **파일 이동은 `fileManager.renameFile`로 합니다.** 링크는 Obsidian이 갱신합니다.
- **C9는 순서를 지킵니다.** 수확(W- 승격)이 먼저이고 컨테이너 보관이 나중입니다(규칙 4).
- **C10, C16, C20은 같은 `computeSnapshot`을 씁니다.** 세 화면이 어긋날 수 없습니다.
- **C14는 복사가 아니라 이동입니다.** 원본에서 선택 텍스트를 지우고 링크만 남깁니다.
- **C19는 `processFrontMatter`만 씁니다.** 본문은 어떤 경우에도 건드리지 않고, 허용값 밖의 값은
  자동으로 바꾸지 않고 보고만 합니다.
- **템플릿이 없어도 동작합니다.** `9_System/Templates`에 파일이 없으면 내장 골격을 씁니다.

## 설정

| 설정 | 기본값 |
| --- | --- |
| 폴더 경로 | 설계안 3.1 (+ 리포트 `9_System/reports`) |
| 회상 간격 | 1, 3, 7, 14, 30 |
| old_seed 임계값 | 14일 |
| 파일명 접두사 | P-, A-, W-, O-, S-, M-, N-, R- |
| 템플릿 폴더 | 9_System/Templates |
| 시작 시 Home 열기 | 켬 |
| 파일 탐색기 허브 표시 | 켬 |
| 시작 시 규칙 검사 | 끔 |
| 이동·이름 변경 시 규칙 검사 | 끔 |
| 주간 검토 시 리포트 저장 | 켬 |

## 아직 하지 않은 것

- 설계안 6.1의 V1~V8은 Obsidian에서 직접 확인해야 하는 Bases 동작 검증입니다. 플러그인 쪽 계산은
  6.1과 무관하게 C10이 담당합니다.
- 6.3과 픽스처 README의 수용 테스트는 Obsidian을 열어야 하므로 실행하지 않았습니다.
- 설계안 9장 미결 사항 중 Task의 context 속성은 넣지 않았습니다.
- `KEY_RENAMES`(C19의 키 이름 변경표)는 비어 있습니다. 아직 이름이 바뀐 키가 없습니다.
