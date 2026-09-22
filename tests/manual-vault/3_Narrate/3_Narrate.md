---
type: room
aliases:
  - N · Narrate
cssclasses:
  - sf-room
---
# N · Narrate
<span class="sf-sub">인출·설명 — 보지 않고 설명한 뒤 근거와 대조한다</span>

> [!sf-cols]
> > [!sf-q] 보지 않고 설명하거나 적용할 수 있는가?
> > `SF 회상 시작`으로 오늘의 회상 노트를 열고, 질문만 보고 답을 씁니다.
> > <span class="sf-cap">Active Recall</span>
>
> > [!sf-evidence] 완료 증거
> > 회상 노트의 답안과 판정 · box · last_reviewed 갱신

![[Knowledge.base#오늘 회상]]

![[Recall.base#기록]]

> [!sf-note]- 회상 절차
> 1. `SF 회상 시작`을 실행합니다. 오늘 회상할 Zettel마다 질문과 빈 답안이 담긴 `N-YYYY-MM-DD` 노트가 열립니다.
> 2. Zettel을 열지 않고 핵심 주장, 근거, 적용 사례 또는 반례를 씁니다.
> 3. 다 쓴 뒤 Zettel을 열어 대조합니다.
> 4. `SF 회상 판정`을 실행해 pass나 fail을 고릅니다. box, last_reviewed, last_result가 갱신되고, 회상 노트의 판정 섹션에 한 줄이 남습니다.

> [!sf-note]- 판정 기준
> - 보지 않고 핵심 주장, 근거, 적용 사례 또는 반례를 모두 썼을 때만 pass입니다.
> - pass면 box가 한 칸 오르고(최대 5), fail이면 1로 돌아갑니다.
> - 질문은 설명, 적용, 비교, 반례형으로 씁니다. 컴파일·테스트·계산·회로 해석처럼 외부에서 검증되는 질문을 우선합니다.
> - 문법이나 API 목록은 회상 대상이 아닙니다.
>
> | Box | 1 | 2 | 3 | 4 | 5 |
> |---|---|---|---|---|---|
> | 다음 복습 | 1일 | 3일 | 7일 | 14일 | 30일 |

> [!sf-note]- 답안을 Zettel에 두지 않는 이유
> Zettel 안에 답이 있으면 다음 회상 때 이전 답이 먼저 보여 인출이 오염됩니다. 답은 회상 노트에만 둡니다.
