# RELAY_REVIEW_A2.md: Agent 1 App.tsx 구조 검토 및 개선안

## 1. 현황 분석
현재 `jap-balloon-game` 디렉토리 내에 `App.tsx` 파일이 존재하지 않습니다. 따라서 Agent 1이 "Integration" 역할로서 수행해야 할 초기 구조 설계를 제안하고, 이를 기반으로 UI 및 디자인 통합 관점에서의 개선안을 제시합니다.

## 2. 디자인 및 UI 통합 목표 (MASTER_PLAN 기반)
- **컨셉**: 3D Isometric 스타일 + 짱구(Shin-chan) 테마
- **기술 스택**: React + Vite, Spline/Three.js, CSS 3D Transforms
- **주요 요구사항**:
    - 배경에 3D 씬(Spline) 배치
    - UI 요소(점수, 타이머 등)에 ISO 스타일 적용
    - 히라가나/가타카나 매칭 게임 로직 통합

## 3. App.tsx 구조 제안 (Initial Design)

기존의 단일 파일 구조 대신, 3D 씬과 UI 레이어를 명확히 분리하는 구조를 제안합니다.

```tsx
import React, { useState, Suspense } from 'react';
import './3D_ISO_Styles.css'; // ISO 스타일 로드

// 3D 씬 컴포넌트 (Lazy Loading 권장)
const GameScene = React.lazy(() => import('./components/GameScene'));

// UI 컴포넌트
import HUD from './components/HUD';
import StartScreen from './components/StartScreen';

function App() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);

  return (
    <div className="app-container">
      {/* 1. 배경 3D 씬 (Spline/Three.js) */}
      <div className="scene-layer">
        <Suspense fallback={<div className="loading">Loading 3D Assets...</div>}>
          <GameScene gameState={gameState} />
        </Suspense>
      </div>

      {/* 2. UI 오버레이 (ISO 스타일 적용) */}
      <div className="ui-layer">
        {gameState === 'start' && (
          <StartScreen onStart={() => setGameState('playing')} />
        )}
        
        {gameState === 'playing' && (
          <HUD score={score} />
        )}
      </div>
    </div>
  );
}

export default App;
```

## 4. 개선안 (Review & Improvements)

### 4.1. 3D 씬과 UI의 레이어링 (Z-Index 전략)
- **문제점**: 3D 캔버스와 DOM UI가 겹칠 때 이벤트 버블링이나 클릭 간섭이 발생할 수 있음.
- **개선**: `scene-layer`는 `z-index: 0`, `ui-layer`는 `z-index: 10`으로 설정하고, `ui-layer` 자체에는 `pointer-events: none`을 주되, 내부 버튼 등의 인터랙티브 요소에만 `pointer-events: auto`를 적용하여 3D 조작(필요 시)을 방해하지 않도록 함.

### 4.2. 디자인 시스템 통합 (`3D_ISO_Styles.css`)
- **현황**: `3D_ISO_Styles.css`가 존재함.
- **통합 방안**: `App.tsx`에 단순히 import하는 것을 넘어, 전역 테마 클래스(e.g., `.theme-shinchan`)를 최상위 div에 적용하여 일관된 폰트와 컬러 팔레트가 하위 컴포넌트에 상속되도록 함.
- **코드 예시**:
  ```tsx
  <div className="app-container theme-shinchan"> ... </div>
  ```

### 4.3. 상태 관리 분리
- **제안**: `App.tsx`가 비대해지는 것을 방지하기 위해 게임 로직(`useGameLogic`)을 커스텀 훅으로 분리.
  ```tsx
  // hooks/useGameLogic.ts
  export const useGameLogic = () => {
    // 점수, 타이머, 매칭 로직 등
    return { gameState, score, startGame, ... };
  };
  ```

## 5. 결론 및 다음 단계
- Agent 1은 위 구조를 기반으로 `src/App.tsx` 및 관련 컴포넌트 폴더 구조를 생성할 것.
- Agent 2는 `components/HUD` 및 `components/StartScreen`에 `3D_ISO_Styles.css`를 활용한 구체적인 디자인을 입힐 것.
