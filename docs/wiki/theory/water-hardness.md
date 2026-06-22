---
title: 물 경도 — GH(경도) vs KH(알칼리도)
slug: water-hardness
category: theory
tags: [water, hardness, gh, kh, alkalinity, magnesium, calcium]
status: contested
last_verified: 2026-06-22
review_after: 2026-12-22
sources:
  - title: "Hendon, Colonna-Dashwood et al. — The Role of Dissolved Cations in Coffee Extraction (J. Agric. Food Chem., 2014) — in silico/DFT"
    url: https://pubs.acs.org/doi/10.1021/jf501687c
    kind: peer-reviewed
    date: 2014
    stance: supports
  - title: "Influence of divalent cations on the extraction of organic acids in coffee (Heliyon, GC-MS/NMR)"
    url: https://pmc.ncbi.nlm.nih.gov/articles/PMC10907646/
    kind: peer-reviewed
    date: 2024
    stance: disputes
  - title: "Water Hardness — Barista Hustle"
    url: https://www.baristahustle.com/water-hardness/
    kind: practitioner
    stance: supports
  - title: "Demystifying Water for Coffee — Scott Rao"
    url: https://www.scottrao.com/blog/2023/6/4/demystifying-water-for-coffee
    kind: practitioner
    stance: supports
  - title: "Water and Coffee Acidity — SCA 25 Magazine, Issue 9"
    url: https://sca.coffee/sca-news/25/issue-9/english/water-and-coffee-acidity-how-to-adapt-your-water-for-different-extraction-methods-25-magazine-issue-9
    kind: authority
    stance: mixed
related: ["[[water-chemistry]]", "[[acidity]]", "[[extraction-yield]]", "[[tds]]"]
---

## 핵심 (확립된 정의)

물 "경도"는 사실 **두 개의 독립된 축**이고, 커피에서 이 둘을 구분하는 것이 핵심이다.

- **GH (General Hardness, 일반경도)** = Ca²⁺ + Mg²⁺ (2가 양이온의 총량).
- **KH (Carbonate Hardness, 탄산경도 ≈ 알칼리도)** = HCO₃⁻(중탄산염). **완충제** — 커피의 산을 중화한다. KH가 높으면 [[acidity]]가 눌려 밋밋/둔탁해지고, 낮으면 산미·밝기가 살지만 너무 낮으면 시고 거칠 수 있다(SCA 25 Magazine, Scott Rao). 이 완충 인과는 출처들이 수렴한다.

이 둘은 별개 축이라 따로 조절할 수 있다. 단위는 ppm(mg/L as CaCO₃)·°dH·grains 등으로 표기되며 환산 상수는 **1 °dH ≈ 17.8 ppm**, **1 grain(gpg) ≈ 17.1 ppm** as CaCO₃ — 단위 혼동으로 인한 비교 오류가 잦다.

## 쟁점: 양이온(GH)이 추출에 어떤 영향을 주나

GH가 "추출량을 끌어올린다"는 흔한 설명은 **확립된 사실이 아니다** — peer-reviewed 연구끼리 충돌한다.

- **입장 A (추출 촉진)** — Hendon et al. 2014는 Mg²⁺·Ca²⁺ 양이온이 커피의 향미 화합물에 배위 결합해 추출을 돕고, Mg²⁺가 Ca²⁺보다 추출력이 *약간* 높다고 보고. **단 이는 in silico(DFT 계산) 연구로, 실제 커피를 추출하거나 맛본 것이 아니다.**
- **입장 B (추출 억제·지각 효과)** — 후속 실측 연구(Heliyon 2024, GC-MS/NMR)는 정반대다: 1000 ppm MgCl₂/CaCl₂가 citric·malic·quinic 등 유기산 추출을 **오히려 40–70% 감소**시켰고, 가장 높은 산 농도는 미네랄 없는 대조군이었다. 추출 전/후 첨가 결과가 비슷해 양이온은 추출 자체보다 **추출 후 착물형성/지각**에 작용한다고 제안.
- **SCA 정리** — 합리적 범위(20–250 ppm CaCO₃) 내에서 total hardness가 추출 효율에 주는 영향은 **미미**하다고 본다.
- **합의**: GH가 맛을 바꾼다는 데는 동의하나, 그것이 "추출량 증가" 때문인지 "지각 변화" 때문인지는 미해결.

## 쟁점: 이상적인 물 조성은 무엇인가

- **마그네슘 우위설은 과대해석** — "마그네슘 위주 물이 더 좋다"는 통념은 Hendon의 *약한* DFT 결과에서 나왔지만, Hendon은 관능 우열을 주장하지 않았고 위 실측 연구는 Mg가 산 추출을 오히려 줄였다. anecdotal/contested 경계.
- **목표 수치 불일치** — SCA(GH 50–175, 이상 50–80; 알칼리도 40–70 ppm), Scott Rao(알칼리도 ~30–40 ppm), Barista Hustle·Third Wave Water 권장치가 서로 다르다. **단일 정답 물은 없다.** 출처들이 공통으로 동의하는 건 "알칼리도(KH)가 가장 영향이 크다" 정도.

## 실무

RO/증류수에 미네랄을 더해 GH·KH를 따로 맞추는 DIY 레시피가 스페셜티에서 흔하다 — 농축액 두 병으로 분리: **경도용**(Barista Hustle 표준은 MgSO₄/Epsom 단독; CaCl₂를 쓰는 변형 레시피도 있음)과 **완충용**(NaHCO₃). 스케일(석회) 방지를 위해 에스프레소 머신은 KH(알칼리도) 관리가 특히 중요.
