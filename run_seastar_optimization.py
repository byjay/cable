import subprocess
import sys
import os

def main():
    # SEASTAR 케이블 프로젝트 Fill 기능 최적화
    task = "물리적 현실성 기반 케이블 적재 알고리즘 검증: 하단 케이블은 상단 케이블에 올려진 상태가 아니며 배치될 수 없음, 최대 60mm까지 3단까지 쌓임, 단수x트리이폭에 맞는 적정한 값 찾기, 그림 그리기 및 리스트 번호화 일치, 5-에이전트 크로스검증"
    
    # 환경변수 설정
    target_project = "f:\\genmini\\CABLE MANEGE1\\seastar-cable-manager"
    model = "claude-3-opus-20240229"
    
    # smart_orchestrator.py 실행
    cmd = [
        sys.executable,  # Python 실행 파일
        "C:\\Users\\FREE\\CascadeProjects\\opencode-collab\\smart_orchestrator.py",
        task,
        target_project,
        f"--model={model}"
    ]
    
    print(f"🎯 SEASTAR 케이블 프로젝트 최적화 시작...")
    print(f"📁 대상 프로젝트: {target_project}")
    print(f"🧠 사용 모델: {model}")
    print(f"📋 작업 내용: {task}")
    print()
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        print(result.stdout)
        if result.stderr:
            print(f"❌ 에러: {result.stderr}")
    except Exception as e:
        print(f"❌ 예외: {e}")

if __name__ == "__main__":
    main()
