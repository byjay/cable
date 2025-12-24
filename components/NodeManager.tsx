import React, { useState, useEffect, useMemo } from 'react';
import { Node } from '../types';
import { 
    Save, Plus, Trash2, Search, Edit3, X, Check, FileSpreadsheet, Filter,
    FilePlus, FolderOpen, ArrowDown, ArrowUp, Printer
} from 'lucide-react';
import { ExcelService } from '../services/excelService';

interface NodeManagerProps {
  nodes: Node[];
  onUpdateNodes: (updatedNodes: Node[]) => void;
  triggerImport: () => void;
  onExport: () => void;
}

const NodeManager: React.FC<NodeManagerProps> = ({ nodes, onUpdateNodes, triggerImport, onExport }) => {
  const [localNodes, setLocalNodes] = useState<Node[]>([]);
  const [filterDeck, setFilterDeck] = useState('ALL');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Node | null>(null);

  useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

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
    const newNode: Node = { name: 'NEW', relation: '', linkLength: 0, deck: 'PR', x:0, y:0, z:0 };
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

  const IconBtn = ({ icon: Icon, label, onClick, color="text-gray-200" }: any) => (
      <button onClick={onClick} className="flex flex-col items-center justify-center px-2 py-1 hover:bg-[#334155] rounded transition-colors group" title={label}>
          <Icon size={18} className={`${color} group-hover:scale-110 transition-transform`}/>
      </button>
  );

  const Divider = () => <div className="w-px h-6 bg-gray-600 mx-1"></div>;

  return (
    <div className="flex flex-col h-full bg-[#e2e8f0]">
       {/* --- ICON TOOLBAR --- */}
      <div className="h-9 bg-[#f1f5f9] border-b border-gray-300 flex items-center px-1 shadow-sm select-none">
          <IconBtn icon={FilePlus} label="Add Row" onClick={handleAddNode} color="text-yellow-600"/>
          <IconBtn icon={FolderOpen} label="Open Excel" onClick={triggerImport} color="text-yellow-600"/>
          <IconBtn icon={Save} label="Save" color="text-blue-600"/>
          <Divider/>
          <IconBtn icon={Search} label="Search" color="text-gray-600"/>
          <Divider/>
          <IconBtn icon={FileSpreadsheet} label="Export" onClick={onExport} color="text-green-600"/>
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
              {['NODE_RNAME', 'STRUCTURE', 'COMPONENT', 'NODE_TYPE', 'RELATION', 'LINK_LENGTH', 'AREA_SIZE', 'MAX_CABLE', 'POINT', 'ACTION'].map(header => (
                  <th key={header} className="p-2 text-[10px] font-bold border-r border-gray-300 uppercase whitespace-nowrap">
                      {header.replace('_', ' ')}
                  </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredNodes.map((node, index) => {
              const isEditing = editingId === index;
              return (
                <tr key={index} className={`text-xs ${isEditing ? 'bg-yellow-50' : 'odd:bg-white even:bg-[#f8fafc] text-gray-800'} hover:bg-blue-50`}>
                  
                  {/* Name */}
                  <td className="p-1 border-r border-gray-200">
                      {isEditing ? <input className="w-full border border-blue-400 p-1 rounded" value={editForm?.name} onChange={e => handleChange('name', e.target.value)}/> : <span className="font-bold">{node.name}</span>}
                  </td>
                  
                  {/* Structure */}
                  <td className="p-1 border-r border-gray-200">
                       {isEditing ? <input className="w-full border border-blue-400 p-1 rounded" value={editForm?.deck} onChange={e => handleChange('deck', e.target.value)}/> : (node.deck || node['STRUCTURE_NAME'] || '')}
                  </td>
                  
                  <td className="p-1 border-r border-gray-200 text-gray-500">{node['COMPONENT'] || 'Tray'}</td>
                  <td className="p-1 border-r border-gray-200 text-gray-500">{node['NODE_TYPE'] || 'Tray'}</td>

                  {/* Relation */}
                  <td className="p-1 border-r border-gray-200 max-w-xs truncate" title={node.relation}>
                       {isEditing ? <input className="w-full border border-blue-400 p-1 rounded" value={editForm?.relation} onChange={e => handleChange('relation', e.target.value)}/> : node.relation}
                  </td>

                  {/* Length */}
                  <td className="p-1 border-r border-gray-200">
                       {isEditing ? <input type="number" className="w-full border border-blue-400 p-1 rounded" value={editForm?.linkLength} onChange={e => handleChange('linkLength', parseFloat(e.target.value))}/> : node.linkLength}
                  </td>

                  {/* Area & Max */}
                  <td className="p-1 border-r border-gray-200 text-right">{node['AREA_SIZE'] || 70000}</td>
                  <td className="p-1 border-r border-gray-200 text-right">{node['MAX_CABLE'] || 100}</td>
                  
                  {/* Point */}
                  <td className="p-1 border-r border-gray-200 text-[9px] font-mono text-gray-500">
                      {node['POINT'] ? node['POINT'] : `S: 0,0,0 E: ${node.linkLength},0,0`}
                  </td>

                  {/* Actions */}
                  <td className="p-1 text-center">
                      {isEditing ? (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => handleSaveRow(index)} className="text-green-600"><Check size={14}/></button>
                            <button onClick={() => setEditingId(null)} className="text-red-600"><X size={14}/></button>
                          </div>
                      ) : (
                          <div className="flex justify-center gap-1 opacity-50 hover:opacity-100">
                            <button onClick={() => handleEdit(index, node)} className="text-blue-600"><Edit3 size={14}/></button>
                            <button onClick={() => handleDelete(index)} className="text-red-600"><Trash2 size={14}/></button>
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