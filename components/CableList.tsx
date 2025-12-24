import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Cable } from '../types';
import { 
  Search, Save, Zap, List, Eye, Play, FileSpreadsheet, Layers, Filter, FileText,
  FilePlus, FolderOpen, Trash2, ArrowDown, ArrowUp, Calculator, Pin, Printer, Folder
} from 'lucide-react';
import { ExcelService } from '../services/excelService';

interface CableListProps {
  cables: Cable[];
  isLoading: boolean;
  onSelectCable: (cable: Cable) => void;
  onCalculateRoute: (cable: Cable) => void;
  onCalculateAll: () => void;
  onView3D: (cable: Cable) => void;
  triggerImport: () => void;
  onExport: () => void;
}

const CableList: React.FC<CableListProps> = ({ cables, isLoading, onSelectCable, onCalculateRoute, onCalculateAll, onView3D, triggerImport, onExport }) => {
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  
  // Filters
  const [filterName, setFilterName] = useState('');
  
  // Refs for Drag Selection
  const isDragging = useRef(false);
  const startRowIndex = useRef<number>(-1);

  // Derived Selection for Detail View (First selected or null)
  const selectedCable = useMemo(() => {
      if (selectedIds.size === 0) return null;
      const firstId = Array.from(selectedIds)[0];
      return cables.find(c => c.id === firstId) || null;
  }, [selectedIds, cables]);

  // Exact Column Order
  const FIXED_COLUMNS = [
    { key: 'id', label: 'NO', width: 'w-10', align: 'center' },
    { key: 'system', label: 'CABLE_SYSTEM', width: 'w-20' },
    { key: 'page', label: 'WD_PAGE', width: 'w-16', align: 'center' },
    { key: 'name', label: 'CABLE_NAME', width: 'w-32', color: 'text-seastar-cyan font-bold' },
    { key: 'type', label: 'COMP_NAME', width: 'w-24' },
    { key: 'fromRoom', label: 'FROM_ROOM', width: 'w-20', bg: 'bg-blue-900/10' }, // fromDeck maps to fromRoom in header often
    { key: 'fromEquip', label: 'FROM_EQUIP', width: 'w-32', bg: 'bg-blue-900/10' },
    { key: 'fromNode', label: 'FROM_NODE', width: 'w-20', bg: 'bg-blue-900/10' },
    { key: 'fromRest', label: 'FROM_REST', width: 'w-16', bg: 'bg-blue-900/10' },
    { key: 'toRoom', label: 'TO_ROOM', width: 'w-20', bg: 'bg-green-900/10' }, // toDeck maps to toRoom
    { key: 'toEquip', label: 'TO_EQUIP', width: 'w-32', bg: 'bg-green-900/10' },
    { key: 'toNode', label: 'TO_NODE', width: 'w-20', bg: 'bg-green-900/10' },
    { key: 'toRest', label: 'TO_REST', width: 'w-16', bg: 'bg-green-900/10' },
    { key: 'length', label: 'POR_LENGTH', width: 'w-20', align: 'right', color: 'text-yellow-400 font-mono font-bold' },
    { key: 'path', label: 'CABLE_PATH', width: 'w-48', color: 'text-green-400 font-mono text-[10px]' },
    { key: 'od', label: 'CABLE_OUTDIA', width: 'w-20', align: 'right' },
    { key: 'checkNode', label: 'CHECK_NODE', width: 'w-20' },
    { key: 'supplyDeck', label: 'SUPPLY_DECK', width: 'w-20' },
    { key: 'weight', label: 'POR_WEIGHT', width: 'w-20', align: 'right' },
    { key: 'drum', label: 'DRUM_', width: 'w-20' },
    { key: 'remark', label: 'REMARK', width: 'w-32' },
  ];

  const filteredCables = useMemo(() => {
    return cables.filter(c => 
      String(c.name || '').toLowerCase().includes(filterName.toLowerCase())
    );
  }, [cables, filterName]);

  // Selection Logic
  const handleRowMouseDown = (e: React.MouseEvent, id: string, index: number) => {
      isDragging.current = true;
      startRowIndex.current = index;

      if (e.ctrlKey || e.metaKey) {
          const newSet = new Set(selectedIds);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          setSelectedIds(newSet);
          setLastSelectedId(id);
      } else if (e.shiftKey && lastSelectedId) {
          const lastIndex = filteredCables.findIndex(c => c.id === lastSelectedId);
          const start = Math.min(lastIndex, index);
          const end = Math.max(lastIndex, index);
          const newSet = new Set(selectedIds);
          for(let i=start; i<=end; i++) {
              if (filteredCables[i]) newSet.add(filteredCables[i].id);
          }
          setSelectedIds(newSet);
      } else {
          setSelectedIds(new Set([id]));
          setLastSelectedId(id);
      }
  };

  const handleRowMouseEnter = (index: number) => {
      if (isDragging.current && startRowIndex.current !== -1) {
          const start = Math.min(startRowIndex.current, index);
          const end = Math.max(startRowIndex.current, index);
          const newSet = new Set();
          for(let i=start; i<=end; i++) {
             if (filteredCables[i]) newSet.add(filteredCables[i].id);
          }
          setSelectedIds(newSet);
      }
  };

  const handleMouseUp = () => {
      isDragging.current = false;
      startRowIndex.current = -1;
  };

  const IconBtn = ({ icon: Icon, label, onClick, color="text-gray-200" }: any) => (
      <button onClick={onClick} className="flex flex-col items-center justify-center px-2 py-1 hover:bg-[#334155] rounded transition-colors group" title={label}>
          <Icon size={18} className={`${color} group-hover:scale-110 transition-transform`}/>
          {/* <span className="text-[9px] mt-0.5 text-gray-400 group-hover:text-white">{label}</span> */}
      </button>
  );

  const Divider = () => <div className="w-px h-6 bg-gray-600 mx-1"></div>;

  return (
    <div className="flex flex-col h-full bg-[#e2e8f0] font-sans" onMouseUp={handleMouseUp}>
      
      {/* --- ICON TOOLBAR (Matches Screenshot Top) --- */}
      <div className="h-9 bg-[#f1f5f9] border-b border-gray-300 flex items-center px-1 shadow-sm select-none">
          {/* New / Open / Save / Delete */}
          <IconBtn icon={FilePlus} label="New" color="text-yellow-600"/>
          <IconBtn icon={FolderOpen} label="Open Excel" onClick={triggerImport} color="text-yellow-600"/>
          <IconBtn icon={Save} label="Save" color="text-blue-600"/>
          <IconBtn icon={Trash2} label="Delete" color="text-red-500"/>
          <Divider/>
          
          {/* View Controls */}
          <IconBtn icon={Search} label="Search" color="text-gray-600"/>
          <Divider/>
          
          {/* Navigation */}
          <IconBtn icon={ArrowDown} label="Down" color="text-blue-500"/>
          <IconBtn icon={ArrowUp} label="Up" color="text-blue-500"/>
          <Divider/>

          {/* Tools */}
          <IconBtn icon={Calculator} label="Calculate" onClick={onCalculateAll} color="text-gray-600"/>
          <IconBtn icon={Pin} label="Pin" color="text-gray-600"/>
          <IconBtn icon={Printer} label="Print" color="text-gray-600"/>
          <Divider/>
          <IconBtn icon={FileSpreadsheet} label="Export" onClick={onExport} color="text-green-600"/>
      </div>

      <div className="flex flex-1 overflow-hidden">
          
          {/* --- LEFT SIDEBAR (Cable Group Tree) --- */}
          <div className="w-48 bg-white border-r border-gray-300 flex flex-col shadow-inner">
              <div className="p-2 border-b border-gray-200 bg-gray-50">
                   <div className="text-[10px] font-bold text-gray-500 mb-1">Search</div>
                   <div className="flex gap-1">
                       <select className="text-[10px] border border-gray-300 rounded px-1 w-20 bg-white">
                           <option>Cable Name</option>
                       </select>
                       <input 
                           className="flex-1 border border-gray-300 rounded px-1 text-[10px]" 
                           value={filterName}
                           onChange={e => setFilterName(e.target.value)}
                       />
                   </div>
                   <button className="w-full mt-1 bg-gray-200 border border-gray-300 text-[10px] text-gray-700 font-bold py-0.5 rounded hover:bg-gray-300">
                       SEARCH
                   </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                  <div className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer hover:bg-blue-50">
                      <div className="w-3 h-3 border border-gray-400 flex items-center justify-center text-[8px]">+</div>
                      <Folder size={12} className="text-yellow-500"/>
                      <span>Cable Group</span>
                  </div>
                  <div className="pl-4 mt-1 flex items-center gap-1 text-xs text-gray-700 cursor-pointer hover:bg-blue-50">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <span>No Group</span>
                  </div>
              </div>
          </div>

          {/* --- MAIN CONTENT AREA --- */}
          <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden">
              
              {/* --- DETAIL PANEL (Middle Section) --- */}
              <div className="bg-[#f8fafc] p-2 border-b border-gray-300 flex gap-4 min-h-[160px] text-gray-800">
                  {/* Left Column: Basic Info */}
                  <div className="w-64 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                          <label className="w-20 text-[10px] font-bold text-gray-600">CABLE NAME</label>
                          <input className="flex-1 border border-gray-300 bg-red-50 px-1 py-0.5 text-xs font-bold" value={selectedCable?.name || ''} readOnly/>
                      </div>
                      <div className="flex items-center gap-2">
                          <label className="w-20 text-[10px] font-bold text-gray-600">CABLE TYPE</label>
                          <input className="flex-1 border border-gray-300 bg-white px-1 py-0.5 text-xs" value={selectedCable?.type || ''} readOnly/>
                      </div>
                      <div className="flex items-center gap-2">
                          <label className="w-20 text-[10px] font-bold text-gray-600">SUPPLY DK</label>
                          <input className="flex-1 border border-gray-300 bg-white px-1 py-0.5 text-xs" value={selectedCable?.supplyDeck || ''} readOnly/>
                      </div>
                      <div className="flex items-center gap-2">
                          <label className="w-20 text-[10px] font-bold text-gray-600">LENGTH</label>
                          <div className="flex gap-1 flex-1">
                              <input className="w-12 border border-gray-300 bg-white px-1 py-0.5 text-xs text-right" value={selectedCable?.length || ''} readOnly/>
                              <label className="text-[10px] font-bold text-gray-600 pt-1">Weight</label>
                              <input className="flex-1 border border-gray-300 bg-white px-1 py-0.5 text-xs text-right" value={selectedCable?.weight || ''} readOnly/>
                          </div>
                      </div>
                      
                      <div className="mt-2 border border-blue-200 bg-blue-50 p-1 rounded">
                          <div className="text-[10px] font-bold text-blue-800 bg-blue-200 px-1 mb-1">REV. COMMENT</div>
                          <div className="text-[10px] text-blue-900 h-8 overflow-y-auto">
                              {selectedCable?.remark || 'No comments'}
                          </div>
                      </div>
                  </div>

                  {/* Center Column: FROM / TO */}
                  <div className="flex-1 flex gap-4">
                      {/* FROM */}
                      <div className="flex-1 flex flex-col gap-1">
                          <div className="text-[10px] font-bold text-gray-800 border-b border-gray-300 mb-1">FROM</div>
                          <div className="flex items-center gap-2">
                              <label className="w-10 text-[10px] font-bold text-gray-500">DECK</label>
                              <input className="w-20 border border-gray-300 bg-white px-1 py-0.5 text-xs" value={selectedCable?.fromDeck || ''} readOnly/>
                          </div>
                          <div className="flex items-center gap-2">
                              <label className="w-10 text-[10px] font-bold text-gray-500">NODE</label>
                              <input className="flex-1 border border-gray-300 bg-white px-1 py-0.5 text-xs font-bold" value={selectedCable?.fromNode || ''} readOnly/>
                              <label className="text-[10px] text-gray-500">REST</label>
                              <input className="w-8 border border-gray-300 bg-white px-1 py-0.5 text-xs text-center" value={selectedCable?.fromRest || ''} readOnly/>
                          </div>
                          <div className="flex items-center gap-2">
                              <label className="w-10 text-[10px] font-bold text-gray-500">EQUIP</label>
                              <input className="flex-1 border border-gray-300 bg-white px-1 py-0.5 text-xs" value={selectedCable?.fromEquip || ''} readOnly/>
                          </div>
                      </div>

                      {/* TO */}
                      <div className="flex-1 flex flex-col gap-1">
                          <div className="text-[10px] font-bold text-gray-800 border-b border-gray-300 mb-1">TO</div>
                          <div className="flex items-center gap-2">
                              <label className="w-10 text-[10px] font-bold text-gray-500">DECK</label>
                              <input className="w-20 border border-gray-300 bg-white px-1 py-0.5 text-xs" value={selectedCable?.toDeck || ''} readOnly/>
                          </div>
                          <div className="flex items-center gap-2">
                              <label className="w-10 text-[10px] font-bold text-gray-500">NODE</label>
                              <input className="flex-1 border border-gray-300 bg-white px-1 py-0.5 text-xs font-bold" value={selectedCable?.toNode || ''} readOnly/>
                              <label className="text-[10px] text-gray-500">REST</label>
                              <input className="w-8 border border-gray-300 bg-white px-1 py-0.5 text-xs text-center" value={selectedCable?.toRest || ''} readOnly/>
                          </div>
                          <div className="flex items-center gap-2">
                              <label className="w-10 text-[10px] font-bold text-gray-500">EQUIP</label>
                              <input className="flex-1 border border-gray-300 bg-white px-1 py-0.5 text-xs" value={selectedCable?.toEquip || ''} readOnly/>
                          </div>
                      </div>
                  </div>

                  {/* Right Column: Routing & Check Node */}
                  <div className="w-64 flex flex-col gap-1 border-l border-gray-200 pl-2">
                       <div className="flex items-center gap-2">
                          <label className="w-20 text-[10px] font-bold text-gray-600">CHECK NODE</label>
                          <input className="flex-1 border border-gray-300 bg-white px-1 py-0.5 text-xs" value={selectedCable?.checkNode || ''} readOnly/>
                       </div>
                       
                       <div className="flex-1 bg-white border border-gray-300 rounded mt-2 p-1 relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-full bg-blue-100 text-[9px] font-bold px-1 border-b border-blue-200 text-blue-800">CABLE PATH</div>
                           <div className="mt-4 text-[10px] font-mono leading-tight h-full overflow-auto break-all text-gray-800">
                               {selectedCable?.path || selectedCable?.calculatedPath?.join(',') || ''}
                           </div>
                       </div>

                       <div className="flex gap-2 mt-1">
                           <button 
                             onClick={() => selectedCable && onCalculateRoute(selectedCable)}
                             className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1 rounded shadow"
                           >
                               ROUTE
                           </button>
                           <div className="bg-yellow-100 border border-yellow-300 px-2 flex items-center justify-center font-bold text-xs text-yellow-800 rounded min-w-[60px]">
                               {selectedCable?.calculatedLength ? selectedCable.calculatedLength.toFixed(0) : 0}m
                           </div>
                       </div>
                  </div>
              </div>

              {/* --- DATA GRID --- */}
              <div className="flex-1 overflow-auto bg-white border-t border-gray-300 relative custom-scrollbar select-none">
                 <table className="w-full text-left border-collapse min-w-max">
                     <thead className="bg-[#e2e8f0] text-gray-700 sticky top-0 z-10 shadow-sm h-7 text-[10px]">
                         <tr>
                             {FIXED_COLUMNS.map(col => (
                                 <th key={col.key} className={`px-1 font-bold border-r border-gray-300 border-b uppercase whitespace-nowrap ${col.width} text-center`}>
                                     {col.label}
                                 </th>
                             ))}
                             <th className="px-1 w-8 font-bold text-center border-b border-gray-300">3D</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-200 bg-white">
                         {filteredCables.map((cable, idx) => {
                             const isSelected = selectedIds.has(cable.id);
                             return (
                                 <tr 
                                    key={cable.id}
                                    onMouseDown={(e) => handleRowMouseDown(e, cable.id, idx)}
                                    onMouseEnter={() => handleRowMouseEnter(idx)}
                                    onClick={() => {
                                        onSelectCable(cable);
                                    }}
                                    className={`
                                        cursor-pointer text-[11px] h-6
                                        ${isSelected ? 'bg-[#0078d7] text-white' : 'text-gray-800 hover:bg-blue-50 odd:bg-white even:bg-[#f8fafc]'}
                                    `}
                                 >
                                     {FIXED_COLUMNS.map(col => (
                                         <td key={`${cable.id}-${col.key}`} className={`px-1 border-r border-gray-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] ${!isSelected && col.bg ? 'bg-opacity-50 '+col.bg : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                                             {/* If selected, override text color to white, else use col.color or default */}
                                             <span className={isSelected ? 'text-white' : (col.color || 'text-gray-800')}>{cable[col.key]}</span>
                                         </td>
                                     ))}
                                     <td className="px-1 border-l border-gray-200 text-center sticky right-0 bg-inherit z-10">
                                         <button onClick={(e) => {e.stopPropagation(); onView3D(cable);}} className={`hover:text-seastar-pink ${isSelected ? 'text-white' : 'text-gray-500'}`}><Eye size={12}/></button>
                                     </td>
                                 </tr>
                             );
                         })}
                     </tbody>
                 </table>
              </div>
          </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="h-6 bg-[#f1f5f9] border-t border-gray-300 flex justify-between items-center px-2 text-[10px] text-gray-500">
          <div>Selected: <span className="font-bold text-blue-600">{selectedIds.size}</span></div>
          <div>Total Items: <span className="font-bold">{filteredCables.length}</span></div>
      </div>
    </div>
  );
};

export default CableList;