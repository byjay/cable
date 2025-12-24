import React from 'react';
import { GenericRow } from '../types';

interface GenericGridProps {
  title: string;
  data: GenericRow[];
}

const GenericGrid: React.FC<GenericGridProps> = ({ title, data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p>No data available for {title}</p>
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="flex flex-col h-full bg-seastar-900">
      <div className="glass-panel p-4 mb-4 rounded-lg shadow-lg border border-seastar-700">
        <h4 className="text-seastar-cyan font-bold uppercase text-sm tracking-wider">
           {title}
        </h4>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-seastar-700 bg-seastar-800 shadow-inner custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-300 text-seastar-900 sticky top-0 z-10 shadow-md">
            <tr>
              {columns.map((col) => (
                <th key={col} className="p-2 text-[10px] font-bold border-r border-gray-400 uppercase whitespace-nowrap">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-seastar-700">
            {data.map((row, idx) => (
              <tr 
                key={idx} 
                className="hover:bg-seastar-700/50 transition-colors text-xs text-gray-300 odd:bg-seastar-800 even:bg-seastar-800/80"
              >
                {columns.map((col) => (
                  <td key={`${idx}-${col}`} className="p-2 border-r border-seastar-700 truncate max-w-[200px]">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-seastar-900 text-gray-500 text-[10px] p-2 border-t border-seastar-700">
        Total Records: {data.length}
      </div>
    </div>
  );
};

export default GenericGrid;