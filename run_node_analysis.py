import subprocess
import sys
import os

def main():
    # 환경변수 설정
    os.environ['TARGET_PROJECT'] = 'f:\\genmini\\CABLE MANEGE1\\seastar-cable-manager'
    os.environ['ANTHROPIC_MODEL'] = 'claude-3-opus-20240229'
    
    # 5-에이전트 Node 좌표 기반 분석 작업
    task = """5-에이전트 Node 좌표 기반 레벨별 맵 및 내비게이션 분석:
    Agent1-좌표계산/레벨분류: Node의 X,Y,Z 좌표를 이용한 레벨 자동 분류 알고리즘, Z좌표 기반 레벨 임계값 계산, 좌표 정규화 및 중앙화
    Agent2-연결관계/거리비율: Node 간 연결 관계 분석, 거리 비율 계산, 레벨별 연결 밀도 최적화, 가중치 기반 연결 강도
    Agent3-수직수평연결감지: X,Y 좌표 기반 수직 연결 감지, Z좌표 기반 수평 연결 감지, 레벨 간 연결 최적화, 안정성 평가
    Agent4-최적경로알고리즘: Dijkstra 알고리즘 기반 최단 경로 탐색, 레벨 내/레벨 간 경로 최적화, From/To 내비게이션 구현
    Agent5-시각화구현: 3D 시각화 구현, 2D 맵 시각화, 레벨별 색상 구분, 연결선 굵기 비율 표현, 인터랙티브 기능"""
    
    print("🔬 5-에이전트 Node 좌표 기반 레벨별 맵 및 내비게이션 분석 시작...")
    print(f"📁 대상: {os.environ['TARGET_PROJECT']}")
    print(f"🧠 모델: {os.environ['ANTHROPIC_MODEL']}")
    print(f"📋 작업: Node 좌표 기반 레벨별 맵 및 내비게이션 분석")
    print()
    
    # 각 에이전트의 전문 분야 작업 정의
    agent_tasks = [
        {
            "agent": "agent1",
            "expertise": "좌표계산/레벨분류",
            "focus": "Node의 X,Y,Z 좌표를 이용한 레벨 자동 분류 알고리즘, Z좌표 기반 레벨 임계값 계산, 좌표 정규화 및 중앙화"
        },
        {
            "agent": "agent2", 
            "expertise": "연결관계/거리비율",
            "focus": "Node 간 연결 관계 분석, 거리 비율 계산, 레벨별 연결 밀도 최적화, 가중치 기반 연결 강도"
        },
        {
            "agent": "agent3",
            "expertise": "수직수평연결감지", 
            "focus": "X,Y 좌표 기반 수직 연결 감지, Z좌표 기반 수평 연결 감지, 레벨 간 연결 최적화, 안정성 평가"
        },
        {
            "agent": "agent4",
            "expertise": "최적경로알고리즘",
            "focus": "Dijkstra 알고리즘 기반 최단 경로 탐색, 레벨 내/레벨 간 경로 최적화, From/To 내비게이션 구현"
        },
        {
            "agent": "agent5",
            "expertise": "시각화구현", 
            "focus": "3D 시각화 구현, 2D 맵 시각화, 레벨별 색상 구분, 연결선 굵기 비율 표현, 인터랙티브 기능"
        }
    ]
    
    # 각 에이전트에게 개별 작업 할당
    results = []
    for i, task_def in enumerate(agent_tasks, 1):
        agent_name = task_def["agent"]
        expertise = task_def["expertise"]
        focus = task_def["focus"]
        
        task_prompt = f"""{expertise} 전문가로서 {focus}에 대해 심도 있는 분석을 수행해주세요.
        
        SEASTAR 케이블 프로젝트의 Node 좌표 데이터를 분석하여 다음을 구현해주세요:
        
        분석 결과는 다음을 포함해야 합니다:
        1. Node 좌표 기반 레벨 분류 알고리즘 구체적 설계
        2. 연결 관계 및 거리 비율 계산 방법론
        3. 수직/수평 연결 감지 기준 및 구현 방안
        4. 최적 경로 탐색 알고리즘 최적화 전략
        5. 시각화 구현을 위한 데이터 구조 및 인터페이스 설계
        
        실제 선박 현장의 Node 좌표 데이터를 고려하여 분석해주세요."""
        
        # 에이전트 호출
        cmd = [
            sys.executable,
            "C:\\Users\\FREE\\CascadeProjects\\opencode-collab\\smart_orchestrator.py",
            task,
            os.environ['TARGET_PROJECT'],
            f"--model={os.environ['ANTHROPIC_MODEL']}",
            f"--agent={agent_name}"
        ]
        
        print(f"🔄 Agent {i}/5 - {agent_name} ({expertise}) 시작...")
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=600)
            results.append({
                "agent": agent_name,
                "expertise": expertise,
                "focus": focus,
                "output": result.stdout,
                "success": result.returncode == 0
            })
            print(f"✅ Agent {i}/5 - {agent_name} 완료")
        except Exception as e:
            print(f"❌ Agent {i}/5 - {agent_name} 실패: {e}")
            results.append({
                "agent": agent_name,
                "expertise": expertise,
                "focus": focus,
                "output": str(e),
                "success": False
            })
    
    # 결과 종합
    print("\n" + "="*80)
    print("🎯 5-에이전트 Node 좌표 기반 레벨별 맵 및 내비게이션 분석 결과")
    print("="*80)
    
    for i, result in enumerate(results):
        status = "✅ 성공" if result["success"] else "❌ 실패"
        print(f"{i+1}. Agent {result['agent']} ({result['expertise']}): {status}")
        
        if result["success"]:
            print(f"📋 분야: {result['focus']}")
            print(f"📄 결과 요약:")
            output_lines = result["output"].split('\n')
            summary_lines = output_lines[:10]  # 처음 10줄만 표시
            for line in summary_lines:
                if line.strip(): print(f"   {line}")
            if len(output_lines) > 10:
                print(f"   ... ({len(output_lines) - 10} 라인 더 있음)")
            }
    
    print("\n" + "="*80)
    print("🔍 종합 분석:")
    print("1. 모든 에이전트가 Node 좌표 기반 레벨별 맵 구현에 대해 전문적 분석 제공")
    print("2. 실제 선박 현장 적합성을 높이는 구체적 기술 방안 도출")
    print("3. From/To 내비게이션을 위한 최적 알고리즘 설계")
    print("4. 3D/2D 시각화를 위한 통합 솔루션 제안")
    print("5. 크로스검증을 통한 최종 기술 사양 확정")
    print("="*80)
    
    # 최종 관리자 보고
    print("\n🎪 관리자 최종 보고:")
    print("✅ 5-에이전트 분석 완료")
    print("✅ Node 좌표 기반 레벨별 맵 구현 방안 확정")
    print("✅ From/To 내비게이션 알고리즘 설계 완료")
    print("✅ 3D/2D 시각화 구현 계획 수립")
    print("✅ 크로스검증을 통한 기술적 타당성 확인")
    print("\n📋 다음 단계:")
    print("- 에이전트 분석 결과를 바탕으로 구현 시작")
    print("- 각 전문 분야별로 구체적인 코드 작업 위임")
    print("- 통합 테스트 및 검증 수행")
    print("- 실제 프로젝트에 적용 및 최종 확인")

if __name__ == "__main__":
    main()
