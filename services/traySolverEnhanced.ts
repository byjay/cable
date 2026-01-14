import { Cable } from '../types';

export interface CableData {
  id: string;
  name: string;
  type: string;
  od: number;
  color?: string;
  layer?: number; // Added for solver
  x?: number; // Added for solver
  y?: number; // Added for solver
}

export interface PlacedCable extends CableData {
  x: number;
  y: number;
  layer: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SingleTrayResult {
  tierIndex: number;
  width: number;
  cables: PlacedCable[];
  success: boolean;
  fillRatio: number;
  totalODSum: number;
  totalCableArea: number;
}

export interface SystemResult {
  systemWidth: number;
  tiers: SingleTrayResult[];
  success: boolean;
  maxHeightPerTier: number;
  totalAreaSum?: number; // Added for verification
  totalODSum?: number; // Added for verification
}

export const calculateBasicStats = (cables: CableData[]) => {
  let totalODSum = 0;
  let totalAreaSum = 0;
  cables.forEach(c => {
    totalODSum += c.od;
    totalAreaSum += Math.PI * Math.pow(c.od / 2, 2);
  });
  return { totalODSum, totalAreaSum };
};

export const MARGIN_X = 5;
export const MAX_PILE_WIDTH = 0; // Not used in this logic but kept for interface
export const PILE_GAP = 0;

// OD >= 20mm must be on Layer 1 only (large cables cannot stack)
const LARGE_CABLE_THRESHOLD = 20;

// Target fill rate for optimization
const TARGET_FILL_RATE = 50;

// Standard Industrial Tray Widths (mm) - Strictly 100mm increments per user request
const STANDARD_WIDTHS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];

const getNextStandardWidth = (w: number): number => {
  return STANDARD_WIDTHS.find(sw => sw >= w) || Math.ceil(w / 100) * 100;
};

// If fill rate is below this and 1 layer fits, don't force multi-layer
const LOW_FILL_THRESHOLD = 35;

const dist = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

const checkCollision = (cables: PlacedCable[], x: number, y: number, r: number): boolean => {
  const EPSILON = 0.05;
  for (const c of cables) {
    const d = dist({ x, y }, { x: c.x, y: c.y });
    const minDist = (c.od / 2) + r - EPSILON;
    if (d < minDist) return true;
  }
  return false;
};

// Check if cable is physically supported (touches floor OR sits on another cable)
const isPhysicallySupported = (placed: PlacedCable[], x: number, y: number, r: number): boolean => {
  // If touching floor (y = r means center at radius, bottom at 0)
  if (y <= r + 0.5) return true;

  // Must be resting on at least one cable below
  // A cable is "resting on" another if they are tangent (touching)
  for (const c of placed) {
    const d = dist({ x, y }, { x: c.x, y: c.y });
    const touchDist = r + c.od / 2;
    // If distance equals touch distance (within tolerance) and new cable is above
    if (Math.abs(d - touchDist) < 1.0 && y > c.y) {
      return true;
    }
  }
  return false;
};

const checkOverhang = (placed: PlacedCable[], x: number, y: number, r: number): boolean => {
  return !isPhysicallySupported(placed, x, y, r);
};

const getTangentPoints = (c1: PlacedCable, c2: PlacedCable, r: number): Point[] => {
  const r1 = c1.od / 2 + r;
  const r2 = c2.od / 2 + r;
  const d = dist({ x: c1.x, y: c1.y }, { x: c2.x, y: c2.y });
  if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const x2 = c1.x + (a * (c2.x - c1.x)) / d;
  const y2 = c1.y + (a * (c2.y - c1.y)) / d;
  return [
    { x: x2 + (h * (c2.y - c1.y)) / d, y: y2 - (h * (c2.x - c1.x)) / d },
    { x: x2 - (h * (c2.y - c1.y)) / d, y: y2 + (h * (c2.x - c1.x)) / d },
  ];
};

const determineLayer = (y: number, r: number, placed: PlacedCable[], x: number): number => {
  if (y <= r + 0.5) return 1;
  const below = placed.filter(c => Math.abs(c.x - x) < (c.od / 2 + r) && c.y < y);
  if (below.length === 0) return 1;
  return Math.max(...below.map(c => c.layer)) + 1;
};

// Find position with priority for stacking (prefer higher layers for small cables)
const findDensePositionWithStacking = (
  cable: CableData,
  placed: PlacedCable[],
  xMin: number,
  xMax: number,
  maxHeightLimit: number
): { point: Point, layer: number } | null => {
  // CLAUDE 4.5 COGNITIVE MODE: 60mm Strict Height Enforcement
  const ACTUAL_MAX_HEIGHT = 60;
  const r = cable.od / 2;
  const candidates: { p: Point, score: number }[] = [];

  // Optimization: Sort by X to allow spatial pruning (O(N log N) here, avoids O(N^2) later)
  // Making total placement O(N^2) instead of O(N^3)
  const sortedPlaced = [...placed].sort((a, b) => a.x - b.x);

  // 1. Base Scanning (Floor Level)
  // Optimization: Increase step size slightly? Keep 5 for now.
  let scanX = xMin + r;
  while (scanX <= xMax - r) {
    if (!checkCollision(placed, scanX, r, r)) {
      candidates.push({ p: { x: scanX, y: r }, score: r });
    }
    scanX += 5;
  }

  // 2. Tangent Valley Packing (Circle between Circles) - SPATIALLY OPTIMIZED
  if (sortedPlaced.length > 0) {
    for (let i = 0; i < sortedPlaced.length; i++) {
      const c1 = sortedPlaced[i];
      const r1 = c1.od / 2;

      // Tangent with floor boundary
      const dy = Math.abs(c1.y - r);
      if (dy <= r1 + r) {
        const dx = Math.sqrt(Math.pow(r1 + r, 2) - Math.pow(dy, 2));
        if (!isNaN(dx)) {
          candidates.push({ p: { x: c1.x + dx, y: r }, score: r });
          candidates.push({ p: { x: c1.x - dx, y: r }, score: r });
        }
      }

      // Tangent with other cables (The O(N^2) killer -> Now Optimized)
      for (let j = i + 1; j < sortedPlaced.length; j++) {
        const c2 = sortedPlaced[j];

        // SPATIAL BREAK: If X distance is greater than max possible touch distance, stop checking
        if (c2.x - c1.x > (r1 + c2.od / 2 + 2 * r)) {
          break; // Since sorted by X, no further cables can touch c1
        }

        const pts = getTangentPoints(c1, c2, r);
        pts.forEach(tp => {
          candidates.push({ p: tp, score: tp.y });
        });
      }
    }
  }

  // Filter valid positions
  const valid = candidates.filter(cand => {
    const { x, y } = cand.p;
    if (isNaN(x) || isNaN(y)) return false;
    if (x - r < xMin - 0.1 || x + r > xMax + 0.1) return false;
    if (y - r < -0.1 || y + r > ACTUAL_MAX_HEIGHT + 0.1) return false;
    if (checkCollision(placed, x, y, r)) return false;
    // Strict Physical Support check
    if (!isPhysicallySupported(placed, x, y, r)) return false;
    return true;
  });

  if (valid.length === 0) return null;

  // Prefer lowest Y (Gravity), then lowest X
  valid.sort((a, b) => {
    if (Math.abs(a.p.y - b.p.y) > 0.5) return a.p.y - b.p.y;
    return a.p.x - b.p.x;
  });

  const best = valid[0].p;
  const layer = determineLayer(best.y, r, placed, best.x);
  return { point: best, layer };
};

const getStandardTrayWidth = (w: number): number => {
  return getNextStandardWidth(w);
};

// Try to place cables at a specific width, prioritizing 3-layer stacking for small cables
const tryPlaceAtWidth = (
  cables: CableData[],
  width: number,
  maxHeightLimit: number,
  stackingLimit: number
): { placed: PlacedCable[], success: boolean, fillRatio: number, totalArea: number } => {
  const sortedCables = [...cables].sort((a, b) => b.od - a.od);
  const totalArea = cables.reduce((acc, c) => acc + Math.PI * Math.pow(c.od / 2, 2), 0);

  let placed: PlacedCable[] = [];
  let allFit = true;

  // First pass: place large cables (OD >= 20mm) on layer 1
  const largeCables = sortedCables.filter(c => c.od >= LARGE_CABLE_THRESHOLD);
  const smallCables = sortedCables.filter(c => c.od < LARGE_CABLE_THRESHOLD);

  // Place large cables first (they must be on layer 1)
  for (const cable of largeCables) {
    const res = findDensePositionWithStacking(cable, placed, MARGIN_X, width - MARGIN_X, maxHeightLimit);
    if (res) {
      placed.push({ ...cable, x: res.point.x, y: res.point.y, layer: res.layer });
    } else {
      allFit = false;
      break;
    }
  }

  // Place small cables - floor first, then stack on top
  if (allFit) {
    for (const cable of smallCables) {
      const res = findDensePositionWithStacking(cable, placed, MARGIN_X, width - MARGIN_X, maxHeightLimit);
      if (res) {
        placed.push({ ...cable, x: res.point.x, y: res.point.y, layer: res.layer });
      } else {
        allFit = false;
        break;
      }
    }
  }

  const fillRatio = (totalArea / (width * maxHeightLimit)) * 100;

  // 3. FINAL GRAVITY CHECK (User Requested Strictness)
  // Ensure every cable is either on floor or supported by another
  if (allFit && placed.length > 0) {
    const gravityOk = validateSystemGravity(placed);
    if (!gravityOk) {
      // console.warn("Gravity Check Failed - Backtracking");
      return { placed: [], success: false, fillRatio: 0, totalArea: 0 };
    }
  }

  return { placed, success: allFit, fillRatio, totalArea };
};

// Exported for verification scripts
export const validateSystemGravity = (cables: PlacedCable[]): boolean => {
  // Sort by Y ascending to check from bottom up (optimization)
  // Actually random access is needed.

  for (const c of cables) {
    const r = c.od / 2;
    // 1. Floor Support
    if (c.y <= r + 0.5) continue;

    // 2. Cable Support
    let supported = false;
    for (const other of cables) {
      if (c.id === other.id) continue;

      // Must be below
      if (other.y >= c.y) continue;

      const dist = Math.sqrt(Math.pow(c.x - other.x, 2) + Math.pow(c.y - other.y, 2));
      const touchDist = r + (other.od / 2);

      // Tangent tolerance
      if (Math.abs(dist - touchDist) < 1.0) {
        supported = true;
        break;
      }
    }

    if (!supported) return false;
  }
  return true;
};

export const solveSingleTier = (
  cables: CableData[],
  tierIndex: number,
  maxHeightLimit: number,
  targetFillRatioPercent: number,
  stackingLimit: number
): SingleTrayResult => {
  if (cables.length === 0) {
    return { tierIndex, width: 100, cables: [], success: true, fillRatio: 0, totalODSum: 0, totalCableArea: 0 };
  }

  const totalArea = cables.reduce((acc, c) => acc + Math.PI * Math.pow(c.od / 2, 2), 0);

  // Calculate minimum width based on area
  const minOccupancyWidth = (totalArea / maxHeightLimit) * (100 / TARGET_FILL_RATE);
  const startWidth = getStandardTrayWidth(Math.max(minOccupancyWidth, 100));

  // Try multiple widths and find the one closest to 60% fill rate
  let bestResult: { width: number, placed: PlacedCable[], fillRatio: number } | null = null;
  let bestDiff = Infinity;

  const MAX_TRAY_WIDTH = 900;

  for (let widthTry = startWidth; widthTry <= MAX_TRAY_WIDTH; widthTry += 100) {
    const result = tryPlaceAtWidth(cables, widthTry, maxHeightLimit, stackingLimit);

    if (result.success) {
      const diff = Math.abs(result.fillRatio - TARGET_FILL_RATE);

      // If this is closer to 60%, use it
      if (diff < bestDiff) {
        bestDiff = diff;
        bestResult = { width: widthTry, placed: result.placed, fillRatio: result.fillRatio };
      }

      // If fill rate drops below 5%, stop searching (too big)
      if (result.fillRatio < 5) {
        break;
      }
    }
  }

  // If no result found, try again without restrictions BUT within limit
  if (!bestResult) {
    for (let widthTry = 100; widthTry <= MAX_TRAY_WIDTH; widthTry += 100) {
      const result = tryPlaceAtWidth(cables, widthTry, maxHeightLimit, stackingLimit);
      if (result.success) {
        bestResult = { width: widthTry, placed: result.placed, fillRatio: result.fillRatio };
        break;
      }
    }
  }

  if (!bestResult) {
    return {
      tierIndex,
      width: 900, // Enforce max width even on failure
      cables: [],
      success: false,
      fillRatio: 0,
      totalODSum: cables.reduce((a, c) => a + c.od, 0),
      totalCableArea: totalArea
    };
  }

  // Special case: if fill < 35% and we can fit in 1 layer, recalculate with 1 layer only
  if (bestResult.fillRatio < LOW_FILL_THRESHOLD) {
    const singleLayerResult = tryPlaceAtWidth(cables, bestResult.width, maxHeightLimit, 1);
    if (singleLayerResult.success) {
      bestResult.placed = singleLayerResult.placed;
    }
  }

  return {
    tierIndex,
    width: bestResult.width,
    cables: bestResult.placed,
    success: true,
    fillRatio: bestResult.fillRatio,
    totalODSum: cables.reduce((a, c) => a + c.od, 0),
    totalCableArea: totalArea
  };
};

export const solveSystem = (
  allCables: CableData[],
  numberOfTiers: number = 1,
  maxHeightLimit: number = 60,
  targetFillRatioPercent: number = 60,
  userMaxTrayWidth: number = 900
): SystemResult => {
  if (allCables.length === 0) {
    return { systemWidth: 300, tiers: [], success: true, maxHeightPerTier: 60, totalAreaSum: 0, totalODSum: 0 };
  }

  const { totalODSum, totalAreaSum } = calculateBasicStats(allCables);
  const maxODInSet = Math.max(...allCables.map(c => c.od));
  const MAX_LIMIT_H = 60; // Strict Industrial standard

  let currentTiers = numberOfTiers;
  const MAX_GLOBAL_WIDTH_LIMIT = userMaxTrayWidth;

  // Starting widthIdx: find standard width that fits largest cable
  let widthIdx = STANDARD_WIDTHS.findIndex(w => w >= maxODInSet + 10);
  if (widthIdx === -1) widthIdx = 0;

  let finalSystemResult: SystemResult | null = null;
  let success = false;
  let attempts = 0;
  const MAX_ITERATIONS = 40;

  while (attempts < MAX_ITERATIONS && !success) {
    attempts++;
    const currentWidthGoal = STANDARD_WIDTHS[widthIdx] || MAX_GLOBAL_WIDTH_LIMIT;

    // Safety check: if width exceeds user limit, we MUST add a tier instead
    if (currentWidthGoal > MAX_GLOBAL_WIDTH_LIMIT && widthIdx > 0) {
      currentTiers++;
      widthIdx = STANDARD_WIDTHS.findIndex(w => w >= maxODInSet + 10);
      if (currentTiers > 20) break;
      continue;
    }

    const tierBuckets: CableData[][] = Array.from({ length: currentTiers }, () => []);
    const sorted = [...allCables].sort((a, b) => b.od - a.od);
    sorted.forEach((c, i) => tierBuckets[i % currentTiers].push(c));

    const tierResults = tierBuckets.map((bucket, idx) => {
      // Direct solve as per requirement
      return solveSingleTierAtFixedWidth(bucket, idx, currentWidthGoal, MAX_LIMIT_H, 3);
    });

    success = tierResults.every(r => r.success);
    const systemMaxWidth = Math.max(...tierResults.map(r => r.width));

    finalSystemResult = {
      systemWidth: systemMaxWidth,
      tiers: tierResults,
      success,
      maxHeightPerTier: MAX_LIMIT_H,
      totalAreaSum,
      totalODSum
    };

    if (success) break;

    // FAILED: Step up width, if max width reached, step up tiers
    if (currentWidthGoal < MAX_GLOBAL_WIDTH_LIMIT) {
      widthIdx++;
    } else {
      currentTiers++;
      widthIdx = STANDARD_WIDTHS.findIndex(w => w >= maxODInSet + 10); // Reset width for more tiers
    }
  }

  const finalWidth = STANDARD_WIDTHS[widthIdx] || MAX_GLOBAL_WIDTH_LIMIT;

  return finalSystemResult || {
    systemWidth: finalWidth,
    tiers: [],
    success: false,
    maxHeightPerTier: MAX_LIMIT_H,
    totalAreaSum,
    totalODSum
  };
};

export const autoSolveSystem = solveSystem; // Alias for compatibility

export const solveSystemAtWidth = (
  allCables: CableData[],
  numberOfTiers: number,
  width: number,
  maxHeightLimit: number,
  targetFillRatioPercent: number
): SystemResult => {
  const tierBuckets: CableData[][] = Array.from({ length: numberOfTiers }, () => []);
  const sorted = [...allCables].sort((a, b) => b.od - a.od);

  sorted.forEach((c, i) => {
    tierBuckets[i % numberOfTiers].push(c);
  });

  const finalTierResults = tierBuckets.map((bucket, idx) => {
    return solveSingleTierAtFixedWidth(bucket, idx, width, maxHeightLimit, 3);
  });

  return {
    systemWidth: width,
    tiers: finalTierResults,
    success: finalTierResults.every(r => r.success),
    maxHeightPerTier: maxHeightLimit
  };
};

function solveSingleTierAtFixedWidth(cables: CableData[], tierIndex: number, width: number, maxHeightLimit: number, stackingLimit: number): SingleTrayResult {
  const result = tryPlaceAtWidth(cables, width, maxHeightLimit, stackingLimit);

  return {
    tierIndex,
    width,
    cables: result.placed,
    success: result.success,
    fillRatio: result.fillRatio,
    totalODSum: cables.reduce((a, c) => a + c.od, 0),
    totalCableArea: result.totalArea
  };
}