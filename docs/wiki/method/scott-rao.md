---
title: 스콧 라오(Scott Rao) 메서드
slug: scott-rao
category: method
tags: [v60, pour-over, prewetting, uniformity]
status: contested
last_verified: 2026-06-21
review_after: 2026-12-21
sources:
  - title: "V60 Video — Scott Rao (본인)"
    url: https://www.scottrao.com/blog/2017/9/14/v60-video
    kind: authority
    stance: supports
  - title: "V60 Recipe & Interview with Scott Rao — Hario UK"
    url: https://www.hario.co.uk/blogs/hario-ambassadors/hario-v60-recipe-interview-with-hario-ambassador-scott-rao
    kind: authority
    stance: supports
  - title: "Extraction Myths (twin myths of easier-to-extract and overextraction) — Scott Rao"
    url: https://www.scottrao.com/blog/extraction-myths
    kind: authority
    stance: supports
  - title: "The Rao Spin (명칭 기원) — Barista Hustle"
    url: https://www.baristahustle.com/the-rao-spin/
    kind: practitioner
    stance: disputes
related: ["[[bloom]]", "[[swirl]]", "[[hoffmann-v60]]"]
code: packages/domain/src/methods/scott-rao.ts
---

## 핵심

스콧 라오(Scott Rao)는 커피 컨설턴트이자 여러 기술서의 저자로, 추출의 **균일성과 재현성**을 강조한다. V60에서 뜸 들이기 시 강한 교반([[swirl]])과 'Bird's Nest'(원두 침대에 구멍 형성)를 쓴다.

## 절차 (단일 푸어 단정 주의)

라오는 **one-pour(카페 서비스용 선호)와 two-pour를 모두 제시**한다 — "단일 연속 푸어가 메서드의 정의"는 아니다(초안의 이 단정은 반려됨). Hario 인터뷰 레시피는 60→200→330의 다단계 푸어다.

코드 `packages/domain/src/methods/scott-rao.ts`는 블룸(2.5×) + 단일 메인 푸어, 1:16.5로 모델링.

## 쟁점: 파라미터

- 도즈 20~22g은 일관(established).
- 물량/비율/온도는 출처 충돌: **330g·1:16.5·97℃**(Hario UK) vs **340g·1:17·"just off boil"**(coffeecalculator 등). 라오 1차 자료는 정밀 온도/비율을 못박지 않는다. medium-fine은 2차 출처에만 등장.

## 쟁점: 'Rao spin' 명칭

라오 본인이 발명을 부인했다. 명명 기원도 갈린다(이탈리아 챔피언 Galtieri가 명명 / Hoffmann 원조설 / Bailey 설). 용어는 통칭일 뿐 — [[swirl]] 참조.

## 철학

균일 추출·고수율 추구. "과다추출(over-extraction)은 (산업 규모 외에는) 거의 존재하지 않는다"는 입장 — 28~29% [[extraction-yield]]도 비떫게 추출 가능하다고 주장(본인 글 "twin myths").
