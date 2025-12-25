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
  x: number;
  y: number;
  layer: number; // Vertical stacking layer within a single tray
}

export interface SingleTrayResult {
  tierIndex: number;
  width: number; // Required width for this specific tier
  cables: PlacedCable[];
  success: boolean;
  fillRatio: number;
  totalODSum: number;
  totalCableArea: number;
}

export interface SystemResult {
  systemWidth: number; // The max width among all tiers
  tiers: SingleTrayResult[];
  success: boolean;
  maxHeightPerTier: number;
}

export const MARGIN_X = 10; // 10mm margin on each side (global tray edges)
export const MAX_PILE_WIDTH = 200; // Max width for a single continuous pile
export const PILE_GAP = 10; // Gap between piles
