import React, { useState, useEffect, useMemo } from 'react';
import { Node, Cable } from '../types';
import {
  Save, Plus, Trash2, Search, Edit3, X, Check, FileSpreadsheet, Filter,
  FilePlus, FolderOpen, ArrowDown, ArrowUp, Printer, AlertTriangle, CheckCircle
} from 'lucide-react';
import { ExcelService } from '../services/excelService';

interface NodeManagerProps {
  nodes: Node[];
  cables?: Cable[];  // Optional: for fill ratio calculation
  onUpdateNodes: (updatedNodes: Node[]) => void;
  triggerImport: () => void;
  onExport: () => void;
}

const NodeManager: React.FC<NodeManagerProps> = ({ nodes, cables = [], onUpdateNodes, triggerImport, onExport }) => {
  const [localNodes, setLocalNodes] = useState<Node[]>([]);
  const [filterDeck, setFilterDeck] = useState('ALL');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Node | null>(null);

  useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

  // Calculate fill ratio for each node (same logic as TrayAnalysis)
  const nodeFillMap = useMemo(() => {
    const fillMap = new Map<string, { fillRatio: number; cableCount: number; isOverfilled: boolean }>();

    cables.forEach(cable => {
      if (!cable.calculatedPath || cable.calculatedPath.length === 0) return;
      const od = cable.od || 10;
      const cableArea = Math.PI * Math.pow(od / 2, 2);

      cable.calculatedPath.forEach(nodeName => {
        const node = nodes.find(n => n.name === nodeName);
        const trayWidth = node?.areaSize || 200;
        const trayCapacity = trayWidth * 60;

        if (!fillMap.has(nodeName)) {
          fillMap.set(nodeName, { fillRatio: 0, cableCount: 0, isOverfilled: false });
        }
        const data = fillMap.get(nodeName)!;
        const newArea = (data.fillRatio * trayCapacity / 100) + cableArea;
        data.cableCount += 1;
        data.fillRatio = (newArea / trayCapacity) * 100;
        data.isOverfilled = data.fillRatio > 40;
      });
    });

    return fillMap;
  }, [cables, nodes]);

  // Extract Decks for Dropdown
  const decks = useMemo(() => {
    const d = Array.from(new Set(nodes.map(n => n.deck).filter(Boolean)));
    return ['ALL', ...d.sort()];
  }, [nodes]);

  const handleEdit = (index: number, node: Node) => {
    setEditingId(index);
    setEditForm({ ...node });
  };

  const handleSaveRow = (index: number) => {
    if (editForm) {
      const updated = [...localNodes];
      updated[index] = editForm;
      setLocalNodes(updated);
      onUpdateNodes(updated);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleChange = (field: keyof Node, value: string | number) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value });
    }
  };

  const handleAddNode = () => {
    const newNode: Node = { name: 'NEW', relation: '', linkLength: 0, deck: 'PR', x: 0, y: 0, z: 0 };
    const updated = [newNode, ...localNodes];
    setLocalNodes(updated);
    onUpdateNodes(updated);
    setEditingId(0);
    setEditForm(newNode);
  };

  const handleDelete = (index: number) => {
    if (confirm("Delete this node?")) {
      const updated = localNodes.filter((_, i) => i !== index);
      setLocalNodes(updated);
      onUpdateNodes(updated);
    }
  };

  const filteredNodes = localNodes.filter(n =>
    filterDeck === 'ALL' ? true : n.deck === filterDeck
  );

  const IconBtn = ({ icon: Icon, label, onClick, color = "text-gray-200" }: any) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center px-2 py-1 hover:bg-[#334155] rounded transition-colors group" title={label}>
      <Icon size={18} className={`${color} group-hover:scale-110 transition-transform`} />
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-gray-600 mx-1"></div>;

  return (
    <div className="flex flex-col h-full bg-[#e2e8f0]">
      {/* --- ICON TOOLBAR --- */}
      <div className="h-9 bg-[#f1f5f9] border-b border-gray-300 flex items-center px-1 shadow-sm select-none">
        <IconBtn icon={FilePlus} label="Add Row" onClick={handleAddNode} color="text-yellow-600" />
        <IconBtn icon={FolderOpen} label="Open Excel" onClick={triggerImport} color="text-yellow-600" />
        <IconBtn icon={Save} label="Save" color="text-blue-600" />
        <Divider />
        <IconBtn icon={Search} label="Search" color="text-gray-600" />
        <Divider />
        <IconBtn icon={FileSpreadsheet} label="Export" onClick={onExport} color="text-green-600" />
      </div>

      {/* Search & Deck Filter */}
      <div className="bg-[#f8fafc] border-b border-gray-300 p-2 flex items-center gap-4">
        <div className="flex items-center gap-2 border border-gray-300 rounded px-2 py-1 bg-white">
          <span className="text-[10px] text-gray-600 font-bold">Deck Name</span>
          <select
            className="bg-transparent text-xs text-gray-800 outline-none w-24"
            value={filterDeck}
            onChange={(e) => setFilterDeck(e.target.value)}
          >
            {decks.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="bg-blue-600 text-white px-2 py-0.5 text-[10px] rounded hover:bg-blue-500">SEARCH</button>
        </div>

        <div className="text-[10px] text-gray-500">
          Total Nodes: <span className="font-bold text-black">{filteredNodes.length}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto bg-white custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="bg-[#e2e8f0] text-gray-700 sticky top-0 z-10 shadow-sm border-b border-gray-300">
            <tr>
              {['NODE_RNAME', 'STRUCTURE', 'FILL_RATIO', 'CABLES', 'RELATION', 'LINK_LENGTH', 'AREA_SIZE', 'POINT', 'ACTION'].map(header => (
                <th key={header} className="p-2 text-[10px] font-bold border-r border-gray-300 uppercase whitespace-nowrap">
                  {header.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredNodes.map((node, index) => {
              const isEditing = editingId === index;
              const fillData = nodeFillMap.get(node.name);
              const fillRatio = fillData?.fillRatio || 0;
              const cableCount = fillData?.cableCount || 0;
              const isOverfilled = fillData?.isOverfilled || false;
              return (
                <tr key={index} className={`text-xs ${isEditing ? 'bg-yellow-50' : isOverfilled ? 'bg-red-50' : 'odd:bg-white even:bg-[#f8fafc]'} text-gray-800 hover:bg-blue-50`}>

                  {/* Name */}
                  <td className="p-1 border-r border-gray-200">
                    {isEditing ? <input className="w-full border border-blue-400 p-1 rounded" value={editForm?.name} onChange={e => handleChange('name', e.target.value)} title="Node Name" /> : <span className="font-bold">{node.name}</span>}
                  </td>

                  {/* Structure */}
                  <td className="p-1 border-r border-gray-200">
                    {isEditing ? <input className="w-full border border-blue-400 p-1 rounded" value={editForm?.deck} onChange={e => handleChange('deck', e.target.value)} title="Structure" /> : (node.deck || node['STRUCTURE_NAME'] || '')}
                  </td>

                  {/* Fill Ratio - NEW */}
                  <td className={`p-1 border-r border-gray-200 text-center font-bold ${isOverfilled ? 'text-red-600 bg-red-100' : fillRatio > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                    <div className="flex items-center justify-center gap-1">
                      {isOverfilled ? <AlertTriangle size={12} /> : cableCount > 0 ? <CheckCircle size={12} /> : null}
                      {fillRatio > 0 ? `${fillRatio.toFixed(1)}%` : '-'}
                    </div>
                  </td>

                  {/* Cable Count - NEW */}
                  <td className="p-1 border-r border-gray-200 text-center text-gray-600">
                    {cableCount > 0 ? cableCount : '-'}
                  </td>

                  {/* Relation */}
                  <td className="p-1 border-r border-gray-200 max-w-xs truncate" title={node.relation}>
                    {isEditing ? <input className="w-full border border-blue-400 p-1 rounded" value={editForm?.relation} onChange={e => handleChange('relation', e.target.value)} title="Relation" /> : node.relation}
                  </td>

                  {/* Length */}
                  <td className="p-1 border-r border-gray-200">
                    {isEditing ? <input type="number" className="w-full border border-blue-400 p-1 rounded" value={editForm?.linkLength} onChange={e => handleChange('linkLength', parseFloat(e.target.value))} title="Link Length" /> : node.linkLength}
                  </td>

                  {/* Area Size */}
                  <td className="p-1 border-r border-gray-200 text-right">{node.areaSize || node['AREA_SIZE'] || 200}</td>

                  {/* Point */}
                  <td className="p-1 border-r border-gray-200 text-[9px] font-mono text-gray-500">
                    {node['POINT'] ? node['POINT'] : `S: 0,0,0 E: ${node.linkLength},0,0`}
                  </td>

                  {/* Actions */}
                  <td className="p-1 text-center">
                    {isEditing ? (
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleSaveRow(index)} className="text-green-600" title="Save"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="text-red-600" title="Cancel"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-1 opacity-50 hover:opacity-100">
                        <button onClick={() => handleEdit(index, node)} className="text-blue-600" title="Edit"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(index)} className="text-red-600" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NodeManager;