# 🚢 SEASTAR Cable Management System V5

Enterprise-grade cable routing and management system for shipbuilding industry.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Cloud Run (Backend API)                     │
│            https://seastar-api-xxxxx.run.app                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   FastAPI   │    │  StorageService  │    │   Parsers   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↑
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Standalone     │  │  SDMS Embedded   │  │  Mobile (Future) │
│  (Netlify CDN)  │  │   Sub-Module     │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 📁 Project Structure

```
seastar-cable-manager/
├── App.tsx                    # Main application (44KB)
├── types.ts                   # TypeScript interfaces
├── index.tsx / index.html     # Entry points
├── vite.config.ts             # Vite build configuration
├── netlify.toml               # Netlify deploy settings
├── package.json               # Dependencies
│
├── components/                # 25 React components
│   ├── Dashboard.tsx          # Statistics & charts
│   ├── CableList.tsx          # Cable table (34KB)
│   ├── ThreeScene.tsx         # 3D visualization
│   ├── TrayAnalysis.tsx       # Tray fill ratio (40% warning)
│   ├── WDExtractionView.tsx   # PDF/Excel extraction
│   ├── NodeManager.tsx        # Node/junction management
│   └── ...
│
├── backend/
│   ├── Dockerfile             # Cloud Run container
│   ├── requirements.txt       # Python dependencies (11개)
│   └── app/
│       ├── main.py            # FastAPI entry point
│       └── services/
│           ├── storage.py     # 🔒 GCS + Local dual storage
│           ├── parser.py      # Cable schedule parser
│           ├── universal_parser.py  # Universal format parser
│           ├── cad_service.py # DXF/CAD processing
│           └── manager.py     # Extraction manager
│
├── .github/workflows/
│   └── deploy-backend.yml     # CI/CD to Cloud Run
│
└── services/
    ├── excelService.ts        # Excel import/export
    └── routingService.ts      # Dijkstra routing
```

---

## 🚀 Deployment

### Backend: Google Cloud Run
```bash
# 1. Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 2. Create storage bucket
gcloud storage buckets create gs://seastar-cable-manager-storage-XXXXX --location=asia-northeast3

# 3. Deploy
cd backend
gcloud run deploy seastar-api \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars BUCKET_NAME=seastar-cable-manager-storage-XXXXX
```

### Frontend: Netlify
```bash
# Build and deploy
npm run build
# → dist/ folder deploys to Netlify automatically via Git push
```

### Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://seastar-api-xxxxx.run.app` |
| `BUCKET_NAME` | GCS bucket (backend) | `seastar-cable-manager-storage-38003` |

---

## 🔒 Security Architecture

```
[Developer] --(Push Code)--> [GitHub] --(Deploy)--> [Cloud Run]
                                                        ↑
[User PC] ----(Upload File)-----------------------------/
                                                        ↓
                                            [Google Cloud Storage]
                                            (Private Bucket, Encrypted)
```

- **GitHub**: Code only (도면 파일 없음)
- **Cloud Run**: Compute only (휘발성 메모리)
- **GCS Bucket**: Secure data storage (암호화, IAM 제한)

---

## 🎯 Core Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | 케이블 수, 총 길이, 라우팅 비율, 차트 |
| **Cable List** | Route All, 3D View, Excel Export |
| **Tray Analysis** | 충전율 계산 (40% 초과 경고) |
| **3D Visualization** | Three.js 기반 경로 시각화 |
| **Universal Parser** | 다양한 Excel 포맷 자동 인식 |
| **CAD Designer** | DXF 파일 노드 네트워크 추출 |
| **WD Extraction** | PDF/Excel 케이블 스케줄 파싱 |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 6, TypeScript, Three.js, Recharts |
| **Backend** | FastAPI, Uvicorn, Pydantic |
| **Parsing** | pdfplumber, pandas, openpyxl, ezdxf |
| **Storage** | Google Cloud Storage (Production), Local (Dev) |
| **CI/CD** | GitHub Actions → Cloud Run |
| **CDN** | Netlify |

---

## 📝 Quick Start

```bash
# Frontend
npm install
npm run dev          # http://localhost:5173

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
```

---

## 📊 Routing Algorithm

Uses **Dijkstra's Shortest Path Algorithm**:
1. Build graph from Node relations
2. Calculate shortest path from FROM_NODE to TO_NODE
3. If CHECK_NODE exists, route through waypoint
4. Total Length = Route Distance + FROM_REST + TO_REST

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| V5.1 | 2024-12 | GCS Storage, Cloud Run Deploy, SDMS Integration |
| V5.0 | 2024-12 | Full React rewrite, Tray Analysis, Data Persistence |
| V4.0 | 2024-11 | 3D visualization, Dijkstra routing |
| V3.0 | 2024-10 | Excel integration |

---

## 👤 Developer

**SEASTAR Engineering**  
📧 designsir@seastargo.com
