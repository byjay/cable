import subprocess
import os
import sys
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple, Any

class SmartOrchestrator:
    """지능형 작업 분배 오케스트레이터"""
    
    # 병렬 처리가 필요한 작업 키워드
    PARALLEL_KEYWORDS = [
        "검토", "리뷰", "review", "분석", "analyze", "계획", "plan",
        "설계", "design", "아키텍처", "architecture",
        "보안", "security", "취약점", "vulnerability",
        "성능", "performance", "최적화", "optimize",
        "테스트", "test", "품질", "quality",
        "풀스택", "full-stack", "전체", "complete",
        "복잡", "complex", "대규모", "large-scale",
        "크로스체크", "cross-check", "검증", "verification", "check"
    ]
    
    # 단순 작업 키워드
    SIMPLE_KEYWORDS = [
        "함수", "function", "클래스", "class",
        "간단", "simple", "작은", "small",
        "추가", "add", "수정", "fix", "변경", "change"
    ]
    
    def __init__(self, target_project=None):
        # 동적 프로젝트 경로 설정 (환경변수, 인자, 또는 현재 디렉토리)
        # 경로 정규화 및 디버깅 출력 추가
        raw_path = target_project or os.environ.get('TARGET_PROJECT') or os.environ.get('CWD') or os.getcwd()
        self.target_project = raw_path.strip() if raw_path else os.getcwd()
        
        # 디버깅 출력
        print(f"[DEBUG] Target project path set to: {self.target_project}")
        
        self.agents = ["agent1", "agent2", "agent3", "agent4", "agent5"]
        self.max_retries = 3
    
    def rotate_account(self) -> bool:
        """계정 순환"""
        print("\n[ROTATE] 🔄 Switching to next account...")
        try:
            subprocess.run(["ag", "rotate"], check=True)
            time.sleep(3)
            return True
        except:
            print("[WARNING] ag rotate failed")
            return False
    
    def call_agent(self, agent_name: str, prompt: str) -> Dict[str, Any]:
        """단일 에이전트 호출 (재시도 포함)"""
        full_prompt = prompt if "/ralph-loop" in prompt else f"{prompt} /ralph-loop"
        
        for attempt in range(self.max_retries):
            try:
                # 환경 변수 또는 직접 지정된 모델 사용
                # 대상 프로젝트에서 작업 실행 (경로에 공백 포함시 문제 해결)
                work_dir = f"cd '{self.target_project}' && " if self.target_project and self.target_project.strip() else ""
                cmd = ["docker", "exec", agent_name, "opencode", "run", f"{work_dir}{full_prompt}"]
                result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=300)
                
                # Rate limit 체크
                if "rate limit" in result.stderr.lower() or "429" in result.stderr:
                    print(f"[RATE LIMIT] {agent_name} - Rotating account...")
                    self.rotate_account()
                    continue
                
                if result.returncode == 0:
                    return {
                        "agent": agent_name,
                        "success": True,
                        "output": result.stdout,
                        "error": None
                    }
                
            except subprocess.TimeoutExpired:
                print(f"[TIMEOUT] {agent_name} - Retry {attempt + 1}/{self.max_retries}")
                continue
            except Exception as e:
                print(f"[ERROR] {agent_name}: {e}")
                continue
        
        return {
            "agent": agent_name,
            "success": False,
            "output": None,
            "error": "Max retries exceeded"
        }
    
    def analyze_complexity(self, task: str) -> bool:
        """작업 복잡도 분석 - True: 병렬 필요, False: 단독 가능"""
        task_lower = task.lower()
        
        # 병렬 키워드 체크
        parallel_score = sum(1 for kw in self.PARALLEL_KEYWORDS if kw in task_lower)
        simple_score = sum(1 for kw in self.SIMPLE_KEYWORDS if kw in task_lower)
        
        # 길이 체크 (200자 이상이면 복잡한 작업)
        length_score = 1 if len(task) > 200 else 0
        
        # 종합 판단
        needs_parallel = parallel_score > 0 or (length_score > 0 and simple_score == 0)
        
        print(f"\n[ANALYSIS] Task Complexity:")
        print(f"  Parallel keywords: {parallel_score}")
        print(f"  Simple keywords: {simple_score}")
        print(f"  Length: {len(task)} chars")
        print(f"  → Decision: {'PARALLEL' if needs_parallel else 'SINGLE'}")
        
        return needs_parallel
    
    def execute_single(self, task: str) -> Dict:
        """단순 작업 - 단일 에이전트 실행"""
        print("\n" + "="*60)
        print("  🚀 SINGLE AGENT MODE")
        print("="*60)
        
        result = self.call_agent("agent1", task)
        return result
    
    def execute_parallel(self, task: str) -> List[Dict]:
        """복잡한 작업 - 병렬 실행 (5 Agents 확장)"""
        print("\n" + "="*60)
        print("  🔥 MEGA-PARALLEL MODE (5 Agents)")
        print("="*60)
        
        # 5인 스쿼드 전문가 역할 배분
        perspectives = {
            "agent1": "[LEADER] 전체 아키텍처 및 통합 관점에서",
            "agent2": "[DESIGNER] UI/UX 및 3D ISO 비주얼 미학 관점에서 (바나나 프로 퀄리티)",
            "agent3": "[ENGINEER] 핵심 알고리즘 및 게임 물리 로직 관점에서",
            "agent4": "[SPEED] 고성능 데이터 처리 및 최적화 관점에서",
            "agent5": "[CRITIC] 보안, 예외 처리 및 최종 품질 보증 관점에서"
        }
        
        tasks = []
        for agent, perspective in perspectives.items():
            agent_task = f"{perspective} {task}"
            tasks.append((agent, agent_task))
        
        # 병렬 실행
        results = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_agent = {
                executor.submit(self.call_agent, agent, task): agent 
                for agent, task in tasks
            }
            
            for future in as_completed(future_to_agent):
                agent = future_to_agent[future]
                try:
                    result = future.result()
                    results.append(result)
                    status = "✅" if result["success"] else "❌"
                    print(f"{status} {result['agent']} completed")
                except Exception as e:
                    print(f"❌ {agent} failed: {e}")
                    results.append({
                        "agent": agent,
                        "success": False,
                        "output": None,
                        "error": str(e)
                    })
        
        return results
    
    def cross_review(self, results: List[Dict]) -> Dict:
        """크로스 리뷰 - 각 에이전트가 다른 에이전트 결과 검토"""
        print("\n" + "="*60)
        print("  🔍 CROSS REVIEW PHASE")
        print("="*60)
        
        # Agent1 → Agent2,3 결과 검토
        # Agent2 → Agent1,3 결과 검토  
        # Agent3 → Agent1,2 결과 검토
        
        review_prompt = """
다른 에이전트들의 작업 결과를 검토해주세요:

{other_results}

다음 관점에서 검토:
1. 누락된 부분이 있는가?
2. 충돌하는 내용이 있는가?
3. 개선이 필요한 부분은?
4. 통합 시 주의사항은?

검토 결과를 'CROSS_REVIEW_{agent}.md' 파일에 작성해주세요.
"""
        
        cross_reviews = []
        for i, result in enumerate(results):
            if not result["success"]:
                continue
            
            agent = result["agent"]
            other_results = [r for r in results if r["agent"] != agent and r["success"]]
            
            if not other_results:
                continue
            
            other_summary = "\n\n".join([
                f"[{r['agent']}의 결과]\n{r['output'][:500]}..."
                for r in other_results
            ])
            
            prompt = review_prompt.format(other_results=other_summary)
            review = self.call_agent(agent, prompt)
            cross_reviews.append(review)
            
            status = "✅" if review["success"] else "❌"
            print(f"{status} {agent} cross-review completed")
        
        return {"reviews": cross_reviews}
    
    def consensus(self, results: List[Dict], cross_reviews: Dict) -> Dict:
        """합의 - 최종 통합 의견 도출"""
        print("\n" + "="*60)
        print("  🤝 CONSENSUS PHASE")
        print("="*60)
        
        consensus_prompt = """
3명의 에이전트가 작업한 결과와 크로스 리뷰를 종합하여:

[원본 작업 결과]
{original_results}

[크로스 리뷰 결과]
{cross_review_summary}

다음을 수행:
1. 가장 우수한 접근 방식 선택
2. 모든 에이전트의 좋은 아이디어 통합
3. 발견된 문제점 해결
4. 최종 통합 버전 생성

최종 결과를 'CONSENSUS_RESULT.md'에 작성하고,
필요한 코드 파일들을 생성해주세요.
"""
        
        # 결과 요약
        original_summary = "\n\n".join([
            f"[{r['agent']}]\n{r['output'][:300]}..."
            for r in results if r["success"]
        ])
        
        review_summary = "\n\n".join([
            f"[Review by {r['agent']}]\n{r['output'][:300]}..."
            for r in cross_reviews.get("reviews", []) if r["success"]
        ])
        
        prompt = consensus_prompt.format(
            original_results=original_summary,
            cross_review_summary=review_summary
        )
        
        # Agent1이 최종 통합 (리더 역할)
        consensus = self.call_agent("agent1", prompt)
        
        status = "✅" if consensus["success"] else "❌"
        print(f"{status} Consensus reached")
        
        return consensus
    
    def execute(self, task: str):
        """메인 실행 로직"""
        print("\n" + "="*70)
        print("  🧠 SMART ORCHESTRATOR - Intelligent Task Distribution")
        print("="*70)
        print(f"\n[TASK] {task}\n")
        
        # 1. 복잡도 분석
        needs_parallel = self.analyze_complexity(task)
        
        if not needs_parallel:
            # 단순 작업 - 혼자 처리
            print("\n💡 Simple task detected - Using single agent")
            result = self.execute_single(task)
            
            if result["success"]:
                print("\n✅ Task completed successfully!")
            else:
                print("\n❌ Task failed!")
            
            return result
        
        else:
            # 복잡한 작업 - 병렬 처리 + 크로스체크 + 합의
            print("\n💡 Complex task detected - Using parallel mode with consensus")
            
            # Phase 1: 병렬 실행
            results = self.execute_parallel(task)
            
            # Phase 2: 크로스 리뷰
            cross_reviews = self.cross_review(results)
            
            # Phase 3: 합의 및 통합
            consensus = self.consensus(results, cross_reviews)
            
            if consensus["success"]:
                print("\n" + "="*70)
                print("  ✅ CONSENSUS REACHED - Task Completed")
                print("="*70)
                print("\n📄 Check these files:")
                print("  - CONSENSUS_RESULT.md (최종 통합 결과)")
                print("  - CROSS_REVIEW_*.md (크로스 리뷰)")
                print("  - Generated code files")
            else:
                print("\n❌ Consensus failed!")
            
            return {
                "parallel_results": results,
                "cross_reviews": cross_reviews,
                "consensus": consensus
            }

def main():
    if len(sys.argv) < 2:
        print("Usage: python smart_orchestrator.py \"<task description>\" [project_path]")
        print("\nEnvironment Variables:")
        print("  TARGET_PROJECT - Target project path")
        print("  CWD - Current working directory")
        print("\nExamples:")
        print("  Simple:  python smart_orchestrator.py \"간단한 hello 함수 만들기\"")
        print("  Complex:  python smart_orchestrator.py \"JWT 인증 시스템 전체 검토 및 보안 분석\" \"/path/to/project\"")
        print("  With ENV:  TARGET_PROJECT=/path/to/project python smart_orchestrator.py \"task\"")
        sys.exit(1)
    
    # 첫 번째 인자는 task, 나머지는 project_path로 합침
    args = sys.argv[1:]
    task_parts = []
    project_path = None
    
    for i, arg in enumerate(args):
        if i == 0 and not arg.startswith('/'):
            task_parts.append(arg)
        else:
            project_path = arg if not arg.startswith('/') else None
    
    task = ' '.join(task_parts)
    orchestrator = SmartOrchestrator(project_path)
    orchestrator.execute(task)

if __name__ == "__main__":
    main()