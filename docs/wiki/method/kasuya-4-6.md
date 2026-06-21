---
title: 카스야 4:6 메서드 (Tetsu Kasuya 4:6 Method)
slug: kasuya-4-6
category: method
tags: [v60, pour-over, recipe, taste-control]
status: contested
last_verified: 2026-06-21
review_after: 2026-12-21
sources:
  - title: "How to Make Coffee Using the 4:6 Brewing Method — Philocoffea (카스야 운영사 공식)"
    url: https://en.philocoffea.com/blogs/blog/coffee-brewing-method
    kind: authority
    stance: supports
  - title: "2016 World Brewers Cup Champion Tetsu Kasuya — Kurasu"
    url: https://kurasu.kyoto/blogs/kurasu-journal/2016-world-brewers-cup-champion-tetsu-kasuya
    kind: practitioner
    stance: supports
  - title: "4:6 Method Decoded for English Brewers — Japanese Coffee Gear"
    url: https://japanesecoffeegear.com/tetsu-kasuya-46-method-decoded-for-english-brewers
    kind: practitioner
    stance: disputes
  - title: "The science behind Kasuya 4:6 method? — Home-Barista (회의론 스레드)"
    url: https://www.home-barista.com/brewing/science-behind-kasuya-4-6-method-t75697.html
    kind: practitioner
    stance: disputes
related: ["[[hoffmann-v60]]", "[[brew-ratio]]", "[[v60-dripper]]", "[[grind-size]]"]
code: packages/domain/src/methods/kasuya-4-6.ts
---

## 핵심

카스야 테츠(Tetsu Kasuya)는 2016 World Brewers Cup 챔피언이다. 4:6 메서드는 전체 물을 **앞 40% / 뒤 60%**로 나누어, 앞 40%로 **맛(단맛↔산미)**을, 뒤 60%로 **농도(strength)**를 분리 제어하는 [[v60-dripper]] 기법이다. 기본 1:15([[brew-ratio]], 예 20g:300g), **medium-coarse~coarse([[grind-size]], 코셔솔트 굵기)** 분쇄, 푸어 간격 45초. [[hoffmann-v60]]이 스월로 균일 추출을 노린다면, 카스야는 굵은 분쇄와 분할 푸어로 맛을 *설계*한다.

## 앞 40% — 맛 조절 (귀속)

카스야는 처음 두 번의 푸어 비율로 맛이 바뀐다고 **설명한다**: 첫 푸어를 더 적게 부으면 단맛이, 더 많게 부으면 산미가 강조된다(예: 40g→80g 단맛 / 80g→40g 산미). 방향 매핑은 여러 독립 출처가 일치한다. 다만 이 효과가 객관적으로 검증됐다는 **통제 실험(블라인드·굴절계)은 부재**하므로, 이는 카스야의 프레임워크/관행으로 기술한다.

## 뒤 60% — 농도 조절

뒤 60%를 **나누는 횟수**로 농도를 조절한다: 여러 번(3회)에 나누면 더 진하고 바디감 있게, 한 번에 부으면 더 가볍고 깔끔하게. 앞 40%의 배분과 뒤 60%의 횟수가 이 메서드의 **조절 변수**다(고정 타임테이블이 아니다).

## 기본 레시피 (표준형)

가장 기본형은 300g을 **60g씩 5번**(앞 40%=2회, 뒤 60%=3회), 45초 간격(0:00 / 0:45 / 1:30 / 2:15 / 3:00)으로 부어 약 3:30에 마친다. 이는 *표준형 중 하나*이며, 첫 푸어 70/50 변형이나 4푸어 변형도 같은 프레임워크의 인스턴스다.

## 쟁점: 다크 로스트 온도

- **입장 A — 83℃** (Philocoffea 등 다수 실무): 배전이 강할수록 저온으로 쓴맛·과추출 억제. (앱 코드 `kasuya-4-6.ts`도 다크 83℃ 사용.)
- **입장 B — 88~90℃** (Japanese Coffee Gear): 다크에도 88~90℃면 충분, 83℃는 과한 하향.
- **현재 합의**: "배전도가 높을수록 온도를 낮춘다"는 방향성은 합의. 다크의 절대값(83 vs 88~90℃)은 출처마다 다름. 코드 기본값: light 94 / medium 88 / dark 83℃.

## 출처 노트

정의·40:60 프레임워크·농도 조절은 Philocoffea(카스야 운영사) 등으로 established. 맛 매핑 방향도 다수 출처 일치하나 인과 효능은 미검증(anecdotal 층위). 영어권 2차 출처가 간격을 30초로 단순화하는 변형이 있어, 1차/Philocoffea 기준 **45초**로 확정. 노트 전체는 다크 온도 충돌로 contested.
