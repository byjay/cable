import { CableData, PlacedCable, Point, SingleTrayResult, SystemResult, MARGIN_X, MAX_PILE_WIDTH, PILE_GAP } from '../types';

// OD >= 20mm must be on Layer 1 only (large cables cannot stack)
const LARGE_CABLE_THRESHOLD = 20;

// Target fill rate for optimization
const TARGET_FILL_RATE = 50;

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
  maxHeightLimit: number,
  maxLayersAllowed: number,
  preferStacking: boolean // If true, prefer higher layers
): { point: Point, layer: number } | null => {
  const r = cable.od / 2;
  const candidates: { p: Point, layer: number, score: number }[] = [];

  // Find the rightmost floor position
  let lastFloorX = xMin - r;
  const floorCables = placed.filter(c => c.y <= c.od / 2 + 0.5).sort((a, b) => b.x - a.x);
  if (floorCables.length > 0) {
    lastFloorX = floorCables[0].x + floorCables[0].od / 2;
  } else {
    lastFloorX = xMin;
  }

  // Floor position (layer 1)
  candidates.push({ p: { x: lastFloorX + r, y: r }, layer: 1, score: preferStacking ? 100 : 1 });

  // If stacking is allowed and cable is small enough
  if (maxLayersAllowed > 1 && cable.od < LARGE_CABLE_THRESHOLD) {
    // Find stacking positions on top of existing cables
    for (let i = 0; i < placed.length; i++) {
      // Position directly on top of a single cable
      const topY = placed[i].y + placed[i].od / 2 + r;
      if (topY + r <= maxHeightLimit) {
        const layer = determineLayer(topY, r, placed, placed[i].x);
        if (layer <= maxLayersAllowed) {
          candidates.push({
            p: { x: placed[i].x, y: topY },
            layer,
            score: preferStacking ? (layer * -10) : (layer * 10) // Prefer higher layers if preferStacking
          });
        }
      }

      // Tangent positions between cables
      const tPoints = getTangentPoints(placed[i], { ...placed[i], y: -placed[i].od / 2, od: placed[i].od, id: '', name: '', type: '', layer: 0, x: placed[i].x } as PlacedCable, r);
      tPoints.forEach(tp => {
        const layer = determineLayer(tp.y, r, placed, tp.x);
        candidates.push({ p: tp, layer, score: preferStacking ? (layer * -10) : (layer * 10) });
      });

      for (let j = i + 1; j < placed.length; j++) {
        const pts = getTangentPoints(placed[i], placed[j], r);
        pts.forEach(tp => {
          const layer = determineLayer(tp.y, r, placed, tp.x);
          candidates.push({ p: tp, layer, score: preferStacking ? (layer * -10) : (layer * 10) });
        });
      }
    }
  }

  // Filter valid positions
  const valid = candidates.filter(c => {
    if (isNaN(c.p.x) || isNaN(c.p.y)) return false;
    if (c.p.x - r < xMin - 0.1 || c.p.x + r > xMax + 0.1) return false;
    if (c.p.y < r - 0.1 || c.p.y + r > maxHeightLimit + 0.1) return false;
    if (c.layer > maxLayersAllowed) return false;
    if (cable.od >= LARGE_CABLE_THRESHOLD && c.layer > 1) return false;
    if (checkCollision(placed, c.p.x, c.p.y, r)) return false;
    if (c.layer > 1 && checkOverhang(placed, c.p.x, c.p.y, r)) return false;
    return true;
  });

  if (valid.length === 0) return null;

  // Sort by score (lower is better when preferStacking)
  if (preferStacking) {
    valid.sort((a, b) => {
      // Prefer higher layers first
      if (a.layer !== b.layer) return b.layer - a.layer;
      // Then left to right
      return a.p.x - b.p.x;
    });
  } else {
    valid.sort((a, b) => {
      if (Math.abs(a.p.x - b.p.x) > 5) return a.p.x - b.p.x;
      return a.p.y - b.p.y;
    });
  }

  return { point: valid[0].p, layer: valid[0].layer };
};

const getStandardTrayWidth = (w: number): number => {
  if (w <= 0) return 100;
  return Math.ceil(w / 100) * 100;
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
    const res = findDensePositionWithStacking(cable, placed, MARGIN_X, width - MARGIN_X, maxHeightLimit, 1, false);
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
      // Try floor first (preferStacking = false), then allow stacking
      const res = findDensePositionWithStacking(cable, placed, MARGIN_X, width - MARGIN_X, maxHeightLimit, stackingLimit, false);
      if (res) {
        placed.push({ ...cable, x: res.point.x, y: res.point.y, layer: res.layer });
      } else {
        allFit = false;
        break;
      }
    }
  }

  const fillRatio = (totalArea / (width * maxHeightLimit)) * 100;

  return { placed, success: allFit, fillRatio, totalArea };
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

  for (let widthTry = startWidth; widthTry <= 4000; widthTry += 100) {
    const result = tryPlaceAtWidth(cables, widthTry, maxHeightLimit, stackingLimit);

    if (result.success) {
      const diff = Math.abs(result.fillRatio - TARGET_FILL_RATE);

      // If this is closer to 60%, use it
      if (diff < bestDiff) {
        bestDiff = diff;
        bestResult = { width: widthTry, placed: result.placed, fillRatio: result.fillRatio };
      }

      // If fill rate drops below 30%, stop searching (too big)
      if (result.fillRatio < 30) {
        break;
      }
    }
  }

  // If no result found, try again without restrictions
  if (!bestResult) {
    for (let widthTry = 100; widthTry <= 4000; widthTry += 100) {
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
      width: 4000,
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
  numberOfTiers: number,
  maxHeightLimit: number,
  targetFillRatioPercent: number
): SystemResult => {
  const tierBuckets: CableData[][] = Array.from({ length: numberOfTiers }, () => []);
  const sorted = [...allCables].sort((a, b) => b.od - a.od);

  sorted.forEach((c, i) => {
    tierBuckets[i % numberOfTiers].push(c);
  });

  const initialResults = tierBuckets.map((bucket, idx) =>
    solveSingleTier(bucket, idx, maxHeightLimit, targetFillRatioPercent, 3)
  );

  const maxTrayWidth = Math.max(...initialResults.map(r => r.width));

  const finalTierResults = tierBuckets.map((bucket, idx) => {
    return solveSingleTierAtFixedWidth(bucket, idx, maxTrayWidth, maxHeightLimit, 3);
  });

  return {
    systemWidth: maxTrayWidth,
    tiers: finalTierResults,
    success: finalTierResults.every(r => r.success),
    maxHeightPerTier: maxHeightLimit
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
