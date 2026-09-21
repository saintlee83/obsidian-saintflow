# 픽스처 vault

설계안 6.2의 픽스처에 C15 위반을 심어 둔 것입니다. 수용 테스트(6.3)를 손으로 돌릴 때 씁니다.

## 여는 법

1. Obsidian에서 이 폴더(`tests/fixture-vault`)를 vault로 엽니다.
2. 빌드 산출물을 이 vault의 플러그인 폴더에 넣습니다. 저장소 루트에서:

   ```
   npm install
   npm run build
   cp -r "<vault>/.obsidian/plugins/saintflow" tests/fixture-vault/.obsidian/plugins/
   ```

3. 설정 → 커뮤니티 플러그인에서 SaintFlow를 켭니다. 코어 플러그인 Templates, Daily notes, Bases도 켭니다.
4. SaintFlow 설정에서 **오래된 seed 임계값을 0**으로 둡니다. 기본값 14일로는 새로 만든 픽스처가 걸리지 않습니다.

## 파일과 기대값 (설계안 6.2)

| 파일 | 내용 | 기대 결과 |
| --- | --- | --- |
| `1_Arrange/Projects/P-정상/P-정상.md` | active, 완료 조건 | stalled = false |
| `4_Transform/정상 다음 행동하기.md` | next, project = P-정상 | P-정상 허브에 표시 |
| `1_Arrange/Projects/P-멈춤/P-멈춤.md` | active, next Task 없음 | stalled = true |
| `4_Transform/회신 받기.md` | waiting, waiting_on | 대기 1건 |
| `2_Internalize/Zettels/연결된 주장.md` | evergreen, 연결 2개와 이유 | orphan = false |
| `2_Internalize/Zettels/보조 주장.md` | evergreen, 연결 2개 | 연결된 주장과 복습 대상이 고립되지 않게 받침 |
| `2_Internalize/Zettels/고립된 주장.md` | seed, 링크 없음 | orphan = true, old_seed = true |
| `2_Internalize/Zettels/복습 대상.md` | recall, box 2, last_reviewed = 2026-09-18 | due_today = true |
| `1_Arrange/Projects/P-정상/O-결과.md` | output, shipped, uses 비어 있음 | output_without_uses = 1 |
| `1_Arrange/Resources/S-테스트.md` | source, project = P-정상 | P-정상 허브의 연결된 지식에 표시 |
| `2_Internalize/Maps/M-테스트.md` | map | C11 테스트용 |
| `0_Sweep/미분류.md` | 스키마 없음 | Sweep 잔량 1 |

설계안 6.2 표에 없는 `보조 주장`을 하나 더 두었습니다. `연결된 주장`의 연결 대상이 실재해야 하는데,
그 대상을 `고립된 주장`으로 삼으면 들어오는 링크가 생겨 orphan 기대값이 깨지기 때문입니다.

## 점검 스냅샷 기대값 (C10, C16, C20)

세 화면이 같은 계산을 씁니다. 값이 서로 다르면 버그입니다.

| 점검 | 개수 |
| --- | --- |
| 수집함 | 1 |
| 대기 중 | 1 |
| 멈춘 프로젝트 | 1 |
| 연결 없는 Zettel | 1 |
| 오래된 seed | 1 |
| uses 없는 결과물 | 1 |
| 오늘 복습 | 1 |

`오래된 seed`는 `생성 후 임계일 초과`가 기준입니다(설계안 2.3). 임계값 0으로 두더라도
`고립된 주장`을 만든 당일에는 0일이라 걸리지 않습니다. 파일을 만든 다음 날부터 1이 됩니다.

## 심어 둔 C15 위반 (총 9건)

| 규칙 | 파일 | 기대 |
| --- | --- | --- |
| 유형과 거처 | `2_Internalize/거처 위반 확인하기.md` | 4_Transform으로 이동 제안 |
| 필수 속성 | `1_Arrange/Projects/P-속성 누락/P-속성 누락.md` | outcome 추가 제안 |
| 파일명 | `1_Arrange/Resources/접두사 없는 자료.md` | `S-접두사 없는 자료` 제안 |
| 허브 이름 (노트) | `1_Arrange/Projects/P-이름 불일치/P-다른 이름.md` | `P-이름 불일치`로 이름 변경 제안 |
| 허브 이름 (폴더) | `1_Arrange/Projects/P-이름 불일치/` | 허브 없음, 보고만 |
| 컨테이너 내용 | `1_Arrange/Projects/P-정상/컨테이너 안 할 일하기.md` | 4_Transform으로 이동 제안 |
| 폴더 깊이 | `1_Arrange/Projects/P-멈춤/초안/` | 보고만 |
| 관계 무결성 | `4_Transform/없는 프로젝트 확인하기.md` | 링크 해석 실패, 파일 열기 |
| 값 범위 | `4_Transform/값 범위 확인하기.md` | status 값 고르기 |

대조군으로 `1_Arrange/Projects/P-정상/_files/`를 두었습니다. 컨테이너 안에서 유일하게
허용되는 하위 폴더이므로 "폴더 깊이"에 잡히면 안 됩니다.

위반을 심은 파일들은 점검 스냅샷을 흔들지 않도록 골랐습니다. 프로젝트는 `on-hold`,
Task의 status는 `next`나 허용값 밖의 값이라 `멈춘 프로젝트`와 `대기 중` 개수가 그대로입니다.

## 수용 테스트

### C1~C11 (설계안 6.3)

| 명령 | 테스트 | 기대 |
| --- | --- | --- |
| C1 | 리본에서 수집 → "테스트 수집" | `0_Sweep/테스트 수집.md` 생성, 수집함 2건 |
| C2 | `미분류`를 Task(project = P-정상)로 분류 | `4_Transform/미분류.md`, `type: task`, `status: next`, `project: "[[P-정상]]"`, Sweep 0건 |
| C3 | P-멈춤 허브에서 Task 생성 | project 자동 지정, stalled = false |
| C4 | 완료 조건을 비운 채 새 프로젝트 | 거부, 컨테이너가 생기지 않음 |
| C5 | `고립된 주장`에서 sources 지정 | `sources: ["[[S-테스트]]"]` |
| C6 | 이유를 비운 채 연결 추가 | 삽입되지 않음 |
| C7 | `고립된 주장`을 evergreen으로 승격 | 거부, 생각 섹션과 연결 2개 부족이 표시됨 |
| C7 | `연결된 주장`을 evergreen으로 승격 | 통과 |
| C8 | 세션 시작 | `3_Narrate/N-오늘`에 `복습 대상` 칸 생성 |
| C8 | `복습 대상`을 pass로 채점 | box 3, last_reviewed 오늘, last_result pass, 인출 기록 한 줄, next_review = 오늘 + 7일 |
| C9 | P-정상 종료 | `1_Arrange/Archive/Projects/P-정상/`, `R-종료-정상` 생성, Task의 project 링크 유지 |
| C10 | 스냅샷 개수 | 위 표와 일치 |
| C11 | S-테스트의 `+ Zettel` | `sources: ["[[S-테스트]]"]`, `status: seed` |
| C11 | M-테스트의 `+ Zettel` | M-테스트의 구조 섹션에 링크 추가 |
| C11 | P-정상 블록에 허용되지 않은 유형 추가(`types: map`) | 오류 문구 렌더링 |

### C12~C20

| 명령 | 테스트 | 기대 |
| --- | --- | --- |
| C12 | 수집함 처리 모드 실행 → `미분류`를 건너뛰기 | 종료 요약에 건너뜀 1건, 수집함 잔량 1건 |
| C12 | C1로 두 건 더 넣고 실행 → 하나는 2분 규칙, 하나는 삭제, 하나는 건너뛰기 | `4_Transform`에 `status: done`, `completed` 오늘인 Task 1건. 잔량 = 건너뛴 수 |
| C13 | `S-테스트`의 "추출할 생각" 체크리스트 항목에 커서를 두고 실행 | seed Zettel 생성, `sources: ["[[S-테스트]]"]`, 원래 항목이 `- [x] [[새 Zettel]]`로 바뀜, 생각 섹션 비어 있음 |
| C13 | Source가 아닌 노트에서 실행 | 명령 팔레트에 뜨지 않음 |
| C14 | P-정상에 `W-초안`을 만들고 문단을 골라 Zettel로 승격 | 고른 문단이 새 Zettel의 생각 섹션으로 **이동**, 원래 자리에 `[[새 Zettel]]`만 남음 |
| C14 | 같은 방식으로 Source로 승격 | 핵심 내용 섹션으로 이동, `S-` 접두사가 붙음 |
| C15 | 규칙 검사 실행 | 위 9건이 규칙별로 모두 나옴 |
| C15 | `접두사 없는 자료`의 빠른 수정 클릭 → 다시 검사 | 해당 건이 사라지고 8건 |
| C15 | 설정에서 "이동·이름 변경 시 검사"를 켜고 Task를 0_Sweep으로 드래그 | 즉시 알림 |
| C16 | 패널 열기 | 개수가 C10 스냅샷과 일치. 행을 누르면 목록이 펼쳐짐 |
| C16 | 아무 Task의 status를 waiting으로 바꾸기 | 잠시 뒤 "대기 중"이 2로 바뀜 |
| C17 | 설정을 켜고 Obsidian 재시작 | 활성 탭이 Home |
| C18 | `O-결과`에서 허브 열기 | `P-정상`이 열림 |
| C18 | `P-이름 불일치` 폴더 우클릭 → 허브 열기 | 허브가 없다고 알리고 생성 제안 |
| C18 | 파일 탐색기 | `P-정상.md`, `P-멈춤.md`가 ◆ 표시와 굵은 글씨 |
| C19 | 마이그레이션 실행 | 미리보기에 나온 노트 수와 실제 변경 수가 같음. 본문 변화 없음 |
| C19 | 곧바로 다시 실행 | 변경 0건 (멱등) |
| C20 | 리포트 내보내기 | `9_System/reports/오늘.json`. `totals.checks`가 C10·C16과 일치, `totals.violationTotal` = 9 |
| C20 | C10 실행 | 같은 리포트 파일이 함께 저장됨 |

## 되돌리기

테스트로 파일이 바뀌면 저장소 루트에서 되돌립니다.

```
git checkout -- tests/fixture-vault
git clean -fd tests/fixture-vault
```
