# CLAUDE.md

Hand Drip Calculator — 핸드드립 레시피 계산기. 토큰 시스템은 **`docs/design-tokens.md`** 참조. 이 문서는 작업 시 어기면 안 되는 규약만 기록.

## Stack

- **Runtime / PM**: Bun
- **Build**: Vite 6 + React 19 + TypeScript (strict, `noUncheckedIndexedAccess` on)
- **Styling**: Tailwind 3 + CSS variables (token system: `docs/design-tokens.md`)
- **Test**: Vitest 2 + jsdom + @testing-library/react

## Commands

```bash
bun install          # 의존성 설치
bun run dev          # 개발 서버 (Vite)
bun run build        # 타입체크 + 프로덕션 빌드
bun run typecheck    # 타입체크만
bun test             # Vitest watch
bun run test:run     # Vitest 1회 실행 (CI용)
```

설정 파일: `vite.config.ts` (앱/빌드), `vitest.config.ts` (테스트, 분리된 이유: vitest 2.x 타입 충돌 회피), `tailwind.config.ts`, `tsconfig.{json,app.json,node.json}`.

## Core Principles (불변)

1. **Domain / UI 완전 분리**
   - `src/domain/**`에서 React, DOM, localStorage 등 플랫폼 의존성 import 금지.
   - 순수 함수만. 부작용은 features 레이어에서.

2. **Branded types 강제**
   - `Grams`, `Celsius`, `Seconds`, `Ratio` 값은 반드시 `domain/units.ts`의 `g/c/s/ratio` 생성자로 생성.
   - `as Grams` 같은 직접 캐스팅 금지 (생성자 내부 제외).
   - 타입이 섞여야 할 때는 변환 함수를 도메인에 추가.

3. **Plugin registry 구조 유지**
   - 새 브루잉 메서드 추가 = `src/domain/methods/*.ts` 파일 + `BrewMethodId` union 확장 + registry 엔트리. **UI 수정이 필요하면 구조가 깨진 것**.

4. **Design token 단일 출처**
   - 컴포넌트 내 하드코딩된 색/스페이싱/폰트/반경/그림자 금지.
   - 모든 스타일 값은 `src/ui/tokens.*`의 CSS 변수를 통해서만 참조.
   - UI 리디자인 = 토큰 값만 수정하고 컴포넌트는 건드리지 않는 수준이 목표.

## Testing

- **Vitest**. 도메인 레이어 위주.
- **필수**: 메서드당 1 스냅샷 + `src/domain/methods/invariants.test.ts`의 공유 invariant 스위프.
  - 스냅샷은 각 메서드의 리서치 기본 케이스(권장 coffee/roast/balanced taste)로 고정.
  - 스위프가 `totalWater === sum(pourAmount)`, `cumulativeWater` 누적, `pours[0].atSec === 0`을 모든 메서드에 대해 커버.
- **선택**: 메서드별 엣지 케이스(5g/50g, taste 극단)는 해당 메서드 compute에 특수 분기가 있을 때만 추가.
- 기존 Kasuya/Hoffmann 테스트에 포함된 풍부한 invariants는 유지 (리팩토링 시 추가 safety net).

## 백로그

아직 만들지 않은 기능들. 새 기능 제안이 이 리스트와 겹치면 멈추고 확인:

- 실시간 타이머 / 브루잉 가이드
- Approach B (파라미터 직접 조절)
- 회원가입, 프리셋, 공유/대결, 원두 라이브러리, 브루잉 노트
- 단위 토글 (g/oz, °C/°F)

## Conventions

- Path alias: `@/domain/...`, `@/features/...`, `@/ui/...`.
- 타입 우선: 구현 전에 타입 시그니처부터 컴파일 통과시키고 본문 채우기.
- 테스트 파일: 대상과 같은 디렉토리에 `*.test.ts`.
- 커밋 메시지: 영어/한국어 모두 가능. 한 줄 요약 + 필요 시 본문.
- PR 단위: 한 단계가 끝나면 한 PR 권장.
