---
type: room
aliases:
  - A · Arrange
cssclasses:
  - sf-room
---
# A · Arrange
<span class="sf-sub">판단·정리 — 행동인가 지식인가, 어디에 쓰이는가</span>

> [!sf-cols]
> > [!sf-q] 행동인가 지식인가? 어디에 쓰이는가?
> > 0_Sweep의 노트마다 보낼 곳을 정하고, `SF 보내기`로 해당 폴더에 옮깁니다.
> > <span class="sf-cap">GTD 명료화·정리 · PARA</span>
>
> > [!sf-evidence] 완료 증거
> > 0_Sweep에서 사라지고, 옮긴 폴더에서 type과 status가 정해졌다

![[Inbox.base#분류]]

> [!sf-note]- 보낼 곳 정하기
> | 이런 것이라면 | 보낼 곳 | 옮긴 뒤 채울 것 |
> |---|---|---|
> | 한 번의 행동으로 끝난다 | Tasks | status, project 또는 area, 세부 단계면 parent |
> | 여러 단계가 필요한 결과다 | Projects | status, done_criteria, area, parent, 첫 다음 행동 |
> | 끝이 없는 책임이다 | Areas | status, standard, review_cycle |
> | 나중에 참고할 자료다 | Resources | status, kind, author, project 또는 area |
> | 내 말로 남길 생각이다 | Knowledge | maturity, source |
> | 이미 만든 결과물이다 | Outputs | kind, status, project |
> | 필요 없거나 2분 안에 끝냈다 | 삭제 | — |
>
> 하나에서 여러 개가 나오면 주된 곳으로 옮긴 뒤, 나머지는 그 노트에서 `SF 새 항목`으로 만듭니다. 예: 프로젝트에서 첫 Task를, 자료에서 Zettel을 만듭니다.

> [!sf-note]- 옮기는 방법
> 1. 분류 표에서 dispatch를 적거나, 노트를 열고 바로 `SF 보내기`를 실행합니다. dispatch가 있으면 묻지 않고 그 값으로 옮깁니다.
> 2. 이름, link, 본문은 그대로 남습니다. 대상 유형의 템플릿 속성과 섹션이 붙고 폴더가 바뀌며, dispatch는 지워집니다. created는 수집한 날로 남습니다.
> 3. 옮긴 뒤 채울 것을 입력합니다.
> 4. 명령 없이 하려면 코어 템플릿으로 속성을 넣고, 파일 탐색기에서 대상 폴더로 끌어다 놓습니다.
> 5. 분류 표가 비면 Arrange가 끝난 것입니다.

## PARA

> [!sf-panel]+ Projects
> ![[Projects.base#전체]]

> [!sf-panel]- Areas
> ![[Areas.base#전체]]

> [!sf-panel]- Resources
> ![[Resources.base#처리 단계]]

> [!sf-note]- Archive
> 보관은 파일을 옮기지 않고 `archived: true`로 합니다. 각 Base의 보관 보기가 PARA의 Archive입니다. 링크가 깨지지 않고, 되살릴 때도 속성만 끄면 됩니다.
