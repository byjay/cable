import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ArrowRight, X } from 'lucide-react';
import { cableDataMapper, ColumnMapping, MappingResult, StandardCableFormat } from '../services/CableDataMapper';

interface ColumnMapperModalProps {
    excelHeaders: string[];
    excelData: Record<string, any>[];
    onConfirm: (transformedData: StandardCableFormat[]) => void;
    onCancel: () => void;
}

const ColumnMapperModal: React.FC<ColumnMapperModalProps> = ({
    excelHeaders,
    excelData,
    onConfirm,
    onCancel
}) => {
    const [mappingResult, setMappingResult] = useState<MappingResult>(() =>
        cableDataMapper.detectColumnMapping(excelHeaders)
    );
    const [customMappings, setCustomMappings] = useState<Record<string, string>>({});

    const requiredColumns = cableDataMapper.getRequiredColumns();

    const handleManualMapping = (sourceCol: string, targetCol: string) => {
        setCustomMappings(prev => ({
            ...prev,
            [sourceCol]: targetCol
        }));
    };

    const handleConfirm = () => {
        // Merge auto-detected and custom mappings
        const finalMappings: ColumnMapping[] = [
            ...mappingResult.mappings,
            ...Object.entries(customMappings).map(([source, target]) => ({
                sourceColumn: source,
                targetColumn: target as keyof StandardCableFormat,
                confidence: 1.0
            }))
        ];

        // Transform data
        const transformedData = cableDataMapper.transformData(excelData, finalMappings);

        // Validate
        const validation = cableDataMapper.validateData(transformedData);

        if (!validation.valid) {
            alert(`Validation failed:\n${validation.errors.join('\n')}`);
            return;
        }

        if (validation.warnings.length > 0) {
            const proceed = confirm(
                `Warnings found:\n${validation.warnings.join('\n')}\n\nProceed anyway?`
            );
            if (!proceed) return;
        }

        onConfirm(transformedData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">Column Mapping Confirmation</h3>
                            <p className="text-xs text-slate-600 mt-1">
                                엑셀 파일의 컬럼을 표준 케이블 리스트 형식에 매핑합니다
                            </p>
                        </div>
                        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Status Summary */}
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="text-2xl font-bold text-green-600">
                                {mappingResult.mappings.length}
                            </div>
                            <div className="text-xs text-slate-600">Auto-Mapped</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="text-2xl font-bold text-amber-600">
                                {mappingResult.unmappedTarget.length}
                            </div>
                            <div className="text-xs text-slate-600">Needs Mapping</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="text-2xl font-bold text-slate-600">
                                {requiredColumns.length}
                            </div>
                            <div className="text-xs text-slate-600">Total Required</div>
                        </div>
                    </div>
                </div>

                {/* Mapping Table */}
                <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-slate-100 sticky top-0">
                            <tr>
                                <th className="p-2 border border-slate-300 font-bold text-left">Excel Column</th>
                                <th className="p-2 border border-slate-300 font-bold text-center w-16"></th>
                                <th className="p-2 border border-slate-300 font-bold text-left">Standard Column</th>
                                <th className="p-2 border border-slate-300 font-bold text-center w-24">Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Auto-mapped columns */}
                            {mappingResult.mappings.map((mapping, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-2 border border-slate-200 font-mono text-slate-700">
                                        {mapping.sourceColumn}
                                    </td>
                                    <td className="p-2 border border-slate-200 text-center">
                                        <ArrowRight className="w-4 h-4 text-green-600 mx-auto" />
                                    </td>
                                    <td className="p-2 border border-slate-200 font-mono text-slate-900 font-bold">
                                        {mapping.targetColumn}
                                    </td>
                                    <td className="p-2 border border-slate-200 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${mapping.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                                                mapping.confidence >= 0.7 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {(mapping.confidence * 100).toFixed(0)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {/* Unmapped target columns - need user input */}
                            {mappingResult.unmappedTarget.map((targetCol, idx) => (
                                <tr key={`unmapped-${idx}`} className="bg-amber-50/50">
                                    <td className="p-2 border border-slate-200">
                                        <select
                                            className="w-full text-xs border border-amber-300 rounded px-2 py-1 bg-white"
                                            onChange={(e) => handleManualMapping(e.target.value, targetCol)}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select Excel column...</option>
                                            {excelHeaders.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-2 border border-slate-200 text-center">
                                        <ArrowRight className="w-4 h-4 text-amber-600 mx-auto" />
                                    </td>
                                    <td className="p-2 border border-slate-200 font-mono text-slate-900 font-bold">
                                        {targetCol}
                                        <span className="ml-2 text-[10px] text-red-600">*Required</span>
                                    </td>
                                    <td className="p-2 border border-slate-200 text-center">
                                        <AlertCircle className="w-4 h-4 text-amber-600 mx-auto" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="text-xs text-slate-600">
                        {mappingResult.unmappedTarget.length > 0 ? (
                            <span className="flex items-center gap-1 text-amber-600">
                                <AlertCircle size={14} />
                                {mappingResult.unmappedTarget.length} columns need manual mapping
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle size={14} />
                                All columns mapped successfully
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={mappingResult.unmappedTarget.length > 0 && Object.keys(customMappings).length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <CheckCircle size={16} />
                            Confirm & Load Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ColumnMapperModal;
