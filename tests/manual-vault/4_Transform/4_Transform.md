---
type: room
aliases:
  - T · Transform
cssclasses:
  - sf-room
---
# T · Transform
<span class="sf-sub">실행·표현 — 다음 행동을 실행하고, 지식을 조합해 결과물을 만든다</span>

> [!sf-cols]
> > [!sf-q] 이것으로 무엇을 만들었는가?
> > Task는 동사로 끝나는 행동 하나입니다. 결과물에는 사용한 지식과 자료를 연결합니다.
> > <span class="sf-cap">GTD 실행 · CODE Express</span>
>
> > [!sf-evidence] 완료 증거
> > Task done · Output의 uses 기록

![[Tasks.base#다음 행동]]

> [!sf-panel]- 오늘
> ![[Tasks.base#오늘]]

> [!sf-panel]- someday
> ![[Tasks.base#언젠가]]

## Outputs
![[Outputs.base#전체]]

> [!sf-note]- Task 규칙
> - 제목은 동사로 끝나는 행동 하나입니다. 예: 후보 기술 A 평가 조건 정리하기
> - status는 next(바로 할 수 있음), in progress(손을 댄 것), waiting(넘긴 일, waiting_on 기록), someday, done, dropped(하지 않기로 한 것)입니다. dropped는 지우지 않고 남겨 두면 나중에 판단 근거가 됩니다.
> - scheduled는 시작할 수 있는 날, due는 지켜야 하는 날입니다.
> - 다음 행동을 정할 수 없으면, 그것을 정하기 위해 확인할 질문을 Task로 둡니다.

> [!sf-note]- 하위 Task
> - 한자리에서 끝나는 세부 단계는 하위 Task로 나눕니다. Task에서 `SF 새 항목` → 하위 Task로 만들면 parent가 기록됩니다.
> - 하위 Task에는 project를 달지 않습니다. 프로젝트의 열린 Task와 진행률은 상위 Task 기준으로 계산됩니다.
> - 하위 진행에 끝난 수/전체가 나오고, 모두 끝나면 ✓가 붙습니다. 상위 Task의 status는 직접 done으로 바꿉니다.
> - 여러 날에 걸치거나 결과물이 따로 나오면 Project로 올립니다.

> [!sf-note]- Output 규칙
> - 보고서, 코드, 발표, 결정처럼 프로젝트가 만들어 낸 것입니다. project를 반드시 연결합니다.
> - status는 draft → in review → done → shipped입니다. shipped는 외부에 전달하거나 공개한 것입니다.
> - done이나 shipped로 바꿀 때 uses에 사용한 지식과 자료를 연결합니다. 비어 있으면 Weekly 점검에 나타납니다.
