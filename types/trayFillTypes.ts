export interface CableData {
  id: string;
  name: string;
  type: string;
  od: number;
  system?: string; // Cable System Group
  fromNode?: string; // From Node for sorting
  toNode?: string; // To Node for routing
  checkNode?: string; // Check Node for routing waypoints
  calculatedPath?: string[]; // Result of routing
  color?: string;
}

export interface NodeData {
  name: string;
  relation?: string;
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
  maxStackHeight: number; // Actual height of the cable pile
}

export interface SystemResult {
  systemWidth: number; // The max width among all tiers
  tiers: SingleTrayResult[];
  success: boolean;
  maxHeightPerTier: number;
  optimizationMatrix?: MatrixCell[][]; // Optional matrix for visualization
}

export interface MatrixCell {
  tiers: number;
  width: number;
  area: number;
  fillRatio: number;
  success: boolean; // Physically fits
  isOptimal: boolean; // Meets fill ratio limit
}

export const MARGIN_X = 10; // 10mm margin on each side (global tray edges)
export const MAX_PILE_WIDTH = 200; // Max width for a single continuous pile
export const PILE_GAP = 10; // Gap between piles
