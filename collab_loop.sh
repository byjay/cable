#!/bin/bash

# 색상 설정
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[Antigravity Orchestrator] 협업 프로세스 시작...${NC}"

# 1. 파일 변경 감지 또는 작업 완료 확인 (여기서는 수동 실행 가정)
# 안티그래비티가 작업을 완료하면 이 스크립트를 실행함

# 2. OpenCode Reviewer 호출 (비동기 분석)
# -i: 프롬프트 입력, @reviewer: 위 JSON에서 설정한 에이전트 호출
echo -e "${GREEN}[Step 1] OpenCode Reviewer에게 검토 요청 중...${NC}"
opencode -i "@reviewer 현재 프로젝트의 변경 사항을 분석하고, 잠재적 버그와 개선점을 찾아서 'REVIEW_REPORT.md' 파일에 마크다운 형식으로 작성해. /ralph-loop"

# 3. (선택) Test Sprite 등 무료 외부 도구 호출
# echo -e "${GREEN}[Step 2] Test Sprite로 테스트 실행...${NC}"
# opencode -i "테스트 스프라이트를 사용하여 현재 코드의 유닛 테스트를 실행하고 결과를 보고해."

# 4. 피드백 확인 알림
echo -e "${GREEN}[Step 3] 리뷰 완료. REVIEW_REPORT.md를 확인하세요.${NC}"
echo "---------------------------------------------------"
cat REVIEW_REPORT.md
echo "---------------------------------------------------"
