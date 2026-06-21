---
title: 에이프릴 (April Coffee / Patrik Rolf)
slug: april
category: method
tags: [kalita-wave, flat-bottom, recipe, clarity, light-roast]
status: contested
last_verified: 2026-06-21
review_after: 2026-12-21
sources:
  - title: "Patrik Rolf Instagram — April Brewing-Kit recipe (본인 공개)"
    url: https://www.instagram.com/patrikrolf/p/CG__k-RBOEA/
    kind: authority
    date: 2020
    stance: supports
  - title: "How we Brew Coffee with a V60 — April Coffee Roasters (공식)"
    url: https://www.aprilcoffeeroasters.com/blogs/news/how-to-brew-coffee-with-a-v60
    kind: authority
    stance: mixed
  - title: "FILTER — April Coffee Roastery (공식, 1:17)"
    url: http://www.aprilcoffeeroastery.com/filter
    kind: authority
    stance: disputes
  - title: "The April Brewer: A Pour Over Guide — Project Barista"
    url: https://projectbarista.com/april-brewer/
    kind: practitioner
    stance: supports
related: ["[[kalita-wave]]", "[[brew-ratio]]", "[[tds]]"]
code: packages/domain/src/methods/april.ts
---

## 핵심

덴마크 April Coffee Roasters(Patrik Rolf)의 푸어오버는 평저형([[kalita-wave]] 또는 자사 April Brewer)에서 부드럽고 선명한 풍미(clarity)를 추구하며, 성분을 쥐어짜지 않는 방향을 지향한다. 스칸디나비안 약배전(light roast)의 밝은 산미·clarity 최적화 — 이 지향은 established.

## 절차 (Patrik 본인 공개 레시피)

본인 IG 기준: **13g : 200g, 92℃, 2 푸어** —
- 0:00 — 100g (30g 서클 → 70g 센터)
- 0:32 — 100g (30g 서클 → 70g 센터)
- 총 2:40~3:00, target [[tds]] 1.27%.

> **코드/변형 주의**: 앱 코드 `packages/domain/src/methods/april.ts`는 **4 푸어**(균등 분할) 모델을 쓴다. 이는 Patrik 본인의 2 푸어 레시피가 아니라 third-party 적응형(thegrumpyolive 70-100-50-30, Klatch 등)에 가깝다. 파라미터 정밀화 시 본인 레시피(2푸어)를 기준으로 재검토할 것.

## 쟁점: 비율

- **입장 A — 1:15.4** (Patrik 본인 IG의 한 레시피, 13g:200g).
- **입장 B — 1:15~1:17** (April 공식: V60 가이드 1:15, Filter 가이드 1:17).
- **현재 합의**: 단일 고정값 없음. April은 "원두마다 비율을 조정하라"고 명시. 1:15.4는 일반 기본값이 아니라 한 영상 레시피의 특정 수치다. (앱 코드 기본값도 1:15.4.)

## 쟁점: 온도

- **입장 A — ~92℃** (April Brewer 전용 레시피/Patrik IG).
- **입장 B — 96~99℃** (April 공식 범용 Filter 권장).
- **현재 합의**: 브루어 전용 레시피는 92℃ 계열, 범용 필터 권장은 더 높음. 단일값 단정 불가.

## 출처 노트

분쇄도는 1차 출처가 일관되게 **coarse**(salt flakes / Comandante ~30~34 clicks) — 초안의 "medium-fine"은 출처와 어긋나 제거. Patrik은 시기별로 여러 버전을 공개해 "단일 정설 레시피" 고정이 위험하므로 출처 게시 연도를 명기하고 +6개월 재검증. 초안의 "4푸어 50g 30초"는 본인 레시피와 충돌해 반려·교체됨.
