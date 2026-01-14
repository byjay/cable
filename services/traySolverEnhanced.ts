import { CableData, PlacedCable, Point, SingleTrayResult, SystemResult, MatrixCell, MARGIN_X, MAX_PILE_WIDTH, PILE_GAP } from '../types';

const LARGE_CABLE_THRESHOLD = 35; // 35mm 이상은 적층 시 주의 (큰 케이블)
const MIN_WIDTH = 100;
const MAX_WIDTH = 1000;
const WIDTH_STEP = 100; // 100mm 단위

const dist = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

const checkCollision = (cables: PlacedCable[], x: number, y: number, r: number): boolean => {
  const EPSILON = 0.05; // 오차 범위를 매우 줄여 정밀하게 판단
  for (const c of cables) {
    const d = dist({ x, y }, { x: c.x, y: c.y });
    const minDist = (c.od / 2) + r - EPSILON;
    if (d < minDist) return true;
  }
  return false;
};

// 케이블이 공중에 뜨지 않도록 지지 여부 확인 (간소화된 물리 엔진)
const isSupported = (placed: PlacedCable[], x: number, y: number, r: number): boolean => {
  if (y <= r + 1.0) return true; // 바닥 (오차 1mm)

  // 아래쪽에 있는 케이블 중 수평 거리가 가깝고, 수직으로 접촉하는 케이블이 있는지 확인
  // 60도 각도 내에 지지하는 케이블이 있어야 함 (안정적 적층)
  for (const c of placed) {
    if (c.y >= y) continue; // 위에 있는건 지지대 아님
    const d = dist({ x, y }, { x: c.x, y: c.y });
    if (d <= (c.od / 2 + r) + 1.0) { // 접촉 (오차 1mm)
      // 수평 거리 체크 (너무 멀면 미끄러짐)
      if (Math.abs(c.x - x) < (c.od / 2 + r) * 0.9) return true;
    }
  }
  return false;
};

const determineLayer = (y: number, r: number, placed: PlacedCable[], x: number): number => {
  if (y <= r + 2.0) return 1;
  // 내 아래 중심이 있는 케이블들의 max layer + 1
  const below = placed.filter(c => Math.abs(c.x - x) < (c.od / 2 + r) && c.y < y);
  if (below.length === 0) return 1; // 이론상 불가능하지만 fallback
  return Math.max(...below.map(c => c.layer)) + 1;
};

// 중력 기반 위치 찾기: Y(높이)를 최소화하는 것을 최우선으로, 그 다음 X(좌측)를 우선으로 함
const findGravityPosition = (
  cable: CableData,
  placed: PlacedCable[],
  xMin: number,
  xMax: number,
  maxHeightLimit: number
): { point: Point, layer: number } | null => {
  const r = cable.od / 2;
  const candidates: Point[] = [];

  // 1. 바닥 후보군 (Slide approach)
  // 좌측 벽부터 우측 벽까지 일정 간격으로 스캔하되, 기존 케이블 옆에 붙이는 방식을 선호
  candidates.push({ x: xMin + r, y: r }); // 맨 왼쪽 바닥

  // 기존 케이블들을 기준으로 후보 생성
  for (const c of placed) {
    // c의 오른쪽 바닥
    candidates.push({ x: c.x + c.od / 2 + r + 0.1, y: r });

    // c의 위쪽 (적층) - 여러 각도 시도
    // 육각형 패킹 각도 및 사이사이 각도 (30, 60, 90, 120, 150 등)
    // 더 촘촘하게 15도 단위로 검사하여 "골짜기"를 찾음
    for (let angle = 15; angle <= 165; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const tx = c.x + Math.cos(rad) * (c.od / 2 + r);
      const ty = c.y + Math.sin(rad) * (c.od / 2 + r);
      candidates.push({ x: tx, y: ty });
    }

    // 두 케이블 사이의 골짜기(Intersection) 계산은 위 각도 스캔으로 근사 가능
  }

  // 후보 필터링 및 정렬
  const validCandidates = candidates.filter(p => {
    if (p.x - r < xMin - 0.5 || p.x + r > xMax + 0.5) return false; // 벽 충돌
    if (p.y + r > maxHeightLimit + 1.0) return false; // *** 높이 제한 엄수 ***
    if (checkCollision(placed, p.x, p.y, r)) return false; // 케이블 충돌
    if (!isSupported(placed, p.x, p.y, r)) return false; // 공중 부양 방지
    return true;
  });

  if (validCandidates.length === 0) return null;

  // 정렬 기준: 
  // 1순위: Y (낮은 곳 우선 - 중력)
  // 2순위: X (왼쪽 우선)
  validCandidates.sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 1.0) return yDiff; // 높이 차이가 1mm 이상이면 낮은거
    return a.x - b.x; // 높이가 비슷하면 왼쪽거
  });

  const best = validCandidates[0];
  const layer = determineLayer(best.y, r, placed, best.x);

  return { point: best, layer };
};

function attemptFit(cables: CableData[], width: number, maxHeight: number): { success: boolean, placed: PlacedCable[] } {
  // 큰 케이블부터 배치하는 것이 패킹 효율이 좋음
  const sorted = [...cables].sort((a, b) => b.od - a.od);
  let placed: PlacedCable[] = [];

  for (const cable of sorted) {
    const res = findGravityPosition(cable, placed, MARGIN_X, width - MARGIN_X, maxHeight);
    if (res) {
      placed.push({ ...cable, x: res.point.x, y: res.point.y, layer: res.layer });
    } else {
      // 하나라도 배치 못하면 실패
      return { success: false, placed };
    }
  }
  return { success: true, placed };
}

// ---- Public Solvers ----

export const solveSingleTier = (
  cables: CableData[],
  tierIndex: number,
  maxHeightLimit: number,
  targetFillRatioPercent: number,
  fixedWidth?: number
): SingleTrayResult => {
  const totalArea = cables.reduce((acc, c) => acc + Math.PI * Math.pow(c.od / 2, 2), 0);
  const totalODSum = cables.reduce((a, c) => a + c.od, 0);

  if (cables.length === 0) {
    return { tierIndex, width: 100, cables: [], success: true, fillRatio: 0, totalODSum: 0, totalCableArea: 0 };
  }

  // 고정 폭이 주어진 경우
  if (fixedWidth) {
    const res = attemptFit(cables, fixedWidth, maxHeightLimit);
    const fill = (totalArea / (fixedWidth * maxHeightLimit)) * 100;
    return {
      tierIndex, width: fixedWidth, cables: res.placed,
      success: res.success, fillRatio: fill, totalODSum, totalCableArea: totalArea
    };
  }

  // 자동 최적화: 100mm 단위로 100 ~ 1000 탐색
  // 조건: 용적률 <= Limit AND 물리적 적재 성공
  for (let w = MIN_WIDTH; w <= MAX_WIDTH; w += WIDTH_STEP) {
    const trayArea = w * maxHeightLimit;
    const fill = (totalArea / trayArea) * 100;

    // 1. 용적률 1차 컷: 이미 용적률 제한을 초과하면 물리적 계산 불필요 (너무 좁음)
    // 단, 아주 근소한 차이(1~2%)는 물리적으로 들어갈 수도 있으므로 관대하게 넘기지 않음.
    // 사용자 요구: "Select the closest value that does not exceed the setting value".
    // 즉, fill > targetFillRatioPercent 이면 이 폭은 탈락.
    if (fill > targetFillRatioPercent) continue;

    // 2. 물리적 적재 시뮬레이션
    const res = attemptFit(cables, w, maxHeightLimit);
    if (res.success) {
      // 성공! 가장 작은 폭부터 돌았으므로 이게 최적값임.
      return {
        tierIndex, width: w, cables: res.placed, success: true,
        fillRatio: fill, totalODSum, totalCableArea: totalArea
      };
    }
  }

  // 모든 폭에서 실패한 경우 (1000mm도 부족하거나 용적률 초과 시)
  // 가장 큰 1000mm 반환하고 실패 처리
  const failRes = attemptFit(cables, MAX_WIDTH, maxHeightLimit);
  return {
    tierIndex, width: MAX_WIDTH, cables: failRes.placed,
    success: failRes.success && failRes.placed.length === cables.length,
    fillRatio: (totalArea / (MAX_WIDTH * maxHeightLimit)) * 100,
    totalODSum, totalCableArea: totalArea
  };
};

export const calculateOptimizationMatrix = (
  allCables: CableData[],
  maxHeight: number,
  targetFill: number
): MatrixCell[][] => {
  // 100mm 단위 200~900 (Visualizer 표시에 맞춤, 필요시 확장 가능)
  const widths = [200, 300, 400, 500, 600, 700, 800, 900];
  const tierCounts = [1, 2, 3, 4, 5, 6];
  const matrix: MatrixCell[][] = [];

  const totalCableArea = allCables.reduce((acc, c) => acc + Math.PI * Math.pow(c.od / 2, 2), 0);

  for (const t of tierCounts) {
    const row: MatrixCell[] = [];

    // 시뮬레이션을 위한 최악의 조건(케이블이 제일 많이 몰리는 단) 생성
    const tierBuckets: CableData[][] = Array.from({ length: t }, () => []);
    const sorted = [...allCables].sort((a, b) => b.od - a.od);
    sorted.forEach((c, i) => tierBuckets[i % t].push(c));

    const worstTierCables = tierBuckets.reduce((prev, curr) =>
      curr.reduce((a, c) => a + c.od, 0) > prev.reduce((a, c) => a + c.od, 0) ? curr : prev
    );

    for (const w of widths) {
      const area = w * maxHeight * t;
      // System Fill 계산 (전체 시스템 기준)
      const systemFill = (totalCableArea / area) * 100;

      // Physical Check: 해당 폭과 높이에 다 들어가는지
      const res = attemptFit(worstTierCables, w, maxHeight);

      // 최적 조건: 용적률 만족 & 물리적 적재 성공
      const isOptimal = systemFill <= targetFill && res.success && res.placed.length === worstTierCables.length;

      row.push({
        tiers: t,
        width: w,
        area: area,
        fillRatio: systemFill,
        success: res.success && res.placed.length === worstTierCables.length,
        isOptimal
      });
    }
    matrix.push(row);
  }
  return matrix;
};

export const solveSystem = (
  allCables: CableData[],
  numberOfTiers: number,
  maxHeightLimit: number,
  targetFillRatioPercent: number
): SystemResult => {
  const tierBuckets: CableData[][] = Array.from({ length: numberOfTiers }, () => []);
  const sorted = [...allCables].sort((a, b) => b.od - a.od);
  sorted.forEach((c, i) => tierBuckets[i % numberOfTiers].push(c));

  // 1. 각 티어별 최적 폭 계산
  const tierResults = tierBuckets.map((bucket, idx) => solveSingleTier(bucket, idx, maxHeightLimit, targetFillRatioPercent));

  // 2. 전체 시스템 폭 결정 (가장 넓은 것 기준)
  const maxTrayWidth = Math.max(...tierResults.map(r => r.width));

  // 3. 결정된 시스템 폭으로 모든 티어 다시 시뮬레이션 (시각화 통일성)
  const finalTierResults = tierBuckets.map((bucket, idx) => solveSingleTier(bucket, idx, maxHeightLimit, targetFillRatioPercent, maxTrayWidth));

  const matrix = calculateOptimizationMatrix(allCables, maxHeightLimit, targetFillRatioPercent);

  return {
    systemWidth: maxTrayWidth,
    tiers: finalTierResults,
    success: finalTierResults.every(r => r.success),
    maxHeightPerTier: maxHeightLimit,
    optimizationMatrix: matrix
  };
};

export const solveSystemAtWidth = (
  allCables: CableData[],
  numberOfTiers: number,
  width: number,
  maxHeightLimit: number,
  targetFillRatioPercent: number
): SystemResult => {
  const tierBuckets: CableData[][] = Array.from({ length: numberOfTiers }, () => []);
  const sorted = [...allCables].sort((a, b) => b.od - a.od);
  sorted.forEach((c, i) => tierBuckets[i % numberOfTiers].push(c));

  const finalTierResults = tierBuckets.map((bucket, idx) => solveSingleTier(bucket, idx, maxHeightLimit, targetFillRatioPercent, width));

  const matrix = calculateOptimizationMatrix(allCables, maxHeightLimit, targetFillRatioPercent);

  return {
    systemWidth: width,
    tiers: finalTierResults,
    success: finalTierResults.every(r => r.success),
    maxHeightPerTier: maxHeightLimit,
    optimizationMatrix: matrix
  };
};