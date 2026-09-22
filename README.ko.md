# SaintFlow Obsidian 플러그인

[English](README.md)

SaintFlow Manual의 폴더·속성·템플릿을 사용하는 Obsidian 플러그인입니다. 버전 0.3.0은 `C:\Users\saint\Documents\work\SaintFlow` 볼트의 매뉴얼과 템플릿에 맞춰 동작합니다. Bases가 보기를, 플러그인이 생성·분류·관계·회상·점검을 담당합니다. 모바일에서도 사용할 수 있습니다.

## 빌드와 설치

```powershell
npm ci
npm test
npm run build
```

기본 빌드는 `dist/`에 `main.js`, `manifest.json`, `styles.css`를 만듭니다. 실제 볼트에 설치하려면 다음과 같이 경로를 지정합니다.

```powershell
$env:SAINTFLOW_VAULT = 'C:\Users\saint\Documents\work\SaintFlow'
npm run build
```

산출물은 볼트의 `.obsidian/plugins/saintflow/`에 저장됩니다. Obsidian에서 커뮤니티 플러그인 **SaintFlow**를 켜거나 다시 로드합니다. 기존 Templater의 SF 명령과 함께 사용할 수 있습니다.

## 볼트 규칙

| 유형 | 기본 위치 | 주요 속성 |
| --- | --- | --- |
| Task | `4_Transform/Tasks` | status, project[], area[], parent, scheduled, due |
| Project | `1_Arrange/Projects` | status, done_criteria, due, area[], parent |
| Area | `1_Arrange/Areas` | status, standard, review_cycle |
| Resource | `1_Arrange/Resources` | status, kind, author, link, project[], area[] |
| Zettel | `2_Internalize/Zettels` | maturity, source[], project[], area[], recall, question, box |
| Map | `2_Internalize/Maps` | archived, created |
| Output | `4_Transform/Outputs` | kind, status, project[], uses[], link |
| Recall | `3_Narrate` | type: recall, date |
| Weekly / Closing | `5_Flow/Reviews` | type: weekly 또는 closing, date, project[] |

Project와 Area는 유형 폴더 바로 아래에 생성됩니다. 일반 항목에는 접두사를 붙이지 않으며, 날짜 노트만 `N-`, `R-` 규칙을 사용합니다. 보관 여부는 `archived`로 판정합니다. 기존 Archive 경로도 보관으로 인식합니다.

## 주요 명령

기존 C1~C20 명령 ID는 유지됩니다.

- **C1 수집 / C2 분류 / C12 Inbox:** `dispatch`로 목적지를 고를 수 있습니다. 기존 본문, link, created와 사용자 속성을 보존하며 누락된 템플릿 섹션을 추가합니다. 방 노트는 처리 대상에서 제외합니다.
- **C3 맥락 생성:** 일반 노트에서는 모든 주요 유형, 부모 노트에서는 허용된 자식을 생성합니다. 하위 프로젝트는 parent와 상위의 area를, 하위 Task는 parent만 기록합니다. Resource에서 만든 Zettel은 source를, Map·Zettel에서 만든 Zettel은 부모 본문에 링크를 남깁니다.
- **C4 프로젝트·영역 / C5 관계 / C7 상태:** 새 상태값과 목록형 관계를 사용합니다. Zettel은 status 대신 maturity를 변경합니다.
- **C8 회상:** question 속성에서 질문을 읽습니다. 같은 날 다시 실행하면 새 대상만 추가합니다. 판정은 회상 노트에 남기고 Zettel에는 box, last_reviewed, last_result를 갱신합니다.
- **C9 종료:** Closing 템플릿의 검토 노트를 열거나 만듭니다. 완료 조건, 지식 정리, status 변경과 archived 설정은 체크리스트에 따라 직접 처리합니다.
- **C10 Weekly / C16 패널 / C20 리포트:** 열린 Task와 active 하위 프로젝트를 함께 보는 멈춤 판정, created 기준 14일 이상 seed, 완료된 Output의 uses 누락을 계산합니다. 템플릿과 방 노트를 점검 대상에서 제외합니다.
- **C13 / C14:** Resource의 `여기서 나온 생각` 체크리스트에서 Zettel을 추출하거나, Project·Area·기존 Working에서 선택한 본문을 Zettel·Resource로 옮깁니다.
- **C18:** 연결된 parent·project·area 또는 상위 폴더의 방 노트를 엽니다.

C11 버튼 블록 예시:

````markdown
```saintflow-new
types: task, project, output, resource, zettel
```
````

## 기존 볼트 업그레이드

C19는 변경 미리보기 후 속성만 변환합니다. source → resource, session → recall, review → weekly/closing, outcome → done_criteria, deadline → due, Zettel status → maturity, sources → source를 처리합니다. 기존 단일 관계는 목록으로 바꾸며, 새 키에 값이 있으면 덮어쓰지 않습니다. 본문과 파일 위치는 그대로 두고, 거처 수정은 C15에서 따로 적용합니다.

이전 기본 폴더와 접두사 설정은 새 기본값으로 갱신하고 사용자 지정값은 유지합니다. 스키마는 v2입니다. 템플릿 파일이 없으면 동일한 내장 템플릿을 사용합니다.

## 검증

`npm test`는 순수 함수 검사와 Obsidian API 대역을 사용하는 명령 통합 검사를 실행합니다. `tests/manual-vault`는 실제 볼트와 대조한 기본 템플릿·Bases·방 노트입니다. `tests/fixture-vault`는 이전 스키마의 참고 픽스처입니다.

실제 Obsidian에서 설치된 플러그인을 검사하려면 CLI를 켜고 다음을 실행합니다. 고유 이름의 임시 노트를 생성해 명령의 입력창과 실행 결과를 확인하고, 마지막에 해당 노트만 삭제합니다. 사전에 중요한 노트를 저장하고 열린 입력창을 닫아 주세요.

```powershell
$env:OBSIDIAN_CLI = "$env:LOCALAPPDATA\Programs\Obsidian\Obsidian.com"
node tests/obsidian-smoke.mjs SaintFlow
```

UI는 한국어·영어를 지원합니다. 저장되는 속성 키·값과 템플릿 섹션은 볼트 규칙을 따릅니다.
