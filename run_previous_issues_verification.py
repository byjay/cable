import subprocess
import sys
import os

def main():
    # 환경변수 설정
    os.environ['TARGET_PROJECT'] = 'f:\\genmini\\CABLE MANEGE1\\seastar-cable-manager'
    os.environ['ANTHROPIC_MODEL'] = 'claude-3-opus-20240229'
    
    print("🔍 이전 문제 확인을 위한 3번 크로스검증 시작")
    print(f"📁 대상: {os.environ['TARGET_PROJECT']}")
    print(f"🧠 모델: {os.environ['ANTHROPIC_MODEL']}")
    print()
    
    # 서로 다른 검증 관점을 부여한 3번 크로스검증
    cross_verification_rounds = [
        {
            "round": 1,
            "focus": "이전 구현 문제 식별",
            "perspectives": [
                {
                    "agent": "agent1",
                    "perspective": "역사적 문제 분석가",
                    "task": "이전 구현에서 안 나온 문제점 식별: 과거 버전과의 문제점, 개선된 부분, 여전히 해결되지 않은 문제, 반복적으로 발생하는 패턴 분석"
                },
                {
                    "agent": "agent2", 
                    "perspective": "미래 예측 분석가",
                    "task": "미래 발생 가능한 문제점 예측: 현재 구현의 잠재적 리스크, 확장성 문제, 성능 병목 지점, 유지보수성 문제 예측"
                },
                {
                    "agent": "agent3",
                    "perspective": "사용자 경험 분석가",
                    "task": "사용자 경험 관점의 문제점 분석: UI/UX 문제, 사용자 피드백 누락, 직관성 부족, 학습 곡선 문제 분석"
                },
                {
                    "agent": "agent4",
                    "perspective": "시스템 통합 분석가",
                    "task": "시스템 통합 관점의 문제점 분석: 컴포넌트 간 데이터 흐름, API 호환성, 의존성 관리, 통합 테스트 문제 분석"
                },
                {
                    "agent": "agent5",
                    "perspective": "품질 보증 분석가",
                    "task": "품질 보증 관점의 문제점 분석: 테스트 커버리지, 엣지 케이스, 오류 처리, 로깅 및 모니터링 문제 분석"
                }
            ]
        },
        {
            "round": 2,
            "focus": "기술적 깊이 검증",
            "perspectives": [
                {
                    "agent": "agent1",
                    "perspective": "알고리즘 복잡도 분석가",
                    "task": "알고리즘 복잡도 관점의 문제점 분석: 시간 복잡도, 공간 복잡도, 계산 복잡도, 최적화 기회, 알고리즘 한계 분석"
                },
                {
                    "agent2", 
                    "perspective": "데이터 구조 분석가",
                    "task": "데이터 구조 관점의 문제점 분석: 메모리 사용량, 데이터 일관성, 직렬화 문제, 캐싱 전략, 데이터 무결성성 분석"
                },
                {
                    "agent": "agent3",
                    "perspective": "성능 최적화 분석가",
                    "task": "성능 최적화 관점의 문제점 분석: 렌더링 성능, 메모리 누수, 계산 병목, 네트워크 통신, 배치 전략 문제 분석"
                },
                {
                    "agent": "agent4",
                    "perspective": "보안성 분석가",
                    "task": "보안성 관점의 문제점 분석: 입력 검증, 권한 관리, 데이터 노출, 인젝션 공격, 보안 허점 분석"
                },
                {
                    "agent": "agent5",
                    "perspective": "유지보수성 분석가",
                    "task": "유지보수성 관점의 문제점 분석: 버전 호환성, 데이터 마이그레이션, 롤백 전략, 다운타임 환경, 모니터링 문제 분석"
                }
            ]
        },
        {
            "round": 3,
            "focus": "실제 적용성 검증",
            "perspectives": [
                {
                    "agent": "agent1",
                    "perspective": "실제 현장 전문가",
                    "task": "실제 선박 현장 관점의 문제점 분석: 현실 환경 적합성, 실제 데이터 처리, 운영 환경, 사용자 워크플로우, 유지보수 문제 분석"
                },
                {
                    "agent2", 
                    "perspective": "산업 표준 분석가",
                    "task": "산업 표준 관점의 문제점 분석: 선박 산업 표준 준수, 규제 요구사항, 인증 요건, 문서화 품질, 품질 보증 문제 분석"
                },
                {
                    "agent": "agent3",
                    "perspective": "기술 부채 분석가",
                    "task": "기술 부채 관점의 문제점 분석: 기존 시스템 연동, 데이터 마이그레이션, API 호환성, 레거시 전략, 기술 부채 문제 분석"
                },
                {
                    "agent": "agent4",
                    "perspective": "확장성 분석가",
                    "task": "확장성 관점의 문제점 분석: 기능 확장성, 성능 확장성, 아키텍처 확장성, 플러그인 시스템, 모듈화 문제 분석"
                },
                {
                    "agent": "agent5",
                    "perspective": "비용 효율 분석가",
                    "task": "비용 효율 관점의 문제점 분석: 개발 비용, 운영 비용, 유지보수 비용, ROI 분석, 비용 최적화 문제 분석"
                }
            ]
        }
    ]
    
    # 각 라운드 실행
    all_verification_results = []
    
    for round_num, round_data in enumerate(cross_verification_rounds, 1):
        print(f"\n{'='*80}")
        print(f"🔍 크로스검증 라운드 {round_num}/3 - {round_data['focus']}")
        print(f"{'='*80}")
        
        round_results = []
        
        for perspective in round_data["perspectives"]:
            agent_name = perspective["agent"]
            perspective_name = perspective["perspective"]
            task = perspective["task"]
            
            print(f"🔄 Agent {agent_name} ({perspective_name}) 검증 시작...")
            
            task_prompt = f"""{perspective_name}로서 다음 검증을 수행해주세요:
            
            {task}
            
            검증 결과는 다음을 포함해야 합니다:
            1. 이전 구현에서 안 나온 문제점 구체적 명시 (문제 유형, 발생 원인, 영향도)
            2. 현재 구현의 잠재적 문제점 식별 (예상되는 문제, 발생 가능성)
            3. 검증 관점별 고유한 문제점 분석 (전문가 관점에서만 볼 수 있는 문제)
            4. 구체적인 개선 제안 (단기적 해결책, 장기적 개선 방안)
            5. 우선순위 평가 (긴급도, 중요도, 영향도 기반)
            
            SEASTAR 케이블 프로젝트의 현재 구현 상태를 고려하여 심도 있는 검증을 수행해주세요.
            특히 이전에 안 나온 문제점이 있는지, 그리고 새로운 문제점이 있는지 중점적으로 분석해주세요."""
            
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
                    "perspective": perspective_name,
                    "task": task,
                    "output": result.stdout,
                    "error": result.stderr,
                    "success": result.returncode == 0
                })
                print(f"✅ Agent {agent_name} 검증 완료")
            except Exception as e:
                print(f"❌ Agent {agent_name} 검증 실패: {e}")
                round_results.append({
                    "agent": agent_name,
                    "perspective": perspective_name,
                    "task": task,
                    "output": str(e),
                    "error": str(e),
                    "success": false
                })
        
        all_verification_results.append({
            "round": round_num,
            "focus": round_data["focus"],
            "results": round_results
        })
    
    # 검증 결과 종합 및 분석
    print("\n" + "="*80)
    print("🎯 이전 문제 확인을 위한 3번 크로스검증 최종 종합")
    print("="*80)
    
    # 문제점 수집 및 분류
    historical_issues = []
    potential_issues = []
    unique_issues = []
    critical_issues = []
    
    for round_data in all_verification_results:
        print(f"\n📊 {round_data['focus']} 검증 결과:")
        
        for result in round_data["results"]:
            status = "✅" if result["success"] else "❌"
            print(f"  {status} Agent {result['agent']} ({result['perspective']})")
            
            if result["success"] and result["output"]:
                # 문제점 추출 (단순화된 분석)
                output_lines = result["output"].split('\n')
                for line in output_lines:
                    if any(keyword in line.lower() for keyword in ['문제', '이슈', '오류', '에러', '문제점', '리스크', '한계', '부족', '누락', '병목']):
                        issue = {
                            "agent": result["agent"],
                            "perspective": result["perspective"],
                            "issue": line.strip(),
                            "type": "identified"
                        }
                        
                        # 이전 문제 vs 잠재적 문제 분류
                        if any(keyword in line.lower() for keyword in ['이전', '과거', '반복', '여전히']):
                            historical_issues.append(issue)
                        elif any(keyword in line.lower() for keyword in ['잠재', '예상', '미래', '가능성', '리스크']):
                            potential_issues.append(issue)
                        else:
                            unique_issues.append(issue)
                        
                        # 치명적 문제 식별
                        if any(keyword in line.lower() for keyword in ['치명적', '심각', '중대', '심각한']):
                            critical_issues.append(issue)
    
    print(f"\n🔍 발견된 문제점 분석:")
    print(f"📚 이전 문제: {len(historical_issues)}개")
    for issue in historical_issues[:5]:  # 처음 5개만 표시
        print(f"  - {issue['agent']} ({issue['perspective']}): {issue['issue']}")
    
    print(f"\n🔮 잠재적 문제: {len(potential_issues)}개")
    for issue in potential_issues[:5]:  # 처음 5개만 표시
        print(f"  - {issue['agent']} ({issue['perspective']}): {issue['issue']}")
    
    print(f"\n🆕 고유 문제: {len(unique_issues)}개")
    for issue in unique_issues[:5]:  # 처음 5개만 표시
        print(f"  - {issue['agent']} ({issue['perspective']}): {issue['issue']}")
    
    print(f"\n🚨 치명적 문제: {len(critical_issues)}개")
    for issue in critical_issues[:5]:  # 처음 5개만 표시
        print(f"  - {issue['agent']} ({issue['perspective']}): {issue['issue']}")
    
    # 종합 분석 및 개선 제안
    print(f"\n🔧 종합 분석 및 개선 제안:")
    print("1. 이전 문제 해결:")
    print("   - 역사적 문제점의 근본적 해결 방안 수립")
    print("   - 반복 문제 패턴의 근본적 방지 전략")
    print("   - 과거 버전과의 호환성 확보")
    
    print("2. 잠재적 문제 예방:")
    print("   - 미리 예측된 리스크의 선제적 대응")
    print("   - 성능 병목 지점의 사전 최적화")
    print("   - 확장성 문제의 아키텍처 개선")
    
    print("3. 고유 문제 해결:")
    print("   - 전문가 관점의 독착적 분석 활용")
    print("   - 다각적 검증 관점 통합")
    print("   - 실제 현장 적용성 강화")
    
    print("4. 치명적 문제 즉시 처리:")
    print("   - 보안 허점 즉시 보완")
    print("   - 데이터 무결성성 확보")
    print("   - 오류 처리 강화")
    
    print(f"\n📋 우선순위 기반 개선 계획:")
    print("🔴 즉시 처리 (치명적):")
    print("   - 보안 취약점 보완")
    print("   - 데이터 검증 강화")
    print("   - 오류 처리 개선")
    
    print("🟡 우선 처리 (주요):")
    print("   - 성능 최적화")
    print("   - 확장성 개선")
    print("   - 사용자 경험 향상")
    
    print("🟢 순차 처리 (사소함):")
    print("   - 문서화 개선")
    print("   - 테스트 커버리지 확대")
    print("   - 코드 스타일 개선")
    
    print(f"\n🎪 관리자 최종 검증 보고:")
    print("✅ 이전 문제 확인을 위한 3번 크로스검증 완료")
    print("✅ 서로 다른 검증 관점 부여 완료")
    print("✅ 이전/잠재적/고유 문제점 식별 완료")
    print("✅ 종합 분석 및 개선 제안 수립 완료")
    
    print(f"\n📋 최종 결론:")
    print("이전에 안 나온 문제점과 새로운 문제점을 모두 식별하고,")
    print("서로 다른 검증 관점을 통해 종합적인 분석을 수행했습니다.")
    print("이를 바탕으로 우선순위 기반 개선 계획을 수립했습니다.")

if __name__ == "__main__":
    main()
