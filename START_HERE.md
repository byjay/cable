# START HERE (opencode-collab)

이 폴더는 무료 모델 기반(OpenCode + Gemini) 협업 루프를 빠르게 시작하기 위한 템플릿입니다.

## 1) 이 폴더를 워크스페이스로 열기
- IDE에서 `C:\Users\FREE\CascadeProjects\opencode-collab` 를 워크스페이스로 열어주세요.

## 2) PowerShell 세션 PATH 갱신(권장)
새로 설치한 도구가 PowerShell에서 바로 안 잡히는 경우가 있어, 아래 스크립트를 먼저 실행하세요.

```powershell
./setup_path.ps1
```

## 3) Google 인증(필수)
```powershell
opencode auth login
```
- Provider: Google
- 인증: Antigravity(Current Session) 또는 안내되는 OAuth

## 4) 로컬 협업 루프 실행
코드 변경 후 아래를 실행하면 reviewer 에이전트가 `REVIEW_REPORT.md`를 작성합니다.

```powershell
./collab_loop.ps1
```

## 5) (선택) Docker 3-Agent 모드
### 5-1. 컨테이너 띄우기
```powershell
docker compose up -d
```

### 5-2. 컨테이너별 OpenCode 설치
```powershell
docker exec agent1 npm install -g opencode-ai
docker exec agent1 npx oh-my-opencode install --no-tui --gemini=yes

docker exec agent2 npm install -g opencode-ai
docker exec agent2 npx oh-my-opencode install --no-tui --gemini=yes

docker exec agent3 npm install -g opencode-ai
docker exec agent3 npx oh-my-opencode install --no-tui --gemini=yes
```

### 5-3. 컨테이너별 Google 로그인(매우 중요)
아래를 각각 실행하고, 브라우저에서 반드시 서로 다른 Google 계정으로 로그인하세요.

```powershell
docker exec -it agent1 opencode auth login
docker exec -it agent2 opencode auth login
docker exec -it agent3 opencode auth login
```

### 5-4. 오케스트레이터 실행
```powershell
python orchestrator.py "프로젝트 목표"
```

## 파일 안내
- `.opencode/oh-my-opencode.json`: 프로젝트 레벨 에이전트 설정
- `collab_loop.ps1`: PowerShell용 리뷰 트리거
- `docker-compose.yml`: 3개 컨테이너 에이전트 구성
- `.antigravity/instructions.md`: 운영 규칙
