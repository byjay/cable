import subprocess
import sys
import os
import time
import json
from typing import List, Dict, Any, Optional

class TaskVerificationPipeline:
    """태스크 완료 후 자동 검증 및 푸시 파이프라인"""
    
    def __init__(self, target_project: str, model: str = "claude-3-opus-20240229"):
        self.target_project = target_project
        self.model = model
        self.agents = ["agent1", "agent2", "agent3", "agent4", "agent5"]
        self.github_token = os.environ.get('GITHUB_TOKEN', '')
        self.github_repo = os.environ.get('GITHUB_REPO', '')
        
    def execute_task_pipeline(self, task_description: str, task_files: List[str]) -> bool:
        """
        태스크 파이프라인 실행:
        1. 태스크 실행
        2. 검증
        3. 크로스검증
        4. 코드수정
        5. 재검증
        6. 푸시
        7. 깃페이지 확인
        """
        print(f"🔄 태스크 파이프라인 시작: {task_description}")
        
        # 1. 태스크 실행
        task_result = self.execute_task(task_description, task_files)
        if not task_result:
            print("❌ 태스크 실행 실패")
            return False
        
        # 2. 검증
        verification_result = self.verify_task(task_result)
        if not verification_result:
            print("❌ 태스크 검증 실패")
            return False
        
        # 3. 크로스검증
        cross_verification_result = self.cross_verify_task(verification_result)
        if not cross_verification_result:
            print("❌ 태스크 크로스검증 실패")
            return False
        
        # 4. 코드수정
        code_modification_result = self.modify_code(cross_verification_result)
        if not code_modification_result:
            print("❌ 코드수정 실패")
            return False
        
        # 5. 재검증
        re_verification_result = self.re_verify_task(code_modification_result)
        if not re_verification_result:
            print("❌ 태스크 재검증 실패")
            return False
        
        # 6. 푸시
        push_result = self.push_to_repository(re_verification_result)
        if not push_result:
            print("❌ 푸시 실패")
            return False
        
        # 7. 깃페이지 확인
        github_pages_result = self.verify_github_pages()
        if not github_pages_result:
            print("❌ 깃페이지 확인 실패")
            return False
        
        print("✅ 태스크 파이프라인 완료")
        return True
    
    def execute_task(self, task_description: str, task_files: List[str]) -> Dict[str, Any]:
        """태스크 실행"""
        print("🔧 1. 태스크 실행 중...")
        
        task_prompt = f"""
        다음 태스크를 실행해주세요:
        
        태스크: {task_description}
        대상 파일: {', '.join(task_files)}
        
        실행 결과는 다음을 포함해야 합니다:
        1. 완전한 코드 구현
        2. 상세한 주석
        3. 타입 정의
        4. 에러 처리
        5. 테스트 가능한 구조
        
        Claude Opus 4.5로서 최고의 품질로 구현해주세요.
        """
        
        # 메인 에이전트에게 태스크 실행 지시
        cmd = [
            sys.executable,
            "C:\\Users\\FREE\\CascadeProjects\\opencode-collab\\smart_orchestrator.py",
            task_prompt,
            self.target_project,
            f"--model={self.model}",
            f"--agent=agent1"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=900)
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "error": result.stderr,
                "files": task_files
            }
        except Exception as e:
            return {
                "success": False,
                "output": str(e),
                "error": str(e),
                "files": task_files
            }
    
    def verify_task(self, task_result: Dict[str, Any]) -> Dict[str, Any]:
        """태스크 검증"""
        print("🔍 2. 태스크 검증 중...")
        
        verification_prompt = f"""
        다음 태스크 결과를 검증해주세요:
        
        태스크 결과:
        {task_result['output']}
        
        검증 항목:
        1. 코드 완성도
        2. 기능 구현 정확성
        3. 코드 품질
        4. 에러 처리
        5. 테스트 가능성
        
        Claude Opus 4.5로서 객관적인 검증을 수행해주세요.
        """
        
        cmd = [
            sys.executable,
            "C:\\Users\\FREE\\CascadeProjects\\opencode-collab\\smart_orchestrator.py",
            verification_prompt,
            self.target_project,
            f"--model={self.model}",
            f"--agent=agent2"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=600)
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "error": result.stderr,
                "task_result": task_result
            }
        except Exception as e:
            return {
                "success": False,
                "output": str(e),
                "error": str(e),
                "task_result": task_result
            }
    
    def cross_verify_task(self, verification_result: Dict[str, Any]) -> Dict[str, Any]:
        """크로스검증"""
        print("🔄 3. 크로스검증 중...")
        
        cross_verification_prompt = f"""
        다른 에이전트의 검증 결과를 크로스검증해주세요:
        
        검증 결과:
        {verification_result['output']}
        
        크로스검증 항목:
        1. 검증 결과의 객관성
        2. 다른 관점에서의 검증
        3. 누락된 부분 확인
        4. 개선사항 제안
        5. 최종 검증 의견
        
        Claude Opus 4.5로서 독립적인 크로스검증을 수행해주세요.
        """
        
        cmd = [
            sys.executable,
            "C:\\Users\\FREE\\CascadeProjects\\opencode-collab\\smart_orchestrator.py",
            cross_verification_prompt,
            self.target_project,
            f"--model={self.model}",
            f"--agent=agent3"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=600)
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "error": result.stderr,
                "verification_result": verification_result
            }
        except Exception as e:
            return {
                "success": False,
                "output": str(e),
                "error": str(e),
                "verification_result": verification_result
            }
    
    def modify_code(self, cross_verification_result: Dict[str, Any]) -> Dict[str, Any]:
        """코드수정"""
        print("🔧 4. 코드수정 중...")
        
        modification_prompt = f"""
        크로스검증 결과를 바탕으로 코드를 수정해주세요:
        
        크로스검증 결과:
        {cross_verification_result['output']}
        
        수정 항목:
        1. 크로스검증에서 제안된 개선사항
        2. 코드 품질 향상
        3. 기능 개선
        4. 에러 처리 강화
        5. 최종 코드 완성
        
        Claude Opus 4.5로서 최고의 코드를 수정해주세요.
        """
        
        cmd = [
            sys.executable,
            "C:\\Users\\FREE\\CascadeProjects\\opencode-collab\\smart_orchestrator.py",
            modification_prompt,
            self.target_project,
            f"--model={self.model}",
            f"--agent=agent4"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=900)
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "error": result.stderr,
                "cross_verification_result": cross_verification_result
            }
        except Exception as e:
            return {
                "success": False,
                "output": str(e),
                "error": str(e),
                "cross_verification_result": cross_verification_result
            }
    
    def re_verify_task(self, code_modification_result: Dict[str, Any]) -> Dict[str, Any]:
        """재검증"""
        print("🔍 5. 재검증 중...")
        
        re_verification_prompt = f"""
        수정된 코드를 재검증해주세요:
        
        수정 결과:
        {code_modification_result['output']}
        
        재검증 항목:
        1. 수정사항 적용 확인
        2. 기능 개선 확인
        3. 코드 품질 확인
        4. 최종 완성도 확인
        5. 배포 준비 상태 확인
        
        Claude Opus 4.5로서 최종 재검증을 수행해주세요.
        """
        
        cmd = [
            sys.executable,
            "C:\\Users\\FREE\\CascadeProjects\\opencode-collab\\smart_orchestrator.py",
            re_verification_prompt,
            self.target_project,
            f"--model={self.model}",
            f"--agent=agent5"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=600)
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "error": result.stderr,
                "code_modification_result": code_modification_result
            }
        except Exception as e:
            return {
                "success": False,
                "output": str(e),
                "error": str(e),
                "code_modification_result": code_modification_result
            }
    
    def push_to_repository(self, re_verification_result: Dict[str, Any]) -> Dict[str, Any]:
        """푸시"""
        print("🚀 6. 푸시 중...")
        
        try:
            # Git 푸시
            os.chdir(self.target_project)
            
            # Git 상태 확인
            status_result = subprocess.run(
                ["git", "status"],
                capture_output=True, text=True, encoding='utf-8'
            )
            
            if status_result.returncode != 0:
                return {
                    "success": False,
                    "output": "Git status 실패",
                    "error": status_result.stderr,
                    "re_verification_result": re_verification_result
                }
            
            # Git 추가
            add_result = subprocess.run(
                ["git", "add", "."],
                capture_output=True, text=True, encoding='utf-8'
            )
            
            if add_result.returncode != 0:
                return {
                    "success": False,
                    "output": "Git add 실패",
                    "error": add_result.stderr,
                    "re_verification_result": re_verification_result
                }
            
            # Git 커밋
            commit_result = subprocess.run(
                ["git", "commit", "-m", "Auto commit from task pipeline"],
                capture_output=True, text=True, encoding='utf-8'
            )
            
            if commit_result.returncode != 0:
                return {
                    "success": False,
                    "output": "Git commit 실패",
                    "error": commit_result.stderr,
                    "re_verification_result": re_verification_result
                }
            
            # Git 푸시
            push_result = subprocess.run(
                ["git", "push"],
                capture_output=True, text=True, encoding='utf-8'
            )
            
            return {
                "success": push_result.returncode == 0,
                "output": push_result.stdout,
                "error": push_result.stderr,
                "re_verification_result": re_verification_result
            }
            
        except Exception as e:
            return {
                "success": False,
                "output": str(e),
                "error": str(e),
                "re_verification_result": re_verification_result
            }
    
    def verify_github_pages(self) -> Dict[str, Any]:
        """깃페이지 확인"""
        print("🌐 7. 깃페이지 확인 중...")
        
        if not self.github_token or not self.github_repo:
            print("⚠️ GitHub 토큰 또는 레포지 정보 없음")
            return {
                "success": False,
                "output": "GitHub 토큰 또는 레포지 정보 없음",
                "error": "환경변수 설정 필요"
            }
        
        try:
            import requests
            
            # 깃허브 API로 배포 상태 확인
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            # 배포 상태 확인
            pages_url = f"https://api.github.com/repos/{self.github_repo}/pages"
            response = requests.get(pages_url, headers=headers)
            
            if response.status_code == 200:
                pages_data = response.json()
                return {
                    "success": True,
                    "output": f"깃페이지 상태: {pages_data.get('status', 'unknown')}",
                    "error": "",
                    "pages_url": pages_data.get('html_url', '')
                }
            else:
                return {
                    "success": False,
                    "output": "깃페이지 상태 확인 실패",
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "output": str(e),
                "error": str(e)
            }
    
    def run_pipeline_with_task(self, task_description: str, task_files: List[str]) -> bool:
        """전체 파이프라인 실행"""
        print(f"🎯 태스크 파이프라인 실행: {task_description}")
        print(f"📁 대상 파일: {', '.join(task_files)}")
        print(f"🌐 대상 프로젝트: {self.target_project}")
        print(f"🧠 모델: {self.model}")
        print()
        
        start_time = time.time()
        
        # 파이프라인 실행
        success = self.execute_task_pipeline(task_description, task_files)
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"\n⏱️ 실행 시간: {duration:.2f}초")
        
        if success:
            print("✅ 태스크 파이프라인 성공 완료")
            print("🌐 깃페이지에서 바로 확인 가능")
        else:
            print("❌ 태스크 파이프라인 실패")
        
        return success

def main():
    # 환경변수 설정
    os.environ['TARGET_PROJECT'] = 'f:\\genmini\\CABLE MANEGE1\\seastar-cable-manager'
    os.environ['ANTHROPIC_MODEL'] = 'claude-3-opus-20240229'
    
    # 파이프라인 초기화
    pipeline = TaskVerificationPipeline(
        target_project=os.environ['TARGET_PROJECT'],
        model=os.environ['ANTHROPIC_MODEL']
    )
    
    # 예시 태스크 실행
    task_description = "3중 분할 창 및 3D 뷰어 기능 구현"
    task_files = [
        "components/TrayAnalysisTripleSplit.tsx",
        "components/ThreeSceneRoutingViewer.tsx",
        "components/TrayAnalysisIntegrated.tsx"
    ]
    
    # 파이프라인 실행
    success = pipeline.run_pipeline_with_task(task_description, task_files)
    
    if success:
        print("\n🎉 파이프라인 성공 완료!")
        print("🌐 깃페이지에서 바로 확인 가능합니다.")
    else:
        print("\n❌ 파이프라인 실패")
        print("🔍 로그를 확인하여 문제를 해결해주세요.")

if __name__ == "__main__":
    main()
