import React, { useState, useEffect } from 'react';
import { Node } from '../types';
import { EnhancedRoutingService } from '../services/EnhancedRoutingService';

interface EnhancedLevelMapVisualizationProps {
  nodes: Node[];
  routingService: EnhancedRoutingService;
  onRouteSelected?: (route: string[]) => void;
}

const EnhancedLevelMapVisualization: React.FC<EnhancedLevelMapVisualizationProps> = ({
  nodes,
  routingService,
  onRouteSelected
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [fromNode, setFromNode] = useState<string>('');
  const [toNode, setToNode] = useState<string>('');
  const [routeResult, setRouteResult] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [interLevelConnections, setInterLevelConnections] = useState<any[]>([]);

  useEffect(() => {
    const data = routingService.getLevelMapData();
    const interConnections = routingService.getInterLevelConnections();
    setLevelData(data);
    setInterLevelConnections(interConnections);
  }, [routingService]);

  const handleFindRoute = () => {
    if (!fromNode || !toNode) return;
    
    const route = routingService.findRoute(fromNode, toNode);
    setRouteResult(route);
    
    if (route.distance >= 0 && onRouteSelected) {
      onRouteSelected(route.path);
    }
  };

  const getNodesInLevel = (level: number) => {
    if (!levelData || !levelData[level]) return [];
    return levelData[level].nodes;
  };

  const renderLevelMap = () => {
    if (!levelData) return null;

    return Object.keys(levelData).map(level => {
      const levelNum = parseInt(level);
      if (isNaN(levelNum)) return null; // Skip 'interLevel'

      const levelInfo = levelData[levelNum];
      const isSelected = selectedLevel === levelNum;

      return (
        <div
          key={level}
          className={`level-map ${isSelected ? 'selected' : ''}`}
          style={{
            border: isSelected ? '2px solid #00ff00' : '1px solid #ccc',
            margin: '10px',
            padding: '15px',
            borderRadius: '8px',
            backgroundColor: isSelected ? '#f0fff0' : '#f9f9f9',
            minWidth: '300px'
          }}
          onClick={() => setSelectedLevel(levelNum)}
        >
          <h4>Level {levelNum}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {levelInfo.nodes.map((node: any) => (
              <div
                key={node.id}
                style={{
                  padding: '6px 12px',
                  backgroundColor: fromNode === node.id || toNode === node.id ? '#e3f2fd' : '#e0e0e0',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  border: fromNode === node.id ? '2px solid #1976d2' : (toNode === node.id ? '2px solid #dc3545' : '1px solid #ccc'),
                  transition: 'all 0.2s ease'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!fromNode) {
                    setFromNode(node.id);
                  } else if (!toNode && node.id !== fromNode) {
                    setToNode(node.id);
                  }
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{node.id}</div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {node.deck || 'N/A'}
                </div>
              </div>
            ))}
          </div>
          
          {isSelected && (
            <div style={{ marginTop: '15px' }}>
              <h5 style={{ marginBottom: '10px', color: '#333' }}>연결 관계:</h5>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {levelInfo.connections.map((conn: any, index: number) => (
                  <div key={index} style={{ 
                    fontSize: '11px', 
                    color: '#666', 
                    marginBottom: '5px',
                    padding: '5px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{conn.source}</span>
                      <span>→</span>
                      <span>{conn.target}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#888' }}>
                      거리: {conn.distance.toFixed(1)}m | 비율: {(conn.ratio * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  const renderInterLevelConnections = () => {
    if (!interLevelConnections || interLevelConnections.length === 0) return null;

    return (
      <div style={{ 
        margin: '20px 0', 
        padding: '15px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '8px',
        border: '1px solid #ffeaa7'
      }}>
        <h4 style={{ marginBottom: '15px', color: '#856404' }}>🔗 레벨 간 연결</h4>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {interLevelConnections.map((conn: any, index: number) => (
            <div key={index} style={{ 
              fontSize: '12px', 
              margin: '8px 0', 
              padding: '10px', 
              backgroundColor: conn.type === 'vertical' ? '#f8d7da' : '#d1ecf1',
              borderRadius: '4px',
              border: `1px solid ${conn.type === 'vertical' ? '#f5c6cb' : '#bee5db'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ 
                  color: conn.type === 'vertical' ? '#721c24' : '#20c997',
                  fontSize: '16px'
                }}>
                  {conn.type === 'vertical' ? '⬆️' : '↔️'}
                </span>
                <span style={{ fontWeight: 'bold' }}>
                  {conn.from}
                </span>
                <span>({conn.fromLevel} → {conn.toLevel})</span>
                <span style={{ fontWeight: 'bold' }}>
                  {conn.to}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                거리: {conn.distance.toFixed(1)}m
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStatistics = () => {
    if (!levelData) return null;

    const totalLevels = Object.keys(levelData).filter(k => k !== 'interLevel').length;
    const totalNodes = Object.values(levelData).reduce((sum: any, level: any) => sum + (level.nodes?.length || 0), 0);
    const totalConnections = Object.values(levelData).reduce((sum: any, level: any) => sum + (level.connections?.length || 0), 0);
    const totalInterLevelConnections = interLevelConnections.length;

    return (
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#495057' }}>📊 통계 정보</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)', gap: '10px' }}>
          <div style={{ padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>총 레벨 수</div>
            <div style={{ fontSize: '24px', color: '#007bff' }}>{totalLevels}</div>
          </div>
          <div style={{ padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>총 노드 수</div>
            <div style={{ fontSize: '24px', color: '#28a745' }}>{totalNodes}</div>
          </div>
          <div style={{ padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>총 연결 수</div>
            <div style={{ fontSize: '24px', color: '#ffc107' }}>{totalConnections}</div>
          </div>
          <div style={{ padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>레벨 간 연결</div>
            <div style={{ fontSize: '24px', color: '#dc3545' }}>{totalInterLevelConnections}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#ffffff' }}>
      <h3 style={{ marginBottom: '20px', color: '#212529', borderBottom: '2px solid #dee2e6' }}>
        🗺️ 고정밀도 레벨 맵 및 내비게이션
      </h3>
      
      {/* 경로 탐색 */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        backgroundColor: '#e7f3ff', 
        borderRadius: '8px',
        border: '1px solid #b3d4ff'
      }}>
        <h4 style={{ marginBottom: '15px', color: '#004085' }}>🔍 경로 탐색</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="시작 노드"
            value={fromNode}
            onChange={(e) => setFromNode(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '4px', 
              border: '1px solid #ccc', 
              fontSize: '14px',
              minWidth: '150px'
            }}
          />
          <input
            type="text"
            placeholder="목적 노드"
            value={toNode}
            onChange={(e) => setToNode(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '4px', 
              border: '1px solid #ccc', 
              fontSize: '14px',
              minWidth: '150px'
            }}
          />
          <button
            onClick={handleFindRoute}
            style={{ 
              padding: '8px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            경로 탐색
          </button>
          <button
            onClick={() => {
              setFromNode('');
              setToNode('');
              setRouteResult(null);
            }}
            style={{ 
              padding: '8px 20px', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            초기화
          </button>
        </div>
        
        {routeResult && (
          <div style={{ 
            marginTop: '15px', 
            padding: '15px', 
            borderRadius: '4px',
            backgroundColor: routeResult.distance >= 0 ? '#d4edda' : '#f8d7da',
            border: `1px solid ${routeResult.distance >= 0 ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {routeResult.distance >= 0 ? (
              <div>
                <strong>✅ 경로 발견!</strong><br />
                <span>거리: {routeResult.distance.toFixed(1)}m</span><br />
                <span>경로: {routeResult.path.join(' → ')}</span>
              </div>
            ) : (
              <div>
                <strong>❌ 경로 없음</strong><br />
                <span>에러: {routeResult.error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 레벨 맵 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderLevelMap()}
      </div>

      {/* 레벨 간 연결 */}
      {renderInterLevelConnections()}

      {/* 통계 정보 */}
      {renderStatistics()}
    </div>
  );
};

export default EnhancedLevelMapVisualization;
