/**
 * CableDataMapper - Intelligent Excel Column Mapper
 * Automatically detects and maps various Excel formats to standard cable list format
 */

export interface StandardCableFormat {
    // Core Identification
    CABLE: string;           // Cable ID
    SYWD: string;            // System/Drawing
    PAGE: string;            // Page number
    'CAB#': string;          // Cable number
    NACABLE: string;         // NA Cable

    // FROM Location
    THFROM: string;          // Through FROM
    BDFROM: string;          // Board FROM
    PCLFROM: string;         // PCL FROM
    NCFROM: string;          // NC FROM
    PFRTO: string;           // PFR TO

    // TO Location
    ROOM: string;            // Room
    TO: string;              // TO location
    EQUIP: string;           // Equipment
    'TO.1': string;          // TO (second column)
    NOPFTO: string;          // NOPF TO

    // Status & Classification
    REST: string;            // REST
    FOR: string;             // FOR
    FINCABLE: string;        // FIN CABLE
    PACABLE: string;         // PA CABLE
    OLCHECK: string;         // OL CHECK
    NKUSR: string;           // NK USR
    Y: string;               // Y
    DFOR: string;            // D FOR

    // Technical Details
    WFKINTFFER: string;      // WFK INTFFER
    FREMARK: string;         // F REMARK
    REMARK1: string;         // REMARK 1
    REMARK2: string;         // REMARK 2
    REMARK3: string;         // REMARK 3
    REVISION: string;        // REVISION
    'CABLE WPGHT': string;   // Cable Weight
}

export interface ColumnMapping {
    sourceColumn: string;
    targetColumn: keyof StandardCableFormat;
    confidence: number; // 0-1
}

export interface MappingResult {
    mappings: ColumnMapping[];
    unmappedSource: string[];
    unmappedTarget: (keyof StandardCableFormat)[];
    needsUserConfirmation: boolean;
}

class CableDataMapper {
    // All required columns from the specification
    private readonly REQUIRED_COLUMNS: (keyof StandardCableFormat)[] = [
        'CABLE', 'SYWD', 'PAGE', 'CAB#', 'NACABLE',
        'THFROM', 'BDFROM', 'PCLFROM', 'NCFROM', 'PFRTO',
        'ROOM', 'TO', 'EQUIP', 'TO.1', 'NOPFTO',
        'REST', 'FOR', 'FINCABLE', 'PACABLE', 'OLCHECK',
        'NKUSR', 'Y', 'DFOR', 'WFKINTFFER', 'FREMARK',
        'REMARK1', 'REMARK2', 'REMARK3', 'REVISION', 'CABLE WPGHT'
    ];

    // Column name variations and aliases
    private readonly COLUMN_ALIASES: Record<string, string[]> = {
        'CABLE': ['cable', 'cable_id', 'cableid', 'cable id', 'tag', 'cable tag'],
        'SYWD': ['sywd', 'system', 'drawing', 'sys', 'dwg'],
        'PAGE': ['page', 'pg', 'sheet', 'page no', 'page number'],
        'CAB#': ['cab#', 'cab', 'cable#', 'cable number', 'no'],
        'NACABLE': ['nacable', 'na cable', 'na', 'cable na'],
        'THFROM': ['thfrom', 'th from', 'through from', 'from th'],
        'BDFROM': ['bdfrom', 'bd from', 'board from', 'from bd'],
        'PCLFROM': ['pclfrom', 'pcl from', 'from pcl'],
        'NCFROM': ['ncfrom', 'nc from', 'from nc'],
        'PFRTO': ['pfrto', 'pfr to', 'to pfr'],
        'ROOM': ['room', 'location', 'area', 'zone'],
        'TO': ['to', 'destination', 'to location'],
        'EQUIP': ['equip', 'equipment', 'eq', 'device'],
        'TO.1': ['to.1', 'to 1', 'to2', 'to (2)'],
        'NOPFTO': ['nopfto', 'nopf to', 'to nopf'],
        'REST': ['rest', 'restriction', 'status'],
        'FOR': ['for', 'purpose', 'use'],
        'FINCABLE': ['fincable', 'fin cable', 'fin', 'finish'],
        'PACABLE': ['pacable', 'pa cable', 'pa'],
        'OLCHECK': ['olcheck', 'ol check', 'check'],
        'NKUSR': ['nkusr', 'nk usr', 'user'],
        'Y': ['y', 'yes', 'flag'],
        'DFOR': ['dfor', 'd for', 'for d'],
        'WFKINTFFER': ['wfkintffer', 'wfk intffer', 'interference'],
        'FREMARK': ['fremark', 'f remark', 'remark f'],
        'REMARK1': ['remark1', 'remark 1', 'remark', 'remarks'],
        'REMARK2': ['remark2', 'remark 2'],
        'REMARK3': ['remark3', 'remark 3'],
        'REVISION': ['revision', 'rev', 'version', 'ver'],
        'CABLE WPGHT': ['cable wpght', 'cable weight', 'weight', 'wpght', 'wt']
    };

    /**
     * Detect and map Excel columns to standard format
     */
    detectColumnMapping(excelHeaders: string[]): MappingResult {
        const mappings: ColumnMapping[] = [];
        const unmappedSource: string[] = [];
        const unmappedTarget: (keyof StandardCableFormat)[] = [...this.REQUIRED_COLUMNS];

        // Normalize headers
        const normalizedHeaders = excelHeaders.map(h => this.normalizeColumnName(h));

        // Try to map each Excel column
        for (let i = 0; i < excelHeaders.length; i++) {
            const sourceCol = excelHeaders[i];
            const normalized = normalizedHeaders[i];

            let bestMatch: { target: keyof StandardCableFormat; confidence: number } | null = null;

            // Check against all required columns
            for (const targetCol of this.REQUIRED_COLUMNS) {
                const confidence = this.calculateMatchConfidence(normalized, targetCol);

                if (confidence > 0.7 && (!bestMatch || confidence > bestMatch.confidence)) {
                    bestMatch = { target: targetCol, confidence };
                }
            }

            if (bestMatch) {
                mappings.push({
                    sourceColumn: sourceCol,
                    targetColumn: bestMatch.target,
                    confidence: bestMatch.confidence
                });

                // Remove from unmapped
                const idx = unmappedTarget.indexOf(bestMatch.target);
                if (idx !== -1) {
                    unmappedTarget.splice(idx, 1);
                }
            } else {
                unmappedSource.push(sourceCol);
            }
        }

        // Check if user confirmation is needed
        const needsUserConfirmation =
            unmappedTarget.length > 0 ||
            mappings.some(m => m.confidence < 0.9) ||
            unmappedSource.length > 0;

        return {
            mappings,
            unmappedSource,
            unmappedTarget,
            needsUserConfirmation
        };
    }

    /**
     * Normalize column name for comparison
     */
    private normalizeColumnName(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, '')
            .replace(/\s+/g, '');
    }

    /**
     * Calculate match confidence between normalized name and target column
     */
    private calculateMatchConfidence(normalized: string, targetCol: keyof StandardCableFormat): number {
        const targetNormalized = this.normalizeColumnName(targetCol);

        // Exact match
        if (normalized === targetNormalized) {
            return 1.0;
        }

        // Check aliases
        const aliases = this.COLUMN_ALIASES[targetCol] || [];
        for (const alias of aliases) {
            const aliasNormalized = this.normalizeColumnName(alias);
            if (normalized === aliasNormalized) {
                return 0.95;
            }

            // Partial match
            if (normalized.includes(aliasNormalized) || aliasNormalized.includes(normalized)) {
                return 0.8;
            }
        }

        // Fuzzy match (Levenshtein distance)
        const distance = this.levenshteinDistance(normalized, targetNormalized);
        const maxLen = Math.max(normalized.length, targetNormalized.length);
        const similarity = 1 - (distance / maxLen);

        return similarity > 0.7 ? similarity : 0;
    }

    /**
     * Levenshtein distance for fuzzy matching
     */
    private levenshteinDistance(a: string, b: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Transform Excel data to standard format
     */
    transformData(
        excelData: Record<string, any>[],
        mappings: ColumnMapping[]
    ): StandardCableFormat[] {
        return excelData.map(row => {
            const standardRow: Partial<StandardCableFormat> = {};

            // Apply mappings
            for (const mapping of mappings) {
                const value = row[mapping.sourceColumn];
                standardRow[mapping.targetColumn] = value !== undefined ? String(value) : '';
            }

            // Fill missing columns with empty strings
            for (const col of this.REQUIRED_COLUMNS) {
                if (!(col in standardRow)) {
                    standardRow[col] = '';
                }
            }

            return standardRow as StandardCableFormat;
        });
    }

    /**
     * Validate transformed data
     */
    validateData(data: StandardCableFormat[]): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.length === 0) {
            errors.push('No data rows found');
            return { valid: false, errors, warnings };
        }

        // Check for required fields
        const requiredFields: (keyof StandardCableFormat)[] = ['CABLE', 'SYWD'];

        data.forEach((row, idx) => {
            for (const field of requiredFields) {
                if (!row[field] || row[field].trim() === '') {
                    errors.push(`Row ${idx + 1}: Missing required field "${field}"`);
                }
            }
        });

        // Check for duplicates
        const cableIds = new Set<string>();
        data.forEach((row, idx) => {
            if (cableIds.has(row.CABLE)) {
                warnings.push(`Row ${idx + 1}: Duplicate cable ID "${row.CABLE}"`);
            }
            cableIds.add(row.CABLE);
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get all required columns
     */
    getRequiredColumns(): (keyof StandardCableFormat)[] {
        return [...this.REQUIRED_COLUMNS];
    }
}

export const cableDataMapper = new CableDataMapper();
