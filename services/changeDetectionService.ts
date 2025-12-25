/**
 * Change Detection Service
 * Detects changes between old and new cable/node data
 * Records changes in REV.COMMENT field
 */

import { Cable, Node } from '../types';

export interface ChangeRecord {
    type: 'ADD' | 'DELETE' | 'MODIFY';
    itemType: 'cable' | 'node';
    itemName: string;
    field?: string;
    oldValue?: any;
    newValue?: any;
    timestamp: string;
}

export interface ChangeDetectionResult {
    hasChanges: boolean;
    addedCables: Cable[];
    deletedCables: Cable[];
    modifiedCables: { cable: Cable; changes: { field: string; oldValue: any; newValue: any }[] }[];
    addedNodes: Node[];
    deletedNodes: Node[];
    modifiedNodes: { node: Node; changes: { field: string; oldValue: any; newValue: any }[] }[];
    changeRecords: ChangeRecord[];
    summary: string;
}

export class ChangeDetectionService {

    /**
     * Compare two cable arrays and detect changes
     */
    static detectCableChanges(oldCables: Cable[], newCables: Cable[]): {
        added: Cable[];
        deleted: Cable[];
        modified: { cable: Cable; changes: { field: string; oldValue: any; newValue: any }[] }[];
    } {
        const oldMap = new Map(oldCables.map(c => [c.name, c]));
        const newMap = new Map(newCables.map(c => [c.name, c]));

        const added: Cable[] = [];
        const deleted: Cable[] = [];
        const modified: { cable: Cable; changes: { field: string; oldValue: any; newValue: any }[] }[] = [];

        // Find added cables
        newCables.forEach(newCable => {
            if (!oldMap.has(newCable.name)) {
                added.push(newCable);
            }
        });

        // Find deleted cables
        oldCables.forEach(oldCable => {
            if (!newMap.has(oldCable.name)) {
                deleted.push(oldCable);
            }
        });

        // Find modified cables
        const fieldsToCompare: (keyof Cable)[] = ['fromNode', 'toNode', 'type', 'od', 'systemName'];

        newCables.forEach(newCable => {
            const oldCable = oldMap.get(newCable.name);
            if (oldCable) {
                const changes: { field: string; oldValue: any; newValue: any }[] = [];

                fieldsToCompare.forEach(field => {
                    if (oldCable[field] !== newCable[field]) {
                        changes.push({
                            field,
                            oldValue: oldCable[field],
                            newValue: newCable[field]
                        });
                    }
                });

                if (changes.length > 0) {
                    modified.push({ cable: newCable, changes });
                }
            }
        });

        return { added, deleted, modified };
    }

    /**
     * Compare two node arrays and detect changes
     */
    static detectNodeChanges(oldNodes: Node[], newNodes: Node[]): {
        added: Node[];
        deleted: Node[];
        modified: { node: Node; changes: { field: string; oldValue: any; newValue: any }[] }[];
    } {
        const oldMap = new Map(oldNodes.map(n => [n.name, n]));
        const newMap = new Map(newNodes.map(n => [n.name, n]));

        const added: Node[] = [];
        const deleted: Node[] = [];
        const modified: { node: Node; changes: { field: string; oldValue: any; newValue: any }[] }[] = [];

        // Find added nodes
        newNodes.forEach(newNode => {
            if (!oldMap.has(newNode.name)) {
                added.push(newNode);
            }
        });

        // Find deleted nodes
        oldNodes.forEach(oldNode => {
            if (!newMap.has(oldNode.name)) {
                deleted.push(oldNode);
            }
        });

        // Find modified nodes
        const fieldsToCompare: (keyof Node)[] = ['relation', 'linkLength', 'deck', 'areaSize'];

        newNodes.forEach(newNode => {
            const oldNode = oldMap.get(newNode.name);
            if (oldNode) {
                const changes: { field: string; oldValue: any; newValue: any }[] = [];

                fieldsToCompare.forEach(field => {
                    if (oldNode[field] !== newNode[field]) {
                        changes.push({
                            field,
                            oldValue: oldNode[field],
                            newValue: newNode[field]
                        });
                    }
                });

                if (changes.length > 0) {
                    modified.push({ node: newNode, changes });
                }
            }
        });

        return { added, deleted, modified };
    }

    /**
     * Full change detection comparing old and new data sets
     */
    static detectAllChanges(
        oldCables: Cable[],
        newCables: Cable[],
        oldNodes: Node[],
        newNodes: Node[]
    ): ChangeDetectionResult {
        const cableChanges = this.detectCableChanges(oldCables, newCables);
        const nodeChanges = this.detectNodeChanges(oldNodes, newNodes);

        const changeRecords: ChangeRecord[] = [];
        const timestamp = new Date().toISOString();

        // Record cable changes
        cableChanges.added.forEach(c => {
            changeRecords.push({ type: 'ADD', itemType: 'cable', itemName: c.name, timestamp });
        });

        cableChanges.deleted.forEach(c => {
            changeRecords.push({ type: 'DELETE', itemType: 'cable', itemName: c.name, timestamp });
        });

        cableChanges.modified.forEach(({ cable, changes }) => {
            changes.forEach(change => {
                changeRecords.push({
                    type: 'MODIFY',
                    itemType: 'cable',
                    itemName: cable.name,
                    field: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    timestamp
                });
            });
        });

        // Record node changes
        nodeChanges.added.forEach(n => {
            changeRecords.push({ type: 'ADD', itemType: 'node', itemName: n.name, timestamp });
        });

        nodeChanges.deleted.forEach(n => {
            changeRecords.push({ type: 'DELETE', itemType: 'node', itemName: n.name, timestamp });
        });

        nodeChanges.modified.forEach(({ node, changes }) => {
            changes.forEach(change => {
                changeRecords.push({
                    type: 'MODIFY',
                    itemType: 'node',
                    itemName: node.name,
                    field: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    timestamp
                });
            });
        });

        const hasChanges = changeRecords.length > 0;

        // Generate summary
        const summaryParts: string[] = [];
        if (cableChanges.added.length > 0) summaryParts.push(`+${cableChanges.added.length} cables`);
        if (cableChanges.deleted.length > 0) summaryParts.push(`-${cableChanges.deleted.length} cables`);
        if (cableChanges.modified.length > 0) summaryParts.push(`~${cableChanges.modified.length} cables modified`);
        if (nodeChanges.added.length > 0) summaryParts.push(`+${nodeChanges.added.length} nodes`);
        if (nodeChanges.deleted.length > 0) summaryParts.push(`-${nodeChanges.deleted.length} nodes`);
        if (nodeChanges.modified.length > 0) summaryParts.push(`~${nodeChanges.modified.length} nodes modified`);

        return {
            hasChanges,
            addedCables: cableChanges.added,
            deletedCables: cableChanges.deleted,
            modifiedCables: cableChanges.modified,
            addedNodes: nodeChanges.added,
            deletedNodes: nodeChanges.deleted,
            modifiedNodes: nodeChanges.modified,
            changeRecords,
            summary: summaryParts.join(', ') || 'No changes'
        };
    }

    /**
     * Generate REV.COMMENT string for a cable based on changes
     */
    static generateRevComment(changes: { field: string; oldValue: any; newValue: any }[]): string {
        return changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ');
    }

    /**
     * Reset route info for modified cables (clear calculatedPath and calculatedLength)
     */
    static resetModifiedCableRoutes(
        cables: Cable[],
        modifiedCableNames: string[]
    ): Cable[] {
        return cables.map(cable => {
            if (modifiedCableNames.includes(cable.name)) {
                return {
                    ...cable,
                    calculatedPath: undefined,
                    calculatedLength: undefined,
                    revComment: cable.revComment
                        ? `${cable.revComment} | Route reset due to data change`
                        : 'Route reset due to data change'
                };
            }
            return cable;
        });
    }
}

export default ChangeDetectionService;
