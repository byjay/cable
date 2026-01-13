import React, { useState, useEffect } from 'react';
import { Download, Upload, ChevronDown, ChevronUp, Plus, Minus, Filter, Save, PieChart, Table } from 'lucide-react';
import * as XLSX from 'xlsx';

// Props to integrate with the main layout
interface BOMProps {
  onSaveToMaster?: (data: any[]) => void;
  onPivotRequest?: (data: any[]) => void;
}

const ExcelDataProcessor: React.FC<BOMProps> = ({ onSaveToMaster, onPivotRequest }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [mergedData, setMergedData] = useState<any[]>([]);
  const [displayData, setDisplayData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [baseHeaders, setBaseHeaders] = useState<string[]>([]);
  const [additionalHeaders, setAdditionalHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [pivotColumn, setPivotColumn] = useState('');

  const baseColumnPatterns = [
    'NO', 'FILENAME', 'FILE NAME', 'rev', 'dwg code', 'BLOCK', 'MOD', 'MOD. NO',
    'OFF', 'WLEG', 'WNO', 'P. NO', 'WELD. LENG.', 'DETAIL', 'WORKSCOPE',
    'SIDE', 'LEG (WLEG)', 'LENGTH', 'DETAIL VIEW', 'WELD UNIQUE ID', 'SHEET'
  ];

  const extractMatNoPattern = (value: any) => {
    if (!value) return null;
    const match = String(value).match(/([A-Z]\d+)-([A-Z]+\d+)-(\d+)/i);
    return match ? match[0] : String(value).trim();
  };

  const isBaseColumn = (header: string) => {
    return baseColumnPatterns.some(pattern =>
      new RegExp(pattern, 'i').test(header)
    );
  };

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;

    const fileDataPromises = Array.from(uploadedFiles).map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      return {
        name: file.name,
        headers: jsonData.length > 0 ? Object.keys(jsonData[0] as object) : [],
        data: jsonData
      };
    });

    const newFiles = await Promise.all(fileDataPromises);
    const allFiles = [...files, ...newFiles];
    setFiles(allFiles);

    if (allFiles.length >= 2) {
      mergeFiles(allFiles);
    } else if (allFiles.length === 1) {
      const fileData = allFiles[0];
      processHeaders(fileData.headers);
      setMergedData(fileData.data);
      setDisplayData(fileData.data);

      const weldId = fileData.headers.find((h: string) => /weld.*unique.*id/i.test(h));
      if (weldId) setPivotColumn(weldId);
    }
  };

  const processHeaders = (allHeaders: string[]) => {
    const base = allHeaders.filter(h => isBaseColumn(h));
    const additional = allHeaders.filter(h => !isBaseColumn(h));

    setBaseHeaders(base);
    setAdditionalHeaders(additional);
    setHeaders([...base, ...additional]);
    setSelectedHeaders(new Set(base));
  };

  const mergeFiles = (filesToMerge: any[]) => {
    // [Logic Improvement] Multi-file merge strategy
    // Ideally we merge sequentially. For now, let's take the first two for proof of concept or iterate.
    // The user code specifically merged 2 files. Let's make it robust to handle the accumulated 'mergedData' + 'new file'.
    // For simplicity adapting user's code directly for 2 files logic first.

    if (filesToMerge.length < 2) return;

    const [file1, file2] = filesToMerge; // merging first two for now

    const matNoCols1 = file1.headers.filter((h: string) => /mat\s*no/i.test(h));
    const matNoCols2 = file2.headers.filter((h: string) => /mat\s*no/i.test(h));

    const merged: any[] = [];
    const allHeaders = [...new Set([...file1.headers, ...file2.headers])] as string[];

    // Left Join Logic: File1 (Base) -> File2
    file1.data.forEach((row1: any) => {
      let matchedRow = null;

      for (const matCol1 of matNoCols1) {
        const pattern1 = extractMatNoPattern(row1[matCol1]);
        if (!pattern1) continue;

        for (const row2 of file2.data) {
          for (const matCol2 of matNoCols2) {
            const pattern2 = extractMatNoPattern(row2[matCol2]);
            if (pattern1 === pattern2) {
              matchedRow = { ...row1, ...row2 };
              break;
            }
          }
          if (matchedRow) break;
        }
        if (matchedRow) break;
      }

      merged.push(matchedRow || row1);
    });

    // Add Remaining Rows from File2
    file2.data.forEach((row2: any) => {
      let isMatched = false;

      for (const matCol2 of matNoCols2) {
        const pattern2 = extractMatNoPattern(row2[matCol2]);
        if (!pattern2) continue;

        for (const row1 of file1.data) {
          for (const matCol1 of matNoCols1) {
            const pattern1 = extractMatNoPattern(row1[matCol1]);
            if (pattern1 === pattern2) {
              isMatched = true;
              break;
            }
          }
          if (isMatched) break;
        }
        if (isMatched) break;
      }

      if (!isMatched) {
        merged.push(row2);
      }
    });

    processHeaders(allHeaders);
    setMergedData(merged);
    setDisplayData(merged);

    const weldId = allHeaders.find((h: string) => /weld.*unique.*id/i.test(h));
    if (weldId) setPivotColumn(weldId);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...displayData].sort((a, b) => {
      const aVal = a[key] || '';
      const bVal = b[key] || '';

      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      return direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    setDisplayData(sorted);
  };

  const toggleHeaderSelection = (header: string) => {
    const newSelected = new Set(selectedHeaders);
    if (newSelected.has(header)) {
      newSelected.delete(header);
    } else {
      newSelected.add(header);
    }
    setSelectedHeaders(newSelected);
  };

  const applyFilter = () => {
    if (!filterText.trim()) {
      setDisplayData(mergedData);
      return;
    }

    const filtered = mergedData.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(filterText.toLowerCase())
      )
    );
    setDisplayData(filtered);
  };

  const downloadResult = () => {
    const visibleHeaders = headers.filter(h => selectedHeaders.has(h));
    const ws_data = [visibleHeaders];

    displayData.forEach(row => {
      ws_data.push(visibleHeaders.map(h => row[h] || ''));
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, 'processed_data.xlsx');
  };

  // New: Save to Master
  const handleSave = () => {
    if (onSaveToMaster) {
      onSaveToMaster(mergedData);
      alert(`Saved ${mergedData.length} rows to Master BOM.`);
    }
  };

  // New: Trigger Pivot
  const handlePivot = () => {
    if (onPivotRequest) {
      onPivotRequest(mergedData);
    }
  };

  const visibleHeaders = headers.filter(h => selectedHeaders.has(h));

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 px-4 py-2 flex items-center gap-4 shadow-md shrink-0">
        <div className="bg-white px-3 py-1 rounded text-sm font-semibold text-green-800 border border-green-800/10 shadow-sm">
          Excel Data Processor (Advanced)
        </div>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-sm transition-colors border border-white/20"
        >
          <Save size={16} />
          <span>Save to Master</span>
        </button>
        <button
          onClick={handlePivot}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-colors"
        >
          <PieChart size={16} />
          <span>Pivot & Graph</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <label className="flex flex-col items-center cursor-pointer hover:bg-gray-100 px-3 py-2 rounded transition-colors group">
            <Upload size={24} className="text-yellow-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-600">Import Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
          </label>

          <button
            onClick={downloadResult}
            className="flex flex-col items-center hover:bg-gray-100 px-3 py-2 rounded transition-colors group"
          >
            <Download size={24} className="text-gray-600 mb-1 group-hover:text-green-600 transition-colors" />
            <span className="text-xs font-medium text-gray-600">Export Result</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-green-500/20">
            <Filter size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Filter contents..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
              className="outline-none text-sm w-64 text-gray-700 placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-800">Ready</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Column Selector */}
        <div className="w-72 border-r bg-gray-50 overflow-y-auto custom-scrollbar">
          <div className="p-4">
            <div className="bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-bold mb-4 flex items-center gap-2 shadow-sm">
              <Filter size={14} />
              PIVOT SLICERS
            </div>

            {/* Base Columns */}
            <div className="mb-6">
              <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider px-1">Base Columns</div>
              <div className="space-y-1">
                {baseHeaders.map(header => (
                  <label key={header} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded-md cursor-pointer text-sm transition-colors border border-transparent hover:border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedHeaders.has(header)}
                      onChange={() => toggleHeaderSelection(header)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500 border-gray-300"
                    />
                    <span className="text-gray-700">{header}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Columns */}
            {additionalHeaders.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider px-1 flex items-center gap-2">
                  <Plus size={14} />
                  Additional Columns
                </div>
                <div className="space-y-1">
                  {additionalHeaders.map(header => (
                    <label key={header} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded-md cursor-pointer text-sm transition-colors border border-transparent hover:border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedHeaders.has(header)}
                        onChange={() => toggleHeaderSelection(header)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-gray-700 truncate" title={header}>{header}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Data Table */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {displayData.length > 0 ? (
            <div className="min-w-full inline-block align-middle">
              <table className="w-full border-collapse text-sm bg-white shadow-sm">
                <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
                  <tr>
                    <th className="border-b border-r border-gray-300/50 px-3 py-2 text-center font-semibold bg-gray-50 w-16 text-gray-500">
                      No.
                    </th>
                    {visibleHeaders.map(header => (
                      <th
                        key={header}
                        onClick={() => handleSort(header)}
                        className="border-b border-r border-gray-300/50 px-3 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200 transition select-none text-gray-700 min-w-[120px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{header}</span>
                          {sortConfig.key === header && (
                            sortConfig.direction === 'asc'
                              ? <ChevronUp size={14} className="text-green-600" />
                              : <ChevronDown size={14} className="text-green-600" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayData.map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-yellow-50/50 transition-colors group">
                      <td className="px-3 py-2 text-center bg-gray-50/50 font-medium text-gray-500 text-xs border-r border-gray-100">
                        {index + 1}
                      </td>
                      {visibleHeaders.map(header => (
                        <td
                          key={header}
                          className={`px-3 py-2 truncate max-w-[200px] border-r border-gray-100 text-gray-700 ${header === pivotColumn ? 'bg-yellow-50 font-semibold text-yellow-900' : ''
                            }`}
                          title={String(row[header] || '')}
                        >
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white">
              <div className="p-8 rounded-full bg-gray-50 mb-4 animate-in fade-in zoom-in duration-300">
                <Upload size={48} className="text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Data Loaded</h3>
              <p className="text-sm text-gray-500 max-w-sm text-center">
                Import Excel files to automatically merge and process BOM data. Support for automated matching of 'Mat No' and 'Weld ID'.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 px-4 py-2 text-white text-xs flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <Table size={14} className="text-green-300" />
            Total: <strong className="text-white text-sm">{mergedData.length.toLocaleString()}</strong> rows
          </span>
          <span className="flex items-center gap-2">
            <Filter size={14} className="text-green-300" />
            Shown: <strong className="text-white text-sm">{displayData.length.toLocaleString()}</strong> rows
          </span>
          {files.length > 0 && (
            <span className="bg-green-800/50 px-2 py-1 rounded">
              Files: <strong>{files.length}</strong>
            </span>
          )}
        </div>
        <div>
          {pivotColumn && (
            <span className="flex items-center gap-2 text-yellow-200">
              Pivot Column: <strong className="text-white">{pivotColumn}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelDataProcessor;