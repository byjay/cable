
export interface Cable {
  id: string; // 'No'
  name: string; // 'CABLE_NAME'
  type: string; // 'COMP_NAME' or 'CABLE_TYPE'
  od: number; // 'CABLE_OUTDIA'
  length: number; // 'POR_LENGTH'
  system: string; // 'CABLE_SYSTEM'
  // From Side
  fromDeck?: string; // 'FROM_ROOM' (mapped as Deck)
  fromNode: string; // 'FROM_NODE'
  fromEquip?: string; // 'FROM_EQUIP'
  fromRoom?: string; // (Additional room info if separate)
  fromRest?: number | string; // 'FROM_REST'
  // To Side
  toDeck?: string; // 'TO_ROOM' (mapped as Deck)
  toNode: string; // 'TO_NODE'
  toEquip?: string; // 'TO_EQUIP'
  toRoom?: string;
  toRest?: number | string; // 'TO_REST'
  // Metadata
  supplyDeck?: string; // 'SUPPLY_DECK'
  checkNode?: string; // 'CHECK_NODE'
  calculatedPath?: string[];
  calculatedLength?: number;
  weight?: number; // 'POR_WEIGHT'
  page?: string; // 'WD_PAGE'
  drum?: string; // 'DRUM'
  remark?: string;
  // Route Info from Excel
  path?: string; // 'CABLE_PATH'
  // Error tracking
  routeError?: string; // Routing error message
  revComment?: string; // Revision comment for change tracking
  revHistory?: {
    date: string;
    user: string;
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  [key: string]: any; // Allow flexible indexing
}

export interface CableType {
  id: string;
  name: string;
  type: string;
  od: number;
  weight?: number;
  description?: string;
  [key: string]: any;
}

export interface Node {
  name: string;
  relation: string;
  linkLength: number;
  x?: number;
  y?: number;
  z?: number;
  deck?: string;
  structure?: string;
  component?: string;
  type?: string;
  cableList?: string;
  areaSize?: number;
  maxCable?: number;
  point?: string; // Original POINT string from Excel
  [key: string]: any;
}

export interface RouteResult {
  path: string[];
  distance: number;
  error?: string;
}

export interface DeckConfig {
  [key: string]: number;
}

export interface GenericRow {
  [key: string]: string | number | boolean | null;
}

// Maps to the Top Menu Bar
export enum MainView {
  SCHEDULE = 'Schedule',
  DASHBOARD = 'Dashboard',
  MASTER_DATA = 'Master Data',
  CABLE_TYPE = 'Cable Type',
  USER_MGMT = 'User Management',
  SHIP_DEF = 'Ship Definition',
  REPORT_DRUM = 'Drum Schedule',
  REPORT_NODE = 'Node List',
  REPORT_BOM = 'Cable Requirement',
  TRAY_ANALYSIS = 'Tray Analysis', // New: Fill Ratio Analysis
  THREE_D = '3D Visualization',
  GENERIC_GRID = 'Generic Grid',
  SETTINGS = 'Settings',
  WD_EXTRACTION = 'WD Extraction',
  ANALYTICS = 'Analytics',
  INSTALL_STATUS = 'Installation Status',
  PERMISSIONS = 'Permissions',
  ADMIN_CONSOLE = 'Admin Console',

  UNIVERSAL = 'UNIVERSAL'
}


export interface NodeFillData {
  nodeName: string;
  trayWidth: number;
  trayCapacity: number; // width * 60
  cableCount: number;
  totalCableArea: number;
  fillRatio: number; // as percentage
  isOverfilled: boolean;
  cables: string[];
}

// --- Logic for Advanced Tray Solver (FILL) ---

export interface CableData {
  id: string;
  name: string;
  type: string;
  od: number;
  system?: string; // Added for sorting parity
  fromNode?: string; // Added for sorting parity
  toNode?: string;
  checkNode?: string;
  calculatedPath?: string[];
  color?: string;
}

// Simplified Node data for routing (from tray-fill)
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
  displayIndex?: number; // Added for visualization numbering
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

export interface MatrixCell {
  tiers: number;
  width: number;
  area: number;
  fillRatio: number;
  success: boolean; // Physically fits
  isOptimal: boolean; // Meets fill ratio limit
}

export interface SystemResult {
  systemWidth: number; // The max width among all tiers
  tiers: SingleTrayResult[];
  success: boolean;
  maxHeightPerTier: number;
  optimizationMatrix?: MatrixCell[][]; // Optional matrix for visualization
}

// ... existing exports

export interface User {
  id: string; // 'admin' or UUID
  username: string;
  password?: string; // In real app, hashed. Here plain for mock.
  role: 'ADMIN' | 'USER' | 'GUEST';
  assignedShips: string[]; // List of Ship IDs this user can access
  createdBy?: string;
  createdAt?: string;
}

export const MARGIN_X = 10; // 10mm margin on each side (global tray edges)
export const MAX_PILE_WIDTH = 200; // Max width for a single continuous pile
export const PILE_GAP = 10; // Gap between piles
