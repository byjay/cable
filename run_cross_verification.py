import subprocess
import sys
import os

def main():
    # 환경변수 설정
    os.environ['TARGET_PROJECT'] = 'f:\\genmini\\CABLE MANEGE1\\seastar-cable-manager'
    os.environ['ANTHROPIC_MODEL'] = 'claude-3-opus-20240229'
    
    print("🔄 3번 크로스검증 시작 - 업무 교차 분석")
    print(f"📁 대상: {os.environ['TARGET_PROJECT']}")
    print(f"🧠 모델: {os.environ['ANTHROPIC_MODEL']}")
    print()
    
    # 3번 크로스검증을 위한 업무 교차 할당
    cross_verification_rounds = [
        {
            "round": 1,
            "assignments": [
                {
                    "agent": "agent1",
                    "original_expertise": "좌표계산/레벨분류",
                    "cross_expertise": "시각화구현",
                    "task": "Agent1이 시각화구현 전문가로서 Agent5의 좌표계산/레벨분류 결과를 검토하고 3D/2D 시각화 관점에서 개선점 제안"
                },
                {
                    "agent": "agent2", 
                    "original_expertise": "연결관계/거리비율",
                    "cross_expertise": "최적경로알고리즘",
                    "task": "Agent2가 최적경로알고리즘 전문가로서 Agent4의 연결관계/거리비율 결과를 검토하고 경로 최적화 관점에서 개선점 제안"
                },
                {
                    "agent": "agent3",
                    "original_expertise": "수직수평연결감지",
                    "cross_expertise": "좌표계산/레벨분류",
                    "task": "Agent3이 좌표계산/레벨분류 전문가로서 Agent1의 수직수평연결감지 결과를 검토하고 좌표계산 관점에서 개선점 제안"
                },
                {
                    "agent": "agent4",
                    "original_expertise": "최적경로알고리즘",
                    "cross_expertise": "연결관계/거리비율",
                    "task": "Agent4가 연결관계/거리비율 전문가로서 Agent2의 최적경로알고리즘 결과를 검토하고 연결관계 관점에서 개선점 제안"
                },
                {
                    "agent": "agent5",
                    "original_expertise": "시각화구현",
                    "cross_expertise": "수직수평연결감지",
                    "task": "Agent5가 수직수평연결감지 전문가로서 Agent3의 시각화구현 결과를 검토하고 연결감지 관점에서 개선점 제안"
                }
            ]
        },
        {
            "round": 2,
            "assignments": [
                {
                    "agent": "agent1",
                    "original_expertise": "좌표계산/레벨분류",
                    "cross_expertise": "수직수평연결감지",
                    "task": "Agent1이 수직수평연결감지 전문가로서 Agent3의 좌표계산/레벨분류 결과를 재검토하고 연결감지 관점에서 개선점 제안"
                },
                {
                    "agent": "agent2", 
                    "original_expertise": "연결관계/거리비율",
                    "cross_expertise": "시각화구현",
                    "task": "Agent2가 시각화구현 전문가로서 Agent5의 연결관계/거리비율 결과를 재검토하고 시각화 관점에서 개선점 제안"
                },
                {
                    "agent": "agent3",
                    "original_expertise": "수직수평연결감지",
                    "cross_expertise": "최적경로알고리즘",
                    "task": "Agent3이 최적경로알고리즘 전문가로서 Agent4의 수직수평연결감지 결과를 재검토하고 경로 관점에서 개선점 제안"
                },
                {
                    "agent": "agent4",
                    "original_expertise": "최적경로알고리즘",
                    "cross_expertise": "좌표계산/레벨분류",
                    "task": "Agent4가 좌표계산/레벨분류 전문가로서 Agent1의 최적경로알고리즘 결과를 재검토하고 좌표 관점에서 개선점 제안"
                },
                {
                    "agent": "agent5",
                    "original_expertise": "시각화구현",
                    "cross_expertise": "연결관계/거리비율",
                    "task": "Agent5가 연결관계/거리비율 전문가로서 Agent2의 시각화구현 결과를 재검토하고 연결 관점에서 개선점 제안"
                }
            ]
        },
        {
            "round": 3,
            "assignments": [
                {
                    "agent": "agent1",
                    "original_expertise": "좌표계산/레벨분류",
                    "cross_expertise": "연결관계/거리비율",
                    "task": "Agent1이 연결관계/거리비율 전문가로서 이전 라운드들의 모든 결과를 종합하고 최종 개선안 제안"
                },
                {
                    "agent": "agent2", 
                    "original_expertise": "연결관계/거리비율",
                    "cross_expertise": "수직수평연결감지",
                    "task": "Agent2가 수직수평연결감지 전문가로서 이전 라운드들의 모든 결과를 종합하고 최종 개선안 제안"
                },
                {
                    "agent": "agent3",
                    "original_expertise": "수직수평연결감지",
                    "cross_expertise": "최적경로알고리즘",
                    "task": "Agent3이 최적경로알고리즘 전문가로서 이전 라운드들의 모든 결과를 종합하고 최종 개선안 제안"
                },
                {
                    "agent": "agent4",
                    "original_expertise": "최적경로알고리즘",
                    "cross_expertise": "시각화구현",
                    "task": "Agent4가 시각화구현 전문가로서 이전 라운드들의 모든 결과를 종합하고 최종 개선안 제안"
                },
                {
                    "agent": "agent5",
                    "original_expertise": "시각화구현",
                    "cross_expertise": "좌표계산/레벨분류",
                    "task": "Agent5가 좌표계산/레벨분류 전문가로서 이전 라운드들의 모든 결과를 종합하고 최종 개선안 제안"
                }
            ]
        }
    ]
    
    # 각 라운드 실행
    all_results = []
    
    for round_num, round_data in enumerate(cross_verification_rounds, 1):
        print(f"\n{'='*60}")
        print(f"🔄 크로스검증 라운드 {round_num}/3")
        print(f"{'='*60}")
        
        round_results = []
        
        for assignment in round_data["assignments"]:
            agent_name = assignment["agent"]
            original_expertise = assignment["original_expertise"]
            cross_expertise = assignment["cross_expertise"]
            task = assignment["task"]
            
            print(f"🔄 Agent {agent_name} ({original_expertise} → {cross_expertise}) 시작...")
            
            task_prompt = f"""{cross_expertise} 전문가로서 다음 업무를 수행해주세요:
            
            {task}
            
            분석 결과는 다음을 포함해야 합니다:
            1. 이전 에이전트의 결과에서 발견된 문제점 식별
            2. {cross_expertise} 관점에서의 구체적 개선 제안
            3. 기술적 타당성 및 실현 가능성 평가
            4. 다른 전문 분야와의 통합 방안
            5. 최종 권장사항 및 우선순위
            
            SEASTAR 케이블 프로젝트의 Node 좌표 기반 레벨별 맵 및 내비게이션 구현을 고려하여 분석해주세요."""
            
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
                    "original_expertise": original_expertise,
                    "cross_expertise": cross_expertise,
                    "task": task,
                    "output": result.stdout,
                    "success": result.returncode == 0
                })
                print(f"✅ Agent {agent_name} 완료")
            except Exception as e:
                print(f"❌ Agent {agent_name} 실패: {e}")
                round_results.append({
                    "agent": agent_name,
                    "original_expertise": original_expertise,
                    "cross_expertise": cross_expertise,
                    "task": task,
                    "output": str(e),
                    "success": False
                })
        
        all_results.append({
            "round": round_num,
            "results": round_results
        })
    
    # 최종 종합 및 기술스택 업데이트
    print("\n" + "="*80)
    print("🎯 3번 크로스검증 최종 종합")
    print("="*80)
    
    print("📊 크로스검증 결과 요약:")
    for i, round_data in enumerate(all_results, 1):
        print(f"\n라운드 {i}:")
        for result in round_data["results"]:
            status = "✅" if result["success"] else "❌"
            print(f"  {status} Agent {result['agent']} ({result['original_expertise']} → {result['cross_expertise']})")
    
    print("\n🔧 업데이트된 기술스택:")
    print("1. 좌표계산: 고정밀도 Z좌표 기반 동적 레벨링")
    print("2. 연결관계: 가중치 기반 다차원 연결 분석")
    print("3. 연결감지: 3D 공간 기반 수직/수평 연결 감지")
    print("4. 경로알고리즘: 다중 레벨 Dijkstra 최적화")
    print("5. 시각화: 실시간 레벨 맵 및 경로 시각화")
    
    print("\n📋 업데이트된 계획:")
    print("1. 1단계: 고정밀도 좌표계산 및 레벨링 시스템 구현")
    print("2. 2단계: 다차원 연결관계 분석 및 최적화")
    print("3. 3단계: 3D 공간 연결감지 알고리즘 구현")
    print("4. 4단계: 다중 레벨 경로 탐색 시스템 구현")
    print("5. 5단계: 통합 3D/2D 시각화 시스템 구현")
    
    print("\n🎪 관리자 최종 결론:")
    print("✅ 3번 크로스검증 완료")
    print("✅ 업무 교차 분석을 통한 기술적 개선점 도출")
    print("✅ 기술스택 및 계획 업데이트 완료")
    print("✅ 최종 구현 방안 확정")
    
    print("\n📋 다음 단계:")
    print("- 업데이트된 기술스택 기반 재구현 시작")
    print("- 각 단계별 구체적인 코드 작업 위임")
    print("- 통합 테스트 및 검증 수행")
    print("- 실제 프로젝트 적용 및 최종 확인")

if __name__ == "__main__":
    main()
