---
title: 물 온도 (Water Temperature)
slug: water-temperature
category: theory
tags: [temperature, extraction, rate, brewing-variable]
status: contested
last_verified: 2026-06-25
review_after: 2026-12-25
code: "packages/domain/src/units — Celsius branded type (c())"
sources:
  - title: "Batali, Guinard & Ristenpart — Brew temperature has little impact on sensory profile of drip coffee (Sci. Reports, 2020; Author Correction 2021)"
    url: https://pmc.ncbi.nlm.nih.gov/articles/PMC7536440/
    kind: peer-reviewed
    date: 2020
    stance: mixed
  - title: "Cameron/Ristenpart et al. — Equilibrium desorption model (full immersion; EY 80–99℃ 비의존)"
    url: https://pmc.ncbi.nlm.nih.gov/articles/PMC7994670/
    kind: peer-reviewed
    date: 2021
    stance: supports
  - title: "SCA — Coffee Brewing Standard (전 과정 92–96℃ 유지)"
    url: https://sca.coffee/research/coffee-standards
    kind: authority
    stance: supports
  - title: "Water Temperature for Coffee — Barista Hustle"
    url: https://www.baristahustle.com/blog/coffee-water-temperature/
    kind: practitioner
    stance: supports
related: ["[[extraction-yield]]", "[[grind-size]]", "[[immersion]]", "[[roast-level]]", "[[degassing]]", "[[brew-ratio]]"]
---

## 핵심

물 온도는 [[grind-size]]·[[brew-ratio]]와 함께 추출의 핵심 변수다. **온도는 주로 추출 *속도(rate)*를 바꾼다** — 뜨거울수록 가용 성분이 빨리 녹아 같은 시간에 [[extraction-yield]]가 높아지고, 차가울수록 느리다. (계산기의 `Celsius` 단위가 다루는 값.)

## 권장 범위

**SCA 추출 규격**은 전 과정 **92–96℃ 유지**(1분 내 92℃ 도달)에 가깝다. 더 넓게 통용되는 **90–96℃(195–205℉)**는 NCA·일반 가이드의 환산 범위다. 끓인 물을 잠깐 식히면 이 범위에 든다. 단 이는 "권장값"이지 유일한 정답은 아니다(아래 쟁점).

## 로스팅 정도와의 상호작용

- **라이트 로스트** — 밀도가 높고 덜 가용성이라 추출을 끌어내려 **더 높은 온도**(범위 상단)를 흔히 쓴다.
- **다크 로스트** — 가용성이 높아 쉽게 과추출·쓴맛으로 가므로 **더 낮은 온도**가 권장된다. → [[roast-level]]

## 슬러리 온도 ≠ 주전자 온도

실제 추출을 좌우하는 건 주전자 물 온도가 아니라 **커피와 닿는 슬러리(slurry) 온도**다. 붓는 동안·드리퍼/원두/공기와 접촉하며 온도가 떨어지므로, 둘은 수 ℃ 차이가 난다.

## 침지·블룸과의 관계

[[immersion]](완전 침지)에서는 평형 EY가 **80–99℃ 범위에서 온도에 거의 무관**(≈21%)하다는 게 확립돼 있다(Cameron 2021) — 즉 침지에서 온도는 최종값보다 **평형 도달 속도**에 작용한다. (이는 침지 한정 발견이고, 일반 추출에서 "같은 시간이면 뜨거울수록 EY↑"와는 별개다.) 또 뜨거운 물일수록 신선 원두의 CO₂가 빠르게 방출돼 [[degassing]]·블룸이 활발해진다.

## 쟁점: 온도가 맛에 얼마나 독립적으로 영향을 주나

- **입장 A (큰 변수)** — 온도가 산미·단맛·쓴맛 균형을 직접 좌우한다는 실무 통념(낮으면 산미·밝음, 높으면 바디·쓴맛).
- **입장 B (추출을 통한 간접 효과)** — UC Davis(Batali et al. 2020)는 **추출 수율(EY)과 농도(TDS)를 맞추면** 87–93℃ 범위에서 브루 온도의 *독립적* 관능 영향이 작았다고 보고. 즉 온도의 효과는 대체로 EY/TDS를 바꾸는 *경로*로 나타나며, 온도만 따로 큰 맛 차이를 내는 게 아닐 수 있다.
- **합의**: 온도가 추출 속도·EY를 바꾼다는 건 확립. 단 "EY를 통제하고도 온도 자체가 맛을 크게 바꾼다"는 강한 주장은 미확정. "끓는 물은 커피를 태운다"는 통념도 과장이다 — 100℃로도 정상 추출이 가능하고 '태움(scorch)' 메커니즘은 입증된 바 없다. (단 끓는 물은 *과추출·쓴맛* 위험은 있어 일반적으로 권장되진 않는다.)
