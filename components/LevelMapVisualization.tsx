import React, { useState, useEffect } from 'react';
import { Node } from '../types';
import { RoutingService } from '../services/routingService';

interface LevelMapVisualizationProps {
  nodes: Node[];
  routingService: RoutingService;
  onRouteSelected?: (route: string[]) => void;
}

const LevelMapVisualization: React.FC<LevelMapVisualizationProps> = ({
  nodes,
  routingService,
  onRouteSelected
}) => {
  const [levelData, setLevelData] = useState<any>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [fromNode, setFromNode] = useState<string>('');
  const [toNode, setToNode] = useState<string>('');
  const [routeResult, setRouteResult] = useState<any>(null);

  useEffect(() => {
    const data = routingService.getLevelMapData();
    setLevelData(data);
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
            backgroundColor: isSelected ? '#f0fff0' : '#f9f9f9'
          }}
          onClick={() => setSelectedLevel(levelNum)}
        >
          <h4>Level {levelNum}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {levelInfo.nodes.map((node: any) => (
              <div
                key={node.id}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
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
                {node.id}
              </div>
            ))}
          </div>
          
          {isSelected && (
            <div style={{ marginTop: '10px' }}>
              <h5>Connections:</h5>
              {levelInfo.connections.map((conn: any, index: number) => (
                <div key={index} style={{ fontSize: '11px', color: '#666' }}>
                  {conn.from} → {conn.to} (dist: {conn.distance.toFixed(1)}, ratio: {(conn.ratio * 100).toFixed(1)}%)
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const renderInterLevelConnections = () => {
    if (!levelData || !levelData.interLevel) return null;

    return (
      <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h4>Inter-Level Connections</h4>
        {levelData.interLevel.map((conn: any, index: number) => (
          <div key={index} style={{ fontSize: '12px', margin: '5px 0' }}>
            <span style={{ color: conn.type === 'vertical' ? '#dc3545' : '#20c997' }}>
              {conn.type === 'vertical' ? '⬆️' : '↔️'}
            </span>
            {' '}{conn.fromNode} (Level {conn.fromLevel}) → {conn.toNode} (Level {conn.toLevel})
            {' '}({conn.distance.toFixed(1)}m)
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Level Map Navigation</h3>
      
      {/* Route Finder */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
        <h4>Find Route</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="From node"
            value={fromNode}
            onChange={(e) => setFromNode(e.target.value)}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="text"
            placeholder="To node"
            value={toNode}
            onChange={(e) => setToNode(e.target.value)}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button
            onClick={handleFindRoute}
            style={{ padding: '5px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Find Route
          </button>
          <button
            onClick={() => {
              setFromNode('');
              setToNode('');
              setRouteResult(null);
            }}
            style={{ padding: '5px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
        
        {routeResult && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: routeResult.distance >= 0 ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
            {routeResult.distance >= 0 ? (
              <div>
                <strong>Route found!</strong><br />
                Distance: {routeResult.distance.toFixed(1)}m<br />
                Path: {routeResult.path.join(' → ')}
              </div>
            ) : (
              <div>
                <strong>No route found</strong><br />
                Error: {routeResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Level Maps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderLevelMap()}
      </div>

      {/* Inter-Level Connections */}
      {renderInterLevelConnections()}

      {/* Statistics */}
      {levelData && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h4>Statistics</h4>
          <div style={{ fontSize: '12px' }}>
            <div>Total Levels: {Object.keys(levelData).filter(k => k !== 'interLevel').length}</div>
            <div>Total Nodes: {Object.values(levelData).reduce((sum: any, level: any) => sum + (level.nodes?.length || 0), 0)}</div>
            <div>Total Connections: {Object.values(levelData).reduce((sum: any, level: any) => sum + (level.connections?.length || 0), 0)}</div>
            <div>Inter-Level Connections: {levelData.interLevel?.length || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelMapVisualization;
