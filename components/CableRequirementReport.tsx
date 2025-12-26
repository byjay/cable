
import React, { useMemo, useState } from 'react';
import { Cable } from '../types';
import { FileSpreadsheet, Search, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { ExcelService } from '../services/excelService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [projectNo, setProjectNo] = useState('EB-101-R1');
  const [projectName, setProjectName] = useState('MV PANOPI');
  const [posDate, setPosDate] = useState(() => new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2));

  // Sorting state
  const [sortCol, setSortCol] = useState('type');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const aggregatedData = useMemo(() => {
    const map: { [type: string]: any } = {};

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
      .sort((a: any, b: any) => {
        let valA = a[sortCol];
        let valB = b[sortCol];

        // Handle system columns (e.g., 'CONT_Len')
        if (!valA && sortCol.includes('_')) {
          const [sysKey, field] = sortCol.split('_'); // CONT, Len
          valA = a.systems[sysKey] ? a.systems[sysKey][field.toLowerCase()] : 0;
          valB = b.systems[sysKey] ? b.systems[sysKey][field.toLowerCase()] : 0;
        }

        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? (valA - valB) : (valB - valA);
      });
  }, [cables, filterType, sortCol, sortAsc]);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronDown size={10} className="inline ml-1 text-gray-300 opacity-50" />;
    return sortAsc ? <ChevronUp size={10} className="inline ml-1 text-blue-600" /> : <ChevronDown size={10} className="inline ml-1 text-blue-600" />;
  };

  const handleExport = () => {
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

  const handleCreatePOS = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const filename = `POS-${projectNo}_${projectName}_ELECTRIC CABLE (POS)_${posDate}.pdf`;

    doc.setFontSize(14);
    doc.text(`${projectName} ELECTRIC CABLE REQUIREMENT (POS)`, 14, 15);
    doc.setFontSize(10);
    doc.text(`POS No: ${projectNo}`, 14, 22);
    doc.text(`Date: 20${posDate.substring(0, 2)}-${posDate.substring(2, 4)}-${posDate.substring(4, 6)}`, 250, 22);

    const tableHead = [
      ['No', 'Cable Type', ...SYSTEMS.flatMap(s => [s.label + ' Length', s.label + ' Weight']), 'Total Length', 'Total Weight']
    ];

    const tableBody = aggregatedData.map((row: any, i) => [
      i + 1,
      row.type,
      ...SYSTEMS.flatMap(s => [
        row.systems[s.key].len > 0 ? row.systems[s.key].len.toLocaleString() : '',
        row.systems[s.key].wt > 0 ? row.systems[s.key].wt.toLocaleString() : ''
      ]),
      row.totalLen.toLocaleString(),
      row.totalWt.toLocaleString()
    ]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [22, 160, 133] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25, fontStyle: 'bold' }
      }
    });

    doc.save(filename);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a]">
      {/* Toolbar */}
      <div className="bg-[#1e293b] border-b border-[#334155] p-2 flex flex-col md:flex-row gap-2 justify-between items-start md:items-center">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-[#0f172a] border border-[#334155] rounded px-2 py-1">
            <span className="text-[10px] text-gray-400 font-bold">CABLE TYPE</span>
            <input
              className="bg-transparent outline-none text-xs text-white w-24"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            />
            <button className="bg-[#334155] px-2 py-0.5 text-[10px] text-white border border-gray-600 rounded hover:bg-gray-700">SEARCH</button>
          </div>

          {/* POS Inputs */}
          <div className="flex items-center gap-2 bg-[#0f172a] border border-[#334155] rounded px-2 py-1">
            <span className="text-[10px] text-gray-400 font-bold">PROJ NO</span>
            <input className="bg-transparent outline-none text-xs text-yellow-300 w-20 font-mono" value={projectNo} onChange={e => setProjectNo(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-[#0f172a] border border-[#334155] rounded px-2 py-1">
            <span className="text-[10px] text-gray-400 font-bold">PROJ NAME</span>
            <input className="bg-transparent outline-none text-xs text-yellow-300 w-24 font-mono" value={projectName} onChange={e => setProjectName(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-[#0f172a] border border-[#334155] rounded px-2 py-1">
            <span className="text-[10px] text-gray-400 font-bold">DATE(YYMMDD)</span>
            <input className="bg-transparent outline-none text-xs text-yellow-300 w-16 font-mono" value={posDate} onChange={e => setPosDate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleCreatePOS} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold border border-blue-500 flex items-center gap-1 shadow-md">
            <FileText size={14} /> CREATE POS
          </button>
          <button onClick={handleExport} className="bg-green-800 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold border border-green-600 flex items-center gap-1 shadow-md">
            <FileSpreadsheet size={14} /> EXPORT EXCEL
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#0f172a] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="bg-white text-[#0f172a] sticky top-0 z-10 shadow-md">
            <tr>
              <th rowSpan={2} className="p-2 text-[10px] font-bold border-r border-gray-300 uppercase w-12 text-center bg-gray-100">No</th>
              <th rowSpan={2} onClick={() => handleSort('type')} className="p-2 text-[10px] font-bold border-r border-gray-300 uppercase w-32 bg-gray-100 sticky left-0 z-20 shadow-md cursor-pointer hover:bg-gray-200">
                Cable Type <SortIcon col="type" />
              </th>
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
                  <th onClick={() => handleSort(`${sys.key}_Len`)} className="p-1 text-[9px] font-bold border-r border-gray-300 text-center w-16 bg-gray-50 cursor-pointer hover:bg-gray-100">Length <SortIcon col={`${sys.key}_Len`} /></th>
                  <th onClick={() => handleSort(`${sys.key}_Wt`)} className="p-1 text-[9px] font-bold border-r border-gray-300 text-center w-16 bg-gray-50 cursor-pointer hover:bg-gray-100">Weight <SortIcon col={`${sys.key}_Wt`} /></th>
                </React.Fragment>
              ))}
              <th onClick={() => handleSort('totalLen')} className="p-1 text-[9px] font-bold border-r border-gray-300 text-center w-16 bg-yellow-50 cursor-pointer hover:bg-yellow-200">Length <SortIcon col="totalLen" /></th>
              <th onClick={() => handleSort('totalWt')} className="p-1 text-[9px] font-bold text-center w-16 bg-yellow-50 cursor-pointer hover:bg-yellow-200">Weight <SortIcon col="totalWt" /></th>
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
