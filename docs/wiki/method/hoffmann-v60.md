---
title: 호프만 얼티밋 V60 (James Hoffmann Ultimate V60)
slug: hoffmann-v60
category: method
tags: [v60, pour-over, light-roast, recipe]
status: contested
last_verified: 2026-06-21
review_after: 2026-12-21
sources:
  - title: "The Ultimate V60 Technique — James Hoffmann (본인 Facebook 게시물)"
    url: https://www.facebook.com/jameshoffmanncoffee/posts/the-ultimate-v60-techniquethis-is-my-recommended-technique-for-making-coffee-wit/1172991631132747/
    kind: authority
    date: 2020
    stance: supports
  - title: "V60 Ambassadors: James Hoffmann — HARIO Europe"
    url: https://www.hario-europe.com/blogs/hario-community/v60-ambassadors-james-hoffmann
    kind: authority
    stance: supports
  - title: "James Hoffmann's Ultimate V60 Recipe — Honest Coffee Guide"
    url: https://honestcoffeeguide.com/brew-recipes/james-hoffmann-v60/
    kind: practitioner
    stance: supports
  - title: "James Hoffman Ultimate V60 Technique (영상 transcript) — HackMD"
    url: https://hackmd.io/@-FmOJnmnS_ymDzHvWu-yEA/HyR5g-9WL
    kind: practitioner
    stance: supports
related: ["[[v60-dripper]]", "[[bloom]]", "[[swirl]]", "[[brew-ratio]]", "[[kasuya-4-6]]"]
code: packages/domain/src/methods/hoffmann-v60.ts
---

## 핵심

James Hoffmann의 "Ultimate V60"은 추출 일관성과 균형 잡힌 단맛을 목표로 한 [[v60-dripper]] 레시피로, 특히 약배전 단일 산지에 최적화돼 있다. 기본 레시피는 **원두 30g : 물 500g = 1:16.67**([[brew-ratio]]).

## 절차 (검증된 타임라인)

| 시점 | 동작 | 누적 물 |
| --- | --- | --- |
| 0:00 | [[bloom]] — 원두 2배(약 60g)로 붓고 [[swirl]]로 전부 적심 | 60g |
| 0:45 | 첫 본붓기 **시작** | → |
| 1:15 | 300g(전체의 60%)에 도달 | 300g |
| 1:15~1:45 | 둘째 붓기로 500g까지 | 500g |
| ~3:30 | 추출(drawdown) 완료 목표 | — |

마지막에 한 번 시계방향, 한 번 반시계방향으로 가볍게 젓고 [[swirl]]해 커피 베드를 평평하게 안착시킨다 → 균일 추출. (흔히 "Rao spin"이라 부르는 마무리 스월에 해당하나, Hoffmann 본인은 그 용어를 쓰지 않는다.)

> **코드 모델 주의**: 앱의 `packages/domain/src/methods/hoffmann-v60.ts`는 붓기 *시작* 시점(0s / 45s / 75s)에 누적목표(60 / 300 / 500g)를 매핑하는 **단순화 모델**이다. 실제 기법은 300g 도달이 1:15, 500g 도달이 1:45로, 코드의 75s(1:15)=500g과 차이가 있다. 타이밍 정밀화 시 이 노트를 기준으로 재검토할 것.

## 쟁점: 물 온도

- **입장 A — 갓 끓인 물(≈100℃), 약배전일수록 뜨겁게** (Hoffmann 본인/HARIO): 숫자 고정보다 "off the boil, the hotter the better"를 권장.
- **입장 B — 95~97℃** (timer.coffee 등 secondary 가이드): 더 낮은 고정값 제시.
- **현재 합의**: Hoffmann 본인은 약배전에 사실상 갓 끓인 물을 권장. 코드는 약배전 96℃를 쓰는데, 이는 본인 의도(상한 100℃)보다 보수적이다. 하한을 단정하지 말 것.

## 쟁점: 분쇄도

- **입장 A — medium** (Hoffmann 본인: Baratza Encore 14번).
- **입장 B — medium-fine** (다수 secondary 가이드).
- **현재 합의**: 기준 그라인더를 명시해야 의미가 있다(예: Encore ~14 = medium). "식탁 소금 정도" 비유는 1차/권위 출처에서 확인되지 않아 제외. 코드 기본값은 medium-fine.

## 출처 노트

1차 출처는 Hoffmann 본인 게시물·영상. 초안의 "0:45에 300g 도달"은 **사실 오류로 반려**되어 검증된 타임라인(1:15에 300g)으로 교정했다. 골격(목표·블룸·마무리 스월·3:30)은 established이나, 온도·분쇄 파라미터가 출처 충돌로 contested.
