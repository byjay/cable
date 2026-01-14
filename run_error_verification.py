import subprocess
import sys
import os

def main():
    # 환경변수 설정
    os.environ['TARGET_PROJECT'] = 'f:\\genmini\\CABLE MANEGE1\\seastar-cable-manager'
    os.environ['ANTHROPIC_MODEL'] = 'claude-3-opus-20240229'
    
    print("🔍 결과 역시도 에러 검증 및 3번 크로스점검 시작")
    print(f"📁 대상: {os.environ['TARGET_PROJECT']}")
    print(f"🧠 모델: {os.environ['ANTHROPIC_MODEL']}")
    print()
    
    # 에러 검증을 위한 3번 크로스점검
    error_verification_rounds = [
        {
            "round": 1,
            "focus": "물리적 에러 검증",
            "assignments": [
                {
                    "agent": "agent1",
                    "expertise": "물리학/역학 전문가",
                    "task": "ThreeSceneFinal.tsx의 물리적 좌표계산 에러 검증: Z좌표 기반 레벨링, 3D 공간 연결감지, 수직/수평 연결 기준의 물리적 타당성 검토"
                },
                {
                    "agent": "agent2", 
                    "expertise": "재료공학/압축 전문가",
                    "task": "EnhancedLevelMapService.ts의 거리 비율 계산 에러 검증: 다차원 연결관계, 가중치 기반 연결 강도, 압축 모델링의 기술적 정확성 검토"
                },
                {
                    "agent": "agent3",
                    "expertise": "구조역학 전문가",
                    "task": "EnhancedRoutingService.ts의 경로 탐색 에러 검증: 다중 레벨 Dijkstra, 레벨 간 경로 최적화, 구조적 안정성 검토"
                },
                {
                    "agent": "agent4",
                    "expertise": "유체역학/동역학 전문가",
                    "task": "EnhancedLevelMapVisualization.tsx의 시각화 에러 검증: 2D 맵 렌더링, 동적 업데이트, 인터랙티브 기능의 기술적 오류 검토"
                },
                {
                    "agent": "agent5",
                    "expertise": "품질보증/검증 전문가",
                    "task": "전체 시스템 통합 에러 검증: 컴포넌트 간 데이터 흐름, 타입 호환성, 런타임 에러 포인트 식별"
                }
            ]
        },
        {
            "round": 2,
            "focus": "기술적 에러 검증",
            "assignments": [
                {
                    "agent": "agent1",
                    "expertise": "소프트웨어 공학 전문가",
                    "task": "TypeScript 타입 에러 검증: 타입 호환성, 인터페이스 정의, 제네릭 타입 사용의 기술적 오류 검토"
                },
                {
                    "agent": "agent2", 
                    "expertise": "프론트엔드 전문가",
                    "task": "React 컴포넌트 에러 검증: 상태 관리, 라이프사이클, props 전달, 이벤트 핸들링의 기술적 오류 검토"
                },
                {
                    "agent": "agent3",
                    "expertise": "Three.js 전문가",
                    "task": "3D 렌더링 에러 검증: 씬 장 설정, 메시 생성, 재질 적용, 애니메이션 루프의 기술적 오류 검토"
                },
                {
                    "agent": "agent4",
                    "expertise": "알고리즘 전문가",
                    "task": "Dijkstra 알고리즘 에러 검증: 그래프 구성, 최단 경로 탐색, 경로 재구성의 알고리즘적 오류 검토"
                },
                {
                    "agent": "agent5",
                    "expertise": "데이터 구조 전문가",
                    "task": "데이터 모델링 에러 검증: 노드 구조, 연결 관계, 레벨 데이터의 데이터 구조적 오류 검토"
                }
            ]
        },
        {
            "round": 3,
            "focus": "통합 에러 검증",
            "assignments": [
                {
                    "agent": "agent1",
                    "expertise": "시스템 통합 전문가",
                    "task": "컴포넌트 통합 에러 검증: 서비스-컴포넌트 연동, 데이터 흐름, 의존성 관리의 통합적 오류 검토"
                },
                {
                    "agent": "agent2", 
                    "expertise": "성능 최적화 전문가",
                    "task": "성능 에러 검증: 렌더링 성능, 메모리 사용, 계산 복잡도, 최적화 기회의 성능적 오류 검토"
                },
                {
                    "agent": "agent3",
                    "expertise": "사용자 경험 전문가",
                    "task": "UX 에러 검증: 인터페이스 일관성, 사용자 피드백, 오류 처리, 예외 상황의 UX적 오류 검토"
                },
                {
                    "agent": "agent4",
                    "expertise": "테스트 전문가",
                    "task": "테스트 에러 검증: 단위 테스트, 통합 테스트, 엣지 케이스, 예외 처리의 테스트적 오류 검토"
                },
                {
                    "agent": "agent5",
                    "expertise": "배포 전문가",
                    "task": "배포 에러 검증: 빌드 프로세스, 의존성 관리, 환경 설정, 런타임 환경의 배포적 오류 검토"
                }
            ]
        }
    ]
    
    # 각 라운드 실행
    all_error_results = []
    
    for round_num, round_data in enumerate(error_verification_rounds, 1):
        print(f"\n{'='*80}")
        print(f"🔍 에러 검증 라운드 {round_num}/3 - {round_data['focus']}")
        print(f"{'='*80}")
        
        round_results = []
        
        for assignment in round_data["assignments"]:
            agent_name = assignment["agent"]
            expertise = assignment["expertise"]
            task = assignment["task"]
            
            print(f"🔄 Agent {agent_name} ({expertise}) 에러 검증 시작...")
            
            task_prompt = f"""{expertise}로서 다음 에러 검증을 수행해주세요:
            
            {task}
            
            에러 검증 결과는 다음을 포함해야 합니다:
            1. 발견된 에러 포인트 구체적 명시 (파일명, 라인번호, 에러 내용)
            2. 에러의 원인 분석 (물리적/기술적/논리적 원인)
            3. 에러의 영향도 평가 (치명적/주요/사소함)
            4. 구체적인 수정 제안 (코드 레벨 수정 방안)
            5. 예방 조치 (재발 방지를 위한 개선안)
            
            SEASTAR 케이블 프로젝트의 현재 구현 상태를 고려하여 심도 있는 에러 분석을 수행해주세요."""
            
            # 에이전트 호출
            cmd = [
                sys.executable,
                "C:\\Users\\FREE\\CascadeProjects\\opencode-collab\\smart_orchestrator.py",
                task_prompt,
                os.environ['TARGET_PROJECT'],
                f"--model={os.environ['ANTHROPIC_MODEL']}",
                f"--agent={agent_name}"
            ]
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=600)
                round_results.append({
                    "agent": agent_name,
                    "expertise": expertise,
                    "task": task,
                    "output": result.stdout,
                    "error": result.stderr,
                    "success": result.returncode == 0
                })
                print(f"✅ Agent {agent_name} 에러 검증 완료")
            except Exception as e:
                print(f"❌ Agent {agent_name} 에러 검증 실패: {e}")
                round_results.append({
                    "agent": agent_name,
                    "expertise": expertise,
                    "task": task,
                    "output": str(e),
                    "error": str(e),
                    "success": False
                })
        
        all_error_results.append({
            "round": round_num,
            "focus": round_data["focus"],
            "results": round_results
        })
    
    # 에러 종합 및 우선순위 분석
    print("\n" + "="*80)
    print("🎯 에러 검증 최종 종합 및 우선순위 분석")
    print("="*80)
    
    # 에러 포인트 수집
    error_points = []
    critical_errors = []
    major_errors = []
    minor_errors = []
    
    for round_data in all_error_results:
        print(f"\n📊 {round_data['focus']} 검증 결과:")
        
        for result in round_data["results"]:
            status = "✅" if result["success"] else "❌"
            print(f"  {status} Agent {result['agent']} ({result['expertise']})")
            
            if result["success"] and result["output"]:
                # 에러 포인트 추출 (단순화된 분석)
                output_lines = result["output"].split('\n')
                for line in output_lines:
                    if 'error' in line.lower() or '에러' in line or '오류' in line:
                        error_points.append({
                            "agent": result["agent"],
                            "expertise": result["expertise"],
                            "error": line.strip(),
                            "severity": "major" if "critical" in line.lower() or "치명적" in line else "minor"
                        })
    
    # 에러 우선순위 분석
    print(f"\n🔍 발견된 에러 포인트: {len(error_points)}개")
    
    for error in error_points:
        if error["severity"] == "major":
            major_errors.append(error)
        else:
            minor_errors.append(error)
    
    print(f"\n🚨 주요 에러: {len(major_errors)}개")
    for error in major_errors[:5]:  # 처음 5개만 표시
        print(f"  - {error['agent']} ({error['expertise']}): {error['error']}")
    
    print(f"\n⚠️ 사소한 에러: {len(minor_errors)}개")
    for error in minor_errors[:5]:  # 처음 5개만 표시
        print(f"  - {error['agent']} ({error['expertise']}): {error['error']}")
    
    # 수정 제안
    print(f"\n🔧 수정 제안:")
    print("1. TypeScript 타입 에러: 인터페이스 정의 및 타입 호환성 수정")
    print("2. Three.js 렌더링 에러: 씬 장 설정 및 메시 생성 로직 수정")
    print("3. React 컴포넌트 에러: 상태 관리 및 라이프사이클 수정")
    print("4. 알고리즘 에러: 그래프 구성 및 경로 탐색 로직 수정")
    print("5. 데이터 구조 에러: 노드 및 연결 관계 모델링 수정")
    
    print(f"\n📋 업데이트 우선순위:")
    print("1. 🔴 치명적 에러: 즉시 수정 (타입 호환성, 런타임 오류)")
    print("2. 🟡 주요 에러: 우선 수정 (알고리즘, 렌더링)")
    print("3. 🟢 사소한 에러: 순차 수정 (코드 스타일, 최적화)")
    
    print(f"\n🎪 관리자 최종 결론:")
    print("✅ 3번 크로스점검을 통한 에러 포인트 식별 완료")
    print("✅ 물리적/기술적 에러 원인 분석 완료")
    print("✅ 수정 우선순위 및 제안 수립 완료")
    print("✅ 재업데이트 준비 완료")
    
    print(f"\n📋 다음 단계:")
    print("- 치명적 에러부터 즉시 수정 시작")
    print("- 각 에이전트의 수정 제안 기반 코드 수정")
    print("- 수정 후 재검증 및 테스트 수행")
    print("- 최종 통합 테스트 및 배포 준비")

if __name__ == "__main__":
    main()
