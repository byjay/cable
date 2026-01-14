import subprocess
import sys


def call_agent(agent_name: str, prompt: str) -> str:
    """
    Execute a command on a specific agent container.
    
    Args:
        agent_name (str): Name of the docker container (e.g., 'agent1').
        prompt (str): The instruction to pass to the opencode agent.
        
    Returns:
        str: The standard output from the agent execution.
        
    Raises:
        RuntimeError: If the docker command fails.
    """
    print(f"\n[call_agent] {agent_name} -> {prompt[:80]}...")
    full_prompt = prompt if "/ralph-loop" in prompt else f"{prompt} /ralph-loop"
    cmd = [
        "docker",
        "exec",
        agent_name,
        "opencode",
        "run",
        full_prompt,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Agent {agent_name} failed (exit={result.returncode})\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    return result.stdout


def main() -> None:
    mission_goal = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else "프로젝트 분석 및 기본 구조 설계"

    print(f"[mission] {mission_goal}")

    task1 = (
        f"미션: '{mission_goal}'. 너는 백엔드 리드다. 프로젝트의 폴더 구조를 잡고, 핵심 로직 파일(main.py 등)의 뼈대를 작성해."
    )
    task2 = (
        f"미션: '{mission_goal}'. 너는 프론트엔드/문서 담당이다. README.md를 상세히 작성하고, 필요한 UI 컴포넌트 구조를 기획해."
    )
    task3 = f"미션: '{mission_goal}'. 너는 데브옵스다. requirements.txt와 테스트 코드를 작성해."

    call_agent("agent1", task1)
    call_agent("agent2", task2)
    call_agent("agent3", task3)

    review_prompt1 = "@reviewer 현재 파일들을 검토하고, 보안 문제나 로직 오류를 찾아 'REVIEW_LOG.md'에 기록해."
    review_prompt2 = "@reviewer README.md와 코드의 일치성을 검증해."

    call_agent("agent1", review_prompt1)
    call_agent("agent2", review_prompt2)

    fix_prompt = "REVIEW_LOG.md를 읽고 지적된 모든 오류를 코드를 수정해서 고쳐. 그리고 최종적으로 테스트를 실행해."
    call_agent("agent3", fix_prompt)

    print("\n[done] 모든 프로세스 완료")


if __name__ == "__main__":
    main()
