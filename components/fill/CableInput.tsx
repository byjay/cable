import React, { useState, useEffect, useRef } from 'react';
import { CableData } from '../types';
import { Table, Trash2, RotateCcw, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CableInputProps {
  onDataChange: (data: CableData[]) => void;
}

// Data transcribed from user's Excel image
const DEFAULT_TEXT = `P-UV-01	MY4	13.2
P-UPS-03	MY4	13.2
P-UPS-02	DY4	15.9
P-UPS-01	DY4	15.9
P-TW-04J	MYS7	15.4
P-TW-04H	MYS4	13.4
P-TW-04G	MY12	19
P-TW-04F	MY12	19
P-TW-04E	MY4	13.2
P-TW-04D	MY4	13.2
P-TW-04C	MY12	19
P-TW-04B	DY1	13.7
P-TW-04A	DY1	13.7
P-TW-04	TY50	35
P-TW-03J	MYS7	15.4
P-TW-03H	MYS4	13.4
P-TW-03G	MY12	19
P-TW-03F	MY12	19
P-TW-03E	MY4	13.2
P-TW-03D	MY4	13.2
P-TW-03C	MY12	19
P-TW-03B	DY1	13.7
P-TW-03A	DY1	13.7
P-TW-03	TY50	35
P-TW-02K	MY12	19
P-TW-02J	MYS7	15.4
P-TW-02H	MYS4	13.4
P-TW-02G	MY12	19
P-TW-02F	MY12	19
P-TW-02E	MY4	13.2
P-TW-02D	MY4	13.2
P-TW-02C	MY12	19
P-TW-02B	DY1	13.7
P-TW-02A	DY1	13.7
P-TW-02	TY50	35
P-TW-01K	MY12	19
P-TW-01J	MYS7	15.4`;

const CableInput: React.FC<CableInputProps> = ({ onDataChange }) => {
  const [inputText, setInputText] = useState(DEFAULT_TEXT);
  const [parsedCount, setParsedCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseTextData = (text: string) => {
    const lines = text.trim().split('\n');
    const newData: CableData[] = [];
    const seenNames = new Set<string>();
    let duplicates = 0;
    
    lines.forEach((line, index) => {
      // Split by tab (Excel copy) or comma or multiple spaces
      const parts = line.split(/[\t,]+/).map(s => s.trim()).filter(s => s !== '');
      
      if (parts.length >= 3) {
        const name = parts[0];
        const type = parts[1];
        const od = parseFloat(parts[2]);

        if (!isNaN(od)) {
          // Check for duplicates
          if (seenNames.has(name)) {
            duplicates++;
            return; // Skip duplicate
          }
          
          seenNames.add(name);
          newData.push({
            id: `c-${index}`,
            name: name,
            type: type,
            od: od
          });
        }
      }
    });

    setParsedCount(newData.length);
    setDuplicateCount(duplicates);
    onDataChange(newData);
  };

  useEffect(() => {
    parseTextData(inputText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    parseTextData(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      let textOutput = "";
      data.forEach(row => {
        if (row.length >= 3) {
             const val1 = row[0] || "";
             const val2 = row[1] || "";
             const val3 = row[2];
             
             if (!isNaN(parseFloat(val3))) {
                 textOutput += `${val1}\t${val2}\t${val3}\n`;
             }
        }
      });

      setInputText(textOutput);
      parseTextData(textOutput);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const clearInput = () => {
    setInputText('');
    parseTextData('');
  };

  const resetDefault = () => {
    setInputText(DEFAULT_TEXT);
    parseTextData(DEFAULT_TEXT);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Table className="w-4 h-4" />
          Data Source
        </h3>
        <div className="flex gap-2">
            {duplicateCount > 0 && (
                <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                    {duplicateCount} Duplicates Removed
                </span>
            )}
            <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
            {parsedCount} cables
            </span>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex gap-2 mb-2">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2 w-full text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
                <FileSpreadsheet className="w-4 h-4" /> Upload Excel
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
            />
        </div>

        <p className="text-xs text-gray-400 uppercase font-bold mt-2">Or Paste Manually</p>
        <p className="text-xs text-gray-500 mb-1">
          Format: <strong>Name | Type | OD</strong>
        </p>
        <textarea
          className="flex-1 w-full p-3 font-mono text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Paste columns from Excel here..."
          value={inputText}
          onChange={handleTextChange}
          spellCheck={false}
        />
        
        <div className="flex gap-2 mt-2">
          <button 
            onClick={resetDefault}
            className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex-1"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button 
            onClick={clearInput}
            className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex-1"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default CableInput;