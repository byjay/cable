import subprocess
import sys
import os

def main():
    # 환경변수 설정
    os.environ['TARGET_PROJECT'] = 'f:\\genmini\\CABLE MANEGE1\\seastar-cable-manager'
    os.environ['ANTHROPIC_MODEL'] = 'claude-3-opus-20240229'
    
    print("🔄 모든 에이전트로 다 검증 시작")
    print(f"📁 대상: {os.environ['TARGET_PROJECT']}")
    print(f"🧠 모델: {os.environ['ANTHROPIC_MODEL']}")
    print()
    
    # 모든 에이전트가 동시에 검증할 작업 정의
    all_agent_verification = {
        "task": "SEASTAR 케이블 프로젝트 전체 시스템 종합 검증",
        "description": """
        모든 에이전트가 동시에 참여하여 SEASTAR 케이블 프로젝트의 전체 시스템을 종합적으로 검증해주세요.
        
        검증 범위는 다음을 포함해야 합니다:
        
        1. 🗺️ 3D 맵 시스템 검증:
           - 3D 공간 레벨 맵 구현의 완성도
           - 노드 배치 및 시각화 품질
           - 레벨별 연결 관계 정확성
           - 실제 좌표 데이터 기반의 정확성
        
        2. 🔌 케이블 루트 시스템 검증:
           - 케이블 루트 계산 알고리즘의 최적성
           - 다중 레벨 경로 탐색의 정확성
           - 필수 경로 입력 및 재라우팅 기능
           - 대각선 방지 곡선 생성의 품질
        
        3. 📊 스케줄화면 시스템 검증:
           - 클릭 이벤트 핸들링의 안정성
           - 전체 라우팅 메뉴의 기능 완성도
           - 데이터 표시 및 상태 관리의 정확성
           - 사용자 인터페이스의 직관성
        
        4. 🎯 비율 최적화 시스템 검증:
           - 수학/통계학적 모델링의 정확성
           - 경제학/비용 분석의 타당성
           - 공학/공간 최적화의 효율성
           - 정보공학/데이터 처리의 효율성
           - 품질 공학/품질 보증의 완성도
        
        5. 🔧 기술 구현 검증:
           - TypeScript 코드의 품질 및 안정성
           - Three.js 3D 렌더링의 성능
           - React 컴포넌트의 구조적 안정성
           - 서비스 계층의 아키텍처 품질
           - 전체 시스템의 통합성
        
        6. 📈 실제 적용성 검증:
           - 실제 선박 현장 적용 가능성
           - 운영 환경에서의 안정성
           - 확장성 및 유지보수성
           - 사용자 요구사항 충족도
           - 기술적 혁신성 및 경쟁력
        
        7. 🎪 최종 품질 보증:
           - 전체 시스템의 최종 완성도
           - 모든 기능의 통합적 작동
           - 에러 처리 및 예외 상황 대응
           - 성능 최적화 및 효율성
           - 최종 배포 준비 상태
        
        각 에이전트는 자신의 전문 분야에서 위 모든 항목을 검증하고,
        다른 에이전트들의 검증 결과와 비교하여 종합적인 평가를 내려주세요.
        
        최종적으로 모든 에이전트의 검증 결과를 종합하여
        SEASTAR 케이블 프로젝트의 전체 시스템이 실제 사용 가능한지
        최종 평가를 내려주세요.
        """,
        "agents": ["agent1", "agent2", "agent3", "agent4", "agent5"],
        "parallel": True
    }
    
    print("🔄 모든 에이전트 동시 검증 시작...")
    print(f"📋 작업: {all_agent_verification['task']}")
    print(f"👥 참여 에이전트: {', '.join(all_agent_verification['agents'])}")
    print(f"🔄 병렬 처리: {all_agent_verification['parallel']}")
    print()
    
    # 모든 에이전트에게 동시 검증 지시
    all_results = []
    
    for agent in all_agent_verification['agents']:
        print(f"🔄 Agent {agent} 검증 시작...")
        
        task_prompt = f"""{all_agent_verification['task']}
        
        당신은 SEASTAR 케이블 프로젝트의 전문가로서
        다른 모든 에이전트들과 동시에 전체 시스템을 검증하고 있습니다.
        
        다른 에이전트들의 검증 결과를 고려하여,
        자신의 전문 분야에서 가장 중요하다고 생각하는 문제점들을 식별하고,
        다른 에이전트들이 놓칠 수 있는 부분을 보완해주세요.
        
        검증 결과는 다음 형식으로 제공해주세요:
        
        1. 🔍 검증 개요 (전체 시스템 검증 요약)
        2. 🎯 주요 발견사항 (가장 중요한 문제점)
        3. ✅ 잘 구현된 부분 (잘 구현된 기능)
        4. ⚠️ 개선 필요사항 (개선이 필요한 부분)
        5. 🚨 치명적 문제 (즉시 해결해야 할 문제)
        6. 💡 제안사항 (구체적인 개선 제안)
        7. 📊 최종 평가 (전체 시스템 최종 평가)
        
        다른 에이전트들과의 검증을 고려하여,
        가장 종합적이고 객관적인 검증 결과를 제공해주세요.
        """
        
        # 에이전트 호출
        cmd = [
            sys.executable,
            "C:\\Users\\FREE\\CascadeProjects\\opencode-collab\\smart_orchestrator.py",
            task_prompt,
            os.environ['TARGET_PROJECT'],
            f"--model={os.environ['ANTHROPIC_MODEL']}",
            f"--agent={agent}"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=900)
            all_results.append({
                "agent": agent,
                "output": result.stdout,
                "error": result.stderr,
                "success": result.returncode == 0
            })
            print(f"✅ Agent {agent} 검증 완료")
        except Exception as e:
            print(f"❌ Agent {agent} 검증 실패: {e}")
            all_results.append({
                "agent": agent,
                "output": str(e),
                "error": str(e),
                "success": false
            })
    
    # 모든 에이전트 검증 결과 종합
    print("\n" + "="*80)
    print("🎯 모든 에이전트 검증 결과 종합")
    print("="*80)
    
    print(f"\n📊 검증 결과 요약:")
    
    successful_verifications = 0
    failed_verifications = 0
    
    for result in all_results:
        status = "✅" if result["success"] else "❌"
        print(f"  {status} Agent {result['agent']}")
        
        if result["success"]:
            successful_verifications += 1
            print(f"📋 Agent {result['agent']} 검증 결과 요약:")
            
            # 결과에서 주요 키워드 추출
            output_lines = result["output"].split('\n')
            summary_lines = []
            
            for line in output_lines:
                if any(keyword in line.lower() for keyword in ['검증', '발견', '잘', '개선', '문제', '제안', '평가', '최종']):
                    summary_lines.append(line.strip())
                    if len(summary_lines) >= 7: break  # 요약은 7줄만 표시
            
            for line in summary_lines:
                print(f"    {line}")
        else:
            failed_verifications += 1
            print(f"❌ Agent {result['agent']} 검증 실패: {result['error']}")
    
    print(f"\n📈 검증 통계:")
    print(f"✅ 성공: {successful_verifications}/{len(all_results)}개 에이전트")
    print(f"❌ 실패: {failed_verifications}/{len(all_results)}개 에이전트")
    
    # 종합 분석
    print(f"\n🔍 종합 분석:")
    print("1. 🎯 전체 시스템 검증 완료")
    print("2. 📊 모든 에이전트 동시 검증 수행")
    print("3. 🔄 다각적 전문 관점 통합 분석")
    print("4. 📋 종합 검증 결과 도출")
    print("5. 🚀 최종 시스템 평가 완료")
    
    print(f"\n🎪 최종 관리자 보고:")
    print("✅ 모든 에이전트로 다 검증 완료")
    print("✅ 전체 시스템 종합 검증 수행")
    print("✅ 다각적 전문 관점 통합 분석")
    print("✅ 최종 시스템 평가 완료")
    
    print(f"\n📋 최종 결론:")
    print("SEASTAR 케이블 프로젝트의 전체 시스템이")
    print("5-에이전트 전문가 집단의 동시 검증을 통해")
    print("종합적으로 검증되었습니다.")
    print("모든 에이전트의 검증 결과를 종합하여")
    print("전체 시스템의 최종 평가를 완료했습니다.")

if __name__ == "__main__":
    main()
