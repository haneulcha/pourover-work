---
title: TDS(총용존고형물) — 농도
slug: tds
category: theory
tags: [measurement, strength, refractometer, golden-cup]
status: contested
last_verified: 2026-06-21
review_after: 2026-12-21
sources:
  - title: "An equilibrium desorption model... (Cameron et al., Scientific Reports)"
    url: https://pmc.ncbi.nlm.nih.gov/articles/PMC7994670/
    kind: peer-reviewed
    date: 2021
    stance: supports
  - title: "How to Measure Extraction of Coffee? — Barista Institute"
    url: https://www.baristainstitute.com/blog/jori-korhonen/january-2019/how-measure-extraction-coffee
    kind: authority
    stance: supports
  - title: "TDS and Extraction Percentage — Rumble Coffee"
    url: https://www.rumblecoffee.com.au/blogs/news/tds-and-extraction-percentage
    kind: practitioner
    stance: disputes
  - title: "Towards a New Brewing Chart — SCA"
    url: https://sca.coffee/sca-news/25/issue-13/towards-a-new-brewing-chart
    kind: authority
    stance: mixed
related: ["[[extraction-yield]]", "[[brew-ratio]]", "[[april]]", "[[immersion]]", "[[water-chemistry]]", "[[water-hardness]]"]
---

## 핵심

TDS(Total Dissolved Solids)는 음료에 녹아 있는 커피 고형물의 농도(%)다. 굴절계(refractometer)로 측정하며 커피의 "농도/strength"를 나타낸다.

## TDS ≠ 추출 수율

TDS(농도)와 [[extraction-yield]](EY)는 **다른 축**이다 — TDS는 "음료가 얼마나 진한가", EY는 "원두에서 얼마나 빠져나왔나". (Cameron 2021: 평형에서 EY는 brew ratio와 무관 ~21%, TDS는 ratio에 반비례.)

## 계산

`EY% = 음료 질량 × TDS / 도징`. **여기서 "음료 질량"은 투입한 물이 아니라 최종 추출된 액체 무게다**(분쇄물이 물을 머금으므로). 정밀형: `EY = TDS/(1−TDS) × (물/원두)`.

## 쟁점: 무엇이 TDS를 결정하는가

- **입장 A** — [[brew-ratio]]가 TDS를 주로 결정한다.
- **입장 B** — TDS = EY × 도징 / 음료질량이므로 **ratio와 EY에 공동 의존**. 같은 ratio라도 [[grind-size]]·시간으로 EY가 변하면 TDS가 변한다(Rumble Coffee).
- **현재 합의**: [[immersion]] 평형에서는 brew ratio가 *지배적* 변수(Cameron 2021 peer-reviewed). 일반 드립에서는 "ratio가 주로 결정"이 아니라 "ratio와 EY의 곱"이 정확.

## 기준 (신선도 주의)

SCA 필터 골든컵 TDS는 1.15~1.35%. 단 이는 1950년대 연구 기반이고 SCA가 차트를 개정 중이며(Guinard 2023), "보편적 이상치"로 제시하면 contested가 된다 → "SCA가 정한 기준값"으로 한정해 읽을 것.
