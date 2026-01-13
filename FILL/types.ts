export interface CableData {
  id: string;
  name: string;
  type: string;
  od: number;
  color?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface PlacedCable extends CableData {
  id: string;
  name: string;
  type: string;
  od: number;
  color?: string;
  x: number;
  y: number;
  layer: number; // Vertical stacking layer within a single tray
  cableNumber: number; // Sequential cable number for identification
  placementOrder: number; // Order of placement for drawing
}

export interface SingleTrayResult {
  tierIndex: number;
  width: number; // Required width for this specific tier
  cables: PlacedCable[];
  success: boolean;
  fillRatio: number;
  totalODSum: number;
  totalCableArea: number;
  cableCount: number; // Total number of cables in this tier
  efficiency: number; // Real-world packing efficiency
}

export interface SystemResult {
  systemWidth: number; // The max width among all tiers
  tiers: SingleTrayResult[];
  success: boolean;
  maxHeightPerTier: number;
  totalCables: number; // Total cables across all tiers
  averageFillRatio: number; // Average fill ratio across tiers
  totalEfficiency: number; // Overall system efficiency
  optimizationScore: number; // Overall optimization score (0-100)
}

export const MARGIN_X = 10; // 10mm margin on each side (global tray edges)
export const MAX_PILE_WIDTH = 200; // Max width for a single continuous pile
export const PILE_GAP = 10; // Gap between piles
