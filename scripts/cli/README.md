# CLI 실행 가능한 스크립트 구조
# SEASTAR Cable Manager - 기능별 터미널 테스트

scripts/
└── cli/
    ├── solver.ts      # 트레이 적층 로직 테스트
    ├── routing.ts     # 라우팅 로직 테스트
    └── analytics.ts   # KPI 분석 로직 테스트

## 실행 방법

### 1. 솔버 테스트 (Tray Stacking)
```bash
npx tsx scripts/cli/solver.ts
```

### 2. 라우팅 테스트 (Dijkstra + Waypoints)
```bash
npx tsx scripts/cli/routing.ts
```

### 3. 분석 테스트 (KPI Calculation)
```bash
npx tsx scripts/cli/analytics.ts
```

## 전체 테스트 (순차 실행)
```bash
npx tsx scripts/cli/solver.ts && npx tsx scripts/cli/routing.ts && npx tsx scripts/cli/analytics.ts
```
