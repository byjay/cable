# 🚢 SEASTAR Cable Management System V5

Enterprise-grade cable routing and management system for shipbuilding industry.

## 📁 Project Structure

```
seastar-cable-manager/
├── App.tsx                 # Main application with menu, routing logic, views
├── types.ts                # TypeScript interfaces (Cable, Node, RouteResult)
├── index.tsx               # React entry point
├── index.html              # HTML template
├── vite.config.ts          # Vite build configuration
│
├── components/
│   ├── CableList.tsx       # Cable table with selection, routing, filtering
│   ├── Dashboard.tsx       # Statistics dashboard with charts
│   ├── ThreeScene.tsx      # 3D visualization with Three.js
│   ├── TrayAnalysis.tsx    # Tray fill ratio analysis (40% warning)
│   ├── NodeManager.tsx     # Node/junction management
│   ├── CableTypeManager.tsx# Cable type specifications
│   ├── CableRequirementReport.tsx  # BOM calculation report
│   └── GenericGrid.tsx     # Generic data table view
│
├── services/
│   ├── excelService.ts     # Excel import/export (XLSX)
│   ├── routingService.ts   # Dijkstra's shortest path algorithm
│   └── mockData.ts         # Sample data for development
│
└── public/
    └── data/               # Excel data files (35k_node.xlsx, 35k_sch.xlsx)
```

---

## 🎯 Core Features

### 1. Dashboard (대시보드)
- **Total Cables**: 전체 케이블 수
- **Total Length**: 전체 케이블 길이 (km)
- **Routed Cables**: 라우팅 완료 비율 (%)
- **Charts**: System별 분포, Top 10 긴 케이블, 노드 연결 통계

### 2. Cable List (케이블 목록)
| 기능 | 설명 |
|------|------|
| Route All | 모든 케이블 경로 자동 계산 |
| Route Selected | 선택한 케이블만 계산 |
| NO LENGTH Filter | 길이 없는 케이블 필터링 |
| 3D View | 선택한 케이블 3D 시각화 |
| Export | Excel 내보내기 |

### 3. Tray Analysis (트레이 분석) ⚠️
```
충전율 공식:
- Tray Capacity = Width × 60mm
- Cable Area = π × (OD/2)²
- Fill Ratio = (Total Cable Area / Tray Capacity) × 100%
- ⚠️ 40% 초과 시 경고!
```

### 4. 3D Visualization (3D 보기)
- **FROM Node**: 🟢 Green sphere
- **TO Node**: 🔴 Red sphere
- **Middle Nodes**: 🟡 Yellow cubes
- **Route Path**: 💠 Cyan tube
- **Labels**: Floating node names

### 5. Data Persistence (데이터 저장)
- ✅ Route All 완료 시 자동 저장 (localStorage)
- ✅ 새로고침 후에도 데이터 유지
- ✅ 변경 감지: fromNode/toNode/checkNode 변경 시 경로 리셋

---

## 🖥️ Menu Structure

```
File           → Open Project, Save Project, Export, Exit
Master         → Master Data, DB Update, Test (disabled)
CableType      → Cable Type, Tray Spec, Cable Binding
User           → User Mgmt, Switch Role, Log
Ship           → Ship Select, Ship Definition, Deck Code, Equip Code
Schedule       → Schedule, CableGroup
Report         → Cable List, Node List, Cable Requirement, Tray Analysis, Cable Drum Inquiry
Data Transfer  → Import, Export
Option         → Settings, 3D Config
```

---

## 🗂️ Data Types

### Cable Interface
```typescript
interface Cable {
  id: string;           // Cable ID
  name: string;         // CABLE_NAME
  type: string;         // CABLE_TYPE
  od: number;           // Outer Diameter (mm)
  length: number;       // Calculated Length (m)
  fromNode: string;     // FROM_NODE
  toNode: string;       // TO_NODE
  checkNode?: string;   // CHECK_NODE (waypoint)
  fromRest?: number;    // FROM_REST margin
  toRest?: number;      // TO_REST margin
  calculatedPath?: string[];  // Route path nodes
  calculatedLength?: number;  // Total routed length
}
```

### Node Interface
```typescript
interface Node {
  name: string;         // Node name
  relation: string;     // Connected nodes (comma-separated)
  linkLength: number;   // Edge weight for routing
  x?: number;           // X coordinate
  y?: number;           // Y coordinate
  z?: number;           // Z coordinate (deck)
  areaSize?: number;    // Tray width (mm)
}
```

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 📊 Routing Algorithm

Uses **Dijkstra's Shortest Path Algorithm**:
1. Build graph from Node relations
2. Calculate shortest path from FROM_NODE to TO_NODE
3. If CHECK_NODE exists, route through waypoint
4. Total Length = Route Distance + FROM_REST + TO_REST

---

## 🔧 Technologies

- **React 18** + TypeScript
- **Vite** - Build tool
- **Three.js** - 3D visualization
- **XLSX** - Excel import/export
- **Tailwind CSS** - Styling
- **Lucide Icons** - UI icons

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| V5.0 | 2024-12 | Full React rewrite, Tray Analysis, Data Persistence |
| V4.0 | 2024-11 | 3D visualization, Dijkstra routing |
| V3.0 | 2024-10 | Excel integration |

---

## 👤 Developer

**SEASTAR Engineering**  
📧 designsir@seastargo.com
