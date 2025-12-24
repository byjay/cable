
import React, { useMemo, useState } from 'react';
import { Cable } from '../types';
import { FileSpreadsheet, Search } from 'lucide-react';
import { ExcelService } from '../services/excelService';

interface CableRequirementReportProps {
  cables: Cable[];
}

const SYSTEMS = [
    { key: 'CONT', label: 'Con.', match: ['CONT', 'CONTROL', 'C'] },
    { key: 'FIRE', label: 'Fir.', match: ['FIRE', 'FD', 'F'] },
    { key: 'LIGHT', label: 'Lig.', match: ['LIGHT', 'LT', 'L'] },
    { key: 'NAV', label: 'Nav.', match: ['NAV', 'COMM', 'N', 'CAT'] },
    { key: 'POWER', label: 'Pow.', match: ['POWER', 'HV', 'LV', 'P'] },
    { key: 'AUTO', label: 'Aut.', match: ['AUTO', 'A', 'AMS'] },
    { key: 'DEFAULT', label: 'D', match: [] }
];

const CableRequirementReport: React.FC<CableRequirementReportProps> = ({ cables }) => {
  const [filterType, setFilterType] = useState('');

  const aggregatedData = useMemo(() => {
    const map: {[type: string]: any} = {};

    cables.forEach(cable => {
        const type = cable.type || 'UNKNOWN';
        if (!map[type]) {
            map[type] = {
                type: type,
                totalLen: 0,
                totalWt: 0,
                systems: {}
            };
            SYSTEMS.forEach(s => {
                map[type].systems[s.key] = { len: 0, wt: 0 };
            });
        }

        const len = cable.calculatedLength || cable.length || 0;
        const wt = cable.weight || 0; 
        
        map[type].totalLen += len;
        map[type].totalWt += wt;

        const sysStr = (cable.system || '').toUpperCase();
        let matchedSys = 'DEFAULT';
        for (const s of SYSTEMS) {
            if (s.key !== 'DEFAULT' && s.match.some(m => sysStr.includes(m))) {
                matchedSys = s.key;
                break;
            }
        }

        map[type].systems[matchedSys].len += len;
        map[type].systems[matchedSys].wt += wt;
    });

    return Object.values(map)
        .filter((r: any) => r.type.toLowerCase().includes(filterType.toLowerCase()))
        .sort((a: any, b: any) => a.type.localeCompare(b.type));
  }, [cables, filterType]);

  const handleExport = () => {
      // Flatten for export
      const exportData = aggregatedData.map((r: any) => {
          const row: any = { 'Cable Type': r.type };
          SYSTEMS.forEach(sys => {
              row[`${sys.key}_Len`] = r.systems[sys.key].len;
              row[`${sys.key}_Wt`] = r.systems[sys.key].wt;
          });
          row['Total_Len'] = r.totalLen;
          row['Total_Wt'] = r.totalWt;
          return row;
      });
      ExcelService.exportToExcel(exportData, "CableRequirement_BOM");
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a]">
       {/* Toolbar */}
       <div className="bg-[#1e293b] border-b border-[#334155] p-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-[#0f172a] border border-[#334155] rounded px-2 py-1">
                 <span className="text-[10px] text-gray-400 font-bold">CABLE TYPE</span>
                 <input 
                    className="bg-transparent outline-none text-xs text-white w-32" 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                 />
                 <button className="bg-[#334155] px-2 py-0.5 text-[10px] text-white border border-gray-600 rounded">SEARCH</button>
             </div>
        </div>
        <button onClick={handleExport} className="bg-green-800 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold border border-green-600 flex items-center gap-1">
            <FileSpreadsheet size={14}/> EXPORT EXCEL
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-[#0f172a] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="bg-white text-[#0f172a] sticky top-0 z-10 shadow-md">
            <tr>
              <th rowSpan={2} className="p-2 text-[10px] font-bold border-r border-gray-300 uppercase w-12 text-center bg-gray-100">No</th>
              <th rowSpan={2} className="p-2 text-[10px] font-bold border-r border-gray-300 uppercase w-32 bg-gray-100 sticky left-0 z-20 shadow-md">Cable Type</th>
              {SYSTEMS.map(sys => (
                  <th key={sys.key} colSpan={2} className="p-1 text-[10px] font-bold border-r border-gray-300 border-b uppercase text-center w-32 bg-gray-50">
                      {sys.label}
                  </th>
              ))}
              <th colSpan={2} className="p-1 text-[10px] font-bold border-b border-gray-300 uppercase text-center w-32 bg-yellow-100">Total</th>
            </tr>
            <tr>
                {SYSTEMS.map(sys => (
                    <React.Fragment key={`${sys.key}-sub`}>
                        <th className="p-1 text-[9px] font-bold border-r border-gray-300 text-center w-16 bg-gray-50">Length</th>
                        <th className="p-1 text-[9px] font-bold border-r border-gray-300 text-center w-16 bg-gray-50">Weight</th>
                    </React.Fragment>
                ))}
                <th className="p-1 text-[9px] font-bold border-r border-gray-300 text-center w-16 bg-yellow-50">Length</th>
                <th className="p-1 text-[9px] font-bold text-center w-16 bg-yellow-50">Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]">
            {aggregatedData.map((row: any, idx) => (
              <tr key={row.type} className="hover:bg-blue-50 transition-colors text-xs text-gray-800 bg-white border-b border-gray-200">
                <td className="p-1 border-r border-gray-200 text-center bg-gray-50">{idx + 1}</td>
                <td className="p-1 border-r border-gray-200 font-bold text-blue-800 sticky left-0 bg-white z-10 shadow-sm">{row.type}</td>
                {SYSTEMS.map(sys => (
                    <React.Fragment key={`${sys.key}-val`}>
                        <td className="p-1 border-r border-gray-200 text-right">{row.systems[sys.key].len > 0 ? row.systems[sys.key].len.toLocaleString() : ''}</td>
                        <td className="p-1 border-r border-gray-200 text-right text-gray-500">{row.systems[sys.key].wt > 0 ? row.systems[sys.key].wt.toLocaleString() : ''}</td>
                    </React.Fragment>
                ))}
                <td className="p-1 border-r border-gray-200 text-right font-bold text-black bg-yellow-50">{row.totalLen.toLocaleString()}</td>
                <td className="p-1 text-right font-bold text-gray-600 bg-yellow-50">{row.totalWt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CableRequirementReport;
