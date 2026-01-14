
import React, { useState, useEffect, useRef } from 'react';
import { CableData, NodeData } from '../../services/tray/types';
import { Table, Trash2, RotateCcw, FileSpreadsheet, Copy, Network } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CableInputProps {
    onCableDataChange: (data: CableData[]) => void;
    onNodeDataChange: (data: NodeData[]) => void;
}

const DEFAULT_CABLE_TEXT = `CABLE_SYSTEM	WD_PAGE	CABLE_NAME	CABLE_TYPE	FROM_ROOM	FROM_EQUIP	FROM_NODE	FROM_REST	TO_ROOM	TO_EQUIP	TO_NODE	TO_REST	POR_LENGTH	CABLE_PATH	CABLE_OUTDIA	CHECK_NODE	SUPPLY_DECK	POR_WEIGHT	INTERFERENCE	REMARK	REMARK1	REMARK2	REMARK3	REVISION
POWER	84	P-UV-01	MY4	NO.1 VOID(S)	CONTROL PANE FOR UV STERILIZER	TW181A	15	LV SWBD RM(S)	NO.3 MAMS I/O CABINET	TW185C	4	152	TW181A,TW181,TW180...	13.2	TW200	TW	39520	MY4_F	 WIR. DIA. 변경			P874	1
POWER	13	P-UPS-03	MY4	LV SWBD RM(S)	DC110V UPS	TW155C	5	LV SWBD RM(S)	NO.3 MAMS I/O CABINET	TW185C	4	92	TW155C,TW155B...	13.2	TW200	TW	23920	MY4_F	 WIR. DIA. 변경			P054	1
POWER	13	P-UPS-02	DY4	LV SWBD RM(S)	DC110V UPS	TW155C	5	ECS RM	SHORE CONN. BOX	SF182	10	113	TW155C,TW155B...	15.9		TW	41245	P-DY4_A	 WIR. DIA. 변경			P053	1
POWER	13	P-UPS-01	DY4	LV SWBD RM(S)	DC110V UPS	TW155C	5	HV SWBD RM(S)	HV SWBD INCOMING PANEL	TW156B	7	30	TW155C,TW155B...	15.9		TW	10950	P-DY4_A	 WIR. DIA. 변경			P052	1
POWER	88	P-TW-04J	MYS7	AHU RM(P)	NO.4 TRACTION WINCH STARTER	SF026	10	TOP DK(P)	ENCORDER	SF005	8	86	SF026,SF025...	15.4			30530	MYS7_C	 WIR. DIA. 변경	추가(0224)	CHECK		1
POWER	88	P-TW-04H	MYS4	AHU RM(P)	NO.4 TRACTION WINCH STARTER	SF026	10	TOP DK(P)	LOCAL STAND FOR NO.4 TRACTION WINCH	SF002	8	96	SF026,SF025...	13.4			24960	P-MYS4_C	 WIR. DIA. 변경	추가(0224)	CHECK		1
POWER	88	P-TW-04G	MY12	AHU RM(P)	NO.4 TRACTION WINCH STARTER	SF026	10	TOP DK(P)	LOCAL STAND FOR NO.2 TRACTION WINCH	SF070	5	165	SF026,SF027...	19			86625	MY19C	 WIR. DIA. 변경	TYPE 변경(0224)	CHECK		1
POWER	88	P-TW-04F	MY12	AHU RM(P)	NO.4 TRACTION WINCH STARTER	SF026	10	TOP DK(P)	RECEIVER BOX	SF003	10	96	SF026,SF025...	19		SF	50400	MY12_C	 WIR. DIA. 변경			P922	1
POWER	88	P-TW-04E	MY4	AHU RM(P)	NO.4 TRACTION WINCH STARTER	SF026	10	TOP DK(P)	INCHING BOX	SF003	10	96	SF026,SF025...	13.2		SF	24960	MY4_F	 WIR. DIA. 변경			P921	1
POWER	88	P-TW-04D	MY4	AHU RM(P)	NO.4 TRACTION WINCH STARTER	TW079D	10	LV SWBD RM(P)	NO.1 MAMS I/O CABINET	TW008B	5	30	TW079D,TWP29B...	13.2		TW	7800	MY4_F	 WIR. DIA. 변경	장비수정(0224)	CHECK	P920	1
POWER	88	P-TW-04C	MY12	AHU RM(P)	NO.4 TRACTION WINCH STARTER	SF026	10	TOP DK(P)	LOCAL STAND FOR NO.4 TRACTION WINCH	SF002	4	119	SF140,SF139B...	19		SF	62475	MY12_C	 WIR. DIA. 변경	TYPE수정(0224)	CHECK	P912	1
POWER	88	P-TW-03B	DY1	AHU RM(S)	NO.3 TRACTION WINCH STARTER	SF140	10	TOP DK(S)	NO.3 TRACTION WINCH	SF103B	7	121	SF140,SF139B...	13.7		SF	31460	P-DY1_A	 WIR. DIA. 변경			P911	1`;

const DEFAULT_NODE_TEXT = `NODE_NAME	STRUCTURE	TYPE	RELATION	LINK_LENGTH	AREA
TW181A	VOID	Tray	TW181,TW180	1.5	0
TW181	VOID	Tray	TW181A,TW180	2.0	0
TW180	VOID	Tray	TW181,TW179	2.0	0
TW179	VOID	Tray	TW180,TWS63A	2.0	0
TW185C	LV SWBD	Tray	TW185B	1.0	0`;

const CableInput: React.FC<CableInputProps> = ({ onCableDataChange, onNodeDataChange }) => {
    const [activeTab, setActiveTab] = useState<'cables' | 'nodes'>('cables');
    const [cableText, setCableText] = useState(DEFAULT_CABLE_TEXT);
    const [nodeText, setNodeText] = useState('');

    const [cableCount, setCableCount] = useState(0);
    const [nodeCount, setNodeCount] = useState(0);

    const [multiplier, setMultiplier] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Parsing Logic ---

    const parseCables = (text: string, qtyMult: number) => {
        const lines = text.trim().split('\n');
        let rawData: CableData[] = [];

        // Detect Header
        const hasHeader = lines[0] && (lines[0].includes('CABLE_NAME') || lines[0].includes('CABLE_SYSTEM'));
        const startIdx = hasHeader ? 1 : 0;

        // Indices based on the provided excel format
        const IDX_SYSTEM = 0;
        const IDX_NAME = 2;
        const IDX_TYPE = 3;
        const IDX_FROM_NODE = 6;
        const IDX_TO_NODE = 10;
        const IDX_OD = 14;
        const IDX_CHECK_NODE = 15;

        let idCounter = 0;

        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            const parts = line.split(/\t+/).map(s => s.trim());

            if (parts.length < 3) continue;

            let name, type, odStr, system, fromNode, toNode, checkNode;

            if (hasHeader && parts.length > 10) {
                system = parts[IDX_SYSTEM] || "UNK";
                name = parts[IDX_NAME] || "NoName";
                type = parts[IDX_TYPE] || "Type";
                fromNode = parts[IDX_FROM_NODE] || "";
                toNode = parts[IDX_TO_NODE] || "";
                odStr = parts[IDX_OD];
                checkNode = parts[IDX_CHECK_NODE] || "";
            } else {
                // Simple fallback
                name = parts[0];
                type = parts[1];
                odStr = parts[2];
                system = "DEFAULT";
            }

            const od = parseFloat(odStr);
            if (!isNaN(od)) {
                // Apply Multiplier
                for (let m = 0; m < qtyMult; m++) {
                    const suffix = m > 0 ? `_x${m + 1}` : '';
                    rawData.push({
                        id: `c-${idCounter++}`,
                        name: `${name}${suffix}`,
                        type, od, system, fromNode, toNode, checkNode
                    });
                }
            }
        }
        setCableCount(rawData.length);
        onCableDataChange(rawData);
    };

    const parseNodes = (text: string) => {
        const lines = text.trim().split('\n');
        let nodes: NodeData[] = [];

        const hasHeader = lines[0] && lines[0].toLowerCase().includes('name');
        const startIdx = hasHeader ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            const parts = line.split(/\t+/).map(s => s.trim());

            if (parts.length < 2) continue;

            const name = parts[0];
            // Try to find relation column
            let relation = "";
            if (parts.length > 4) relation = parts[4]; // Based on sample (Name, Struct, Type, Rel, Link...)
            else if (parts.length > 1) relation = parts[parts.length - 1];

            // Check header index if available
            const headers = lines[0].split(/\t+/).map(s => s.toLowerCase());
            const rHeaderIdx = headers.findIndex(h => h.includes('relation'));
            if (rHeaderIdx > -1 && parts[rHeaderIdx]) relation = parts[rHeaderIdx];

            nodes.push({ name, relation });
        }
        setNodeCount(nodes.length);
        onNodeDataChange(nodes);
    };

    // --- Effects ---
    useEffect(() => {
        parseCables(cableText, multiplier);
    }, [multiplier]);

    useEffect(() => {
        // Trigger initial parse if data present
        if (cableText) parseCables(cableText, multiplier);
        if (nodeText) parseNodes(nodeText);
    }, []);

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
                textOutput += row.join('\t') + "\n";
            });

            if (activeTab === 'cables') {
                setCableText(textOutput);
                parseCables(textOutput, multiplier);
            } else {
                setNodeText(textOutput);
                parseNodes(textOutput);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-2 py-2 border-b border-gray-200 flex gap-2">
                <button
                    onClick={() => setActiveTab('cables')}
                    className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors ${activeTab === 'cables' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Table size={14} /> Cables <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[9px]">{cableCount}</span>
                </button>
                <button
                    onClick={() => setActiveTab('nodes')}
                    className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors ${activeTab === 'nodes' ? 'bg-white text-green-600 shadow' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Network size={14} /> Nodes / Graph <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[9px]">{nodeCount}</span>
                </button>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-2">
                {activeTab === 'cables' && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-slate-100 rounded border border-slate-200">
                        <span className="text-xs font-black text-slate-500 uppercase flex items-center gap-1">
                            <Copy size={12} /> Qty Multiplier:
                        </span>
                        {[1, 2, 3, 4].map(m => (
                            <button
                                key={m}
                                onClick={() => setMultiplier(m)}
                                className={`flex-1 text-[10px] font-black py-1 rounded transition-colors ${multiplier === m
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'bg-white text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                x{m}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 mb-1">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center justify-center gap-2 px-3 py-2 w-full text-sm font-medium text-white rounded-md transition-colors ${activeTab === 'cables' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Import Excel ({activeTab === 'cables' ? 'Cables' : 'Nodes'})
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".xlsx, .xls, .csv"
                    />
                </div>

                <p className="text-[10px] text-gray-400 uppercase font-bold mt-2">
                    {activeTab === 'cables' ? 'Data Format (TSV): Name(2), Type(3), FromNode(6), ToNode(10), OD(14)' : 'Data Format (TSV): Name(0), Relation(4)'}
                </p>

                <textarea
                    className="flex-1 w-full p-2 font-mono text-[10px] border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none whitespace-pre"
                    placeholder={activeTab === 'cables' ? "Paste Cable Schedule..." : "Paste Node Info..."}
                    value={activeTab === 'cables' ? cableText : nodeText}
                    onChange={(e) => {
                        if (activeTab === 'cables') {
                            setCableText(e.target.value);
                            parseCables(e.target.value, multiplier);
                        } else {
                            setNodeText(e.target.value);
                            parseNodes(e.target.value);
                        }
                    }}
                    spellCheck={false}
                />

                <div className="flex gap-2 mt-2">
                    {activeTab === 'cables' && (
                        <button
                            onClick={() => { setCableText(DEFAULT_CABLE_TEXT); parseCables(DEFAULT_CABLE_TEXT, multiplier); }}
                            className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex-1 font-bold"
                        >
                            <RotateCcw className="w-4 h-4" /> Reset Default
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (activeTab === 'cables') { setCableText(''); parseCables('', multiplier); }
                            else { setNodeText(''); parseNodes(''); }
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex-1 font-bold"
                    >
                        <Trash2 className="w-4 h-4" /> Clear
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CableInput;
