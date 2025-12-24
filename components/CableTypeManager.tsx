import React, { useState, useMemo } from 'react';
import { GenericRow } from '../types';
import { Search, RotateCcw, Save } from 'lucide-react';

interface CableTypeManagerProps {
  data: GenericRow[];
}

const CableTypeManager: React.FC<CableTypeManagerProps> = ({ data }) => {
  const [selectedType, setSelectedType] = useState<GenericRow | null>(null);
  const [searchCode, setSearchCode] = useState('');

  // Fields to display in the detail panel (matching the screenshot)
  const detailFields = [
    { key: 'TYPE_CODE', label: 'CODE', type: 'text', width: 'w-32' },
    { key: 'TYPE_ABBR', label: 'ABBR', type: 'text', width: 'w-32' },
    { key: 'TYPE_WEIGHT', label: 'WEIGHT', type: 'number', width: 'w-24' },
    { key: 'OUT_DIA', label: 'OUT DIA', type: 'number', width: 'w-24' },
    { key: 'INSERT_BLOCK', label: 'INSERT BLOCK', type: 'text', width: 'w-24' },
    { key: 'TYPE_SPEC', label: 'SPEC', type: 'text', width: 'flex-1' }, // Full width
    { key: 'TYPE_AREA', label: 'AREA', type: 'number', width: 'w-24' },
    { key: 'DRUM_LEN', label: 'STD DRUM', type: 'number', width: 'w-24' },
    { key: 'BIND_GROUP', label: 'BIND GROUP', type: 'text', width: 'w-24' },
  ];

  const filteredData = useMemo(() => {
    return data.filter(item => 
      String(item.TYPE_CODE || '').toLowerCase().includes(searchCode.toLowerCase())
    );
  }, [data, searchCode]);

  const handleRowClick = (row: GenericRow) => {
    setSelectedType(row);
  };

  const handleInputChange = (key: string, val: string) => {
      // In a real app, this would update the state or call an onUpdate prop
      if (!selectedType) {
          if (key === 'TYPE_CODE') setSearchCode(val);
      }
  };

  const getValue = (key: string) => {
      if (selectedType) return String(selectedType[key] || '');
      if (key === 'TYPE_CODE') return searchCode;
      return '';
  };

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="flex flex-col h-full bg-seastar-900">
        {/* UPPER PANEL */}
        <div className={`glass-panel p-4 mb-4 rounded-lg shadow-lg border transition-all duration-300 ${selectedType ? 'border-seastar-pink bg-seastar-800/90' : 'border-seastar-700'}`}>
            <div className="flex items-center justify-between mb-3 border-b border-seastar-700 pb-2">
                <h4 className={`font-bold uppercase text-sm tracking-wider flex items-center gap-2 ${selectedType ? 'text-seastar-pink' : 'text-seastar-cyan'}`}>
                    {selectedType ? 'CABLE TYPE DETAIL' : 'CABLE TYPE SEARCH'}
                </h4>
                <div className="flex gap-2">
                    {selectedType && (
                        <button onClick={() => setSelectedType(null)} className="bg-seastar-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1">
                            <RotateCcw size={12}/> LIST
                        </button>
                    )}
                    <button className="bg-seastar-cyan hover:bg-cyan-400 text-seastar-900 font-bold px-4 py-1 rounded text-xs flex items-center gap-1">
                        {selectedType ? <Save size={12}/> : <Search size={12}/>} {selectedType ? 'SAVE' : 'SEARCH'}
                    </button>
                </div>
            </div>

            {/* Form Layout matching Screenshot roughly */}
            <div className="grid grid-cols-12 gap-4 text-xs">
                {/* Row 1 */}
                <div className="col-span-4 flex items-center gap-2">
                    <label className="w-16 text-gray-400 font-mono">CODE</label>
                    <input 
                        type="text" 
                        value={getValue('TYPE_CODE')} 
                        onChange={(e) => handleInputChange('TYPE_CODE', e.target.value)}
                        className={`flex-1 border rounded px-2 py-1 outline-none ${selectedType ? 'bg-seastar-900 border-seastar-pink text-seastar-pink font-bold' : 'bg-seastar-800 border-seastar-600 text-white'}`}
                    />
                </div>
                <div className="col-span-4 flex items-center gap-2">
                    <label className="w-16 text-gray-400 font-mono">ABBR</label>
                    <input type="text" value={getValue('TYPE_ABBR')} readOnly={!selectedType} className="flex-1 bg-seastar-800 border border-seastar-600 rounded px-2 py-1 text-white"/>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                    <label className="w-16 text-gray-400 font-mono">WEIGHT</label>
                    <input type="number" value={getValue('TYPE_WEIGHT')} readOnly={!selectedType} className="w-full bg-seastar-800 border border-seastar-600 rounded px-2 py-1 text-white text-right"/>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                    <label className="w-16 text-gray-400 font-mono">OUT DIA</label>
                    <input type="number" value={getValue('OUT_DIA')} readOnly={!selectedType} className="w-full bg-seastar-800 border border-seastar-600 rounded px-2 py-1 text-white text-right"/>
                </div>

                {/* Row 2 */}
                <div className="col-span-4 flex items-center gap-2">
                    <label className="w-16 text-gray-400 font-mono">PROD NAME</label>
                    <input type="text" value={getValue('TYPE_SPEC')} readOnly={!selectedType} className="flex-1 bg-seastar-800 border border-seastar-600 rounded px-2 py-1 text-white"/>
                </div>
                <div className="col-span-4"></div> {/* Spacer */}
                <div className="col-span-2 flex items-center gap-2">
                    <label className="w-16 text-gray-400 font-mono">AREA</label>
                    <input type="number" value={getValue('TYPE_AREA')} readOnly={!selectedType} className="w-full bg-seastar-800 border border-seastar-600 rounded px-2 py-1 text-white text-right"/>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                    <label className="w-16 text-gray-400 font-mono">STD DRUM</label>
                    <input type="number" value={getValue('DRUM_LEN')} readOnly={!selectedType} className="w-full bg-seastar-800 border border-seastar-600 rounded px-2 py-1 text-white text-right"/>
                </div>
                
                {/* Row 3 Extra */}
                <div className="col-span-8"></div>
                <div className="col-span-2 flex items-center gap-2">
                     <label className="w-16 text-gray-400 font-mono">BIND GRP</label>
                     <input type="text" value={getValue('BIND_GROUP')} readOnly={!selectedType} className="w-full bg-seastar-800 border border-seastar-600 rounded px-2 py-1 text-white text-center"/>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                     <label className="w-16 text-gray-400 font-mono">INS BLK</label>
                     <input type="text" value={getValue('INSERT_BLOCK')} readOnly={!selectedType} className="w-full bg-seastar-800 border border-seastar-600 rounded px-2 py-1 text-white text-center"/>
                </div>
            </div>
        </div>

        {/* LOWER PANEL: LIST */}
        <div className="flex-1 overflow-auto rounded-lg border border-seastar-700 bg-seastar-800 shadow-inner custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-gray-300 text-seastar-900 sticky top-0 z-10 shadow-md">
                    <tr>
                        {columns.map(col => (
                            <th key={col} className="p-2 text-[10px] font-bold border-r border-gray-400 uppercase whitespace-nowrap">
                                {col.replace(/_/g, ' ')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-seastar-700">
                    {filteredData.map((row, idx) => (
                        <tr 
                            key={idx} 
                            onClick={() => handleRowClick(row)}
                            className={`hover:bg-seastar-700/50 transition-colors cursor-pointer text-xs ${selectedType === row ? 'bg-seastar-700 border-l-4 border-seastar-pink' : 'odd:bg-seastar-800 even:bg-seastar-800/80 text-gray-300'}`}
                        >
                            {columns.map(col => (
                                <td key={`${idx}-${col}`} className="p-2 border-r border-seastar-700 whitespace-nowrap">
                                    {String(row[col] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="bg-seastar-900 text-gray-500 text-[10px] p-2 border-t border-seastar-700 flex justify-between">
            <span>Total Records: {data.length}</span>
            <span>Filtered: {filteredData.length}</span>
        </div>
    </div>
  );
};

export default CableTypeManager;