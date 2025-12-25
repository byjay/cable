import { Cable, Node, CableType, DeckConfig } from '../types';
import { ExcelService } from './excelService';
import { ChangeDetectionService, ChangeRecord } from './changeDetectionService';

export interface ProjectData {
    projectId: string;
    cables: Cable[];
    nodes: Node[];
    cableTypes: CableType[];
    deckHeights: DeckConfig;
    lastModified: string;
}

export interface ImportResult {
    cables: Cable[];
    nodes: Node[];
    cableTypes: CableType[];
    changes: ChangeRecord[];
    summary: string;
}

const STORAGE_PREFIX = 'SCMY_PROJECT_';
const PROJECT_LIST_KEY = 'SCMY_PROJECT_LIST';

class DataManagerServiceClass {
    private currentProject: ProjectData | null = null;
    private listeners: (() => void)[] = [];

    // ===== PROJECT MANAGEMENT =====

    listProjects(): string[] {
        const list = localStorage.getItem(PROJECT_LIST_KEY);
        return list ? JSON.parse(list) : ['S1001_35K_FD'];
    }

    addProject(projectId: string): void {
        const projects = this.listProjects();
        if (!projects.includes(projectId)) {
            projects.push(projectId);
            localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(projects));
        }
    }

    async loadProject(projectId: string): Promise<ProjectData> {
        const savedData = localStorage.getItem(STORAGE_PREFIX + projectId);

        if (savedData) {
            const parsed = JSON.parse(savedData);
            this.currentProject = {
                projectId,
                cables: parsed.cables || [],
                nodes: parsed.nodes || [],
                cableTypes: parsed.cableTypes || [],
                deckHeights: parsed.deckHeights || {},
                lastModified: parsed.lastModified || new Date().toISOString()
            };
        } else {
            // Initialize empty project
            this.currentProject = {
                projectId,
                cables: [],
                nodes: [],
                cableTypes: [],
                deckHeights: {},
                lastModified: new Date().toISOString()
            };
        }

        this.addProject(projectId);
        this.notifyListeners();
        return this.currentProject;
    }

    saveProject(): void {
        if (!this.currentProject) return;

        this.currentProject.lastModified = new Date().toISOString();
        localStorage.setItem(
            STORAGE_PREFIX + this.currentProject.projectId,
            JSON.stringify(this.currentProject)
        );
        console.log(`✅ Project ${this.currentProject.projectId} saved at ${this.currentProject.lastModified}`);
    }

    getCurrentProject(): ProjectData | null {
        return this.currentProject;
    }

    // ===== DATA ACCESS =====

    getCables(): Cable[] {
        return this.currentProject?.cables || [];
    }

    getNodes(): Node[] {
        return this.currentProject?.nodes || [];
    }

    getCableTypes(): CableType[] {
        return this.currentProject?.cableTypes || [];
    }

    getDeckHeights(): DeckConfig {
        return this.currentProject?.deckHeights || {};
    }

    // ===== DATA MODIFICATION =====

    updateCables(cables: Cable[], autoSave = true): void {
        if (!this.currentProject) return;
        this.currentProject.cables = cables;
        if (autoSave) this.saveProject();
        this.notifyListeners();
    }

    updateNodes(nodes: Node[], autoSave = true): void {
        if (!this.currentProject) return;
        this.currentProject.nodes = nodes;
        if (autoSave) this.saveProject();
        this.notifyListeners();
    }

    updateCableTypes(cableTypes: CableType[], autoSave = true): void {
        if (!this.currentProject) return;
        this.currentProject.cableTypes = cableTypes;
        if (autoSave) this.saveProject();
        this.notifyListeners();
    }

    // ===== IMPORT/EXPORT =====

    async importFromExcel(files: File[]): Promise<ImportResult> {
        const result: ImportResult = {
            cables: [],
            nodes: [],
            cableTypes: [],
            changes: [],
            summary: ''
        };

        for (const file of files) {
            const rawData = await ExcelService.importFromExcel(file);
            const fileName = file.name.toLowerCase();

            if (fileName.includes('node')) {
                const newNodes = ExcelService.mapRawToNode(rawData);

                // Detect changes if we have existing data
                if (this.currentProject?.nodes.length) {
                    const nodeChanges = ChangeDetectionService.detectNodeChanges(
                        this.currentProject.nodes,
                        newNodes
                    );
                    // Convert to ChangeRecord format
                    nodeChanges.added.forEach(n => result.changes.push({
                        type: 'ADD', itemType: 'node', itemName: n.name, timestamp: new Date().toISOString()
                    }));
                    nodeChanges.deleted.forEach(n => result.changes.push({
                        type: 'DELETE', itemType: 'node', itemName: n.name, timestamp: new Date().toISOString()
                    }));
                    nodeChanges.modified.forEach(({ node, changes }) =>
                        changes.forEach(c => result.changes.push({
                            type: 'MODIFY', itemType: 'node', itemName: node.name,
                            field: c.field, oldValue: c.oldValue, newValue: c.newValue,
                            timestamp: new Date().toISOString()
                        }))
                    );
                }

                result.nodes = newNodes;
            } else if (fileName.includes('sch') || fileName.includes('cable')) {
                const newCables = ExcelService.mapRawToCable(rawData);

                // Detect changes if we have existing data
                if (this.currentProject?.cables.length) {
                    const cableChanges = ChangeDetectionService.detectCableChanges(
                        this.currentProject.cables,
                        newCables
                    );
                    // Convert to ChangeRecord format
                    cableChanges.added.forEach(c => result.changes.push({
                        type: 'ADD', itemType: 'cable', itemName: c.name, timestamp: new Date().toISOString()
                    }));
                    cableChanges.deleted.forEach(c => result.changes.push({
                        type: 'DELETE', itemType: 'cable', itemName: c.name, timestamp: new Date().toISOString()
                    }));
                    cableChanges.modified.forEach(({ cable, changes }) =>
                        changes.forEach(ch => result.changes.push({
                            type: 'MODIFY', itemType: 'cable', itemName: cable.name,
                            field: ch.field, oldValue: ch.oldValue, newValue: ch.newValue,
                            timestamp: new Date().toISOString()
                        }))
                    );

                    // Apply REV.COMMENT to modified cables
                    result.cables = ChangeDetectionService.applyRevComments(newCables, result.changes);
                } else {
                    result.cables = newCables;
                }
            }
        }

        // Generate summary
        const added = result.changes.filter(c => c.type === 'ADD').length;
        const modified = result.changes.filter(c => c.type === 'MODIFY').length;
        const deleted = result.changes.filter(c => c.type === 'DELETE').length;
        result.summary = `Import complete: ${added} added, ${modified} modified, ${deleted} deleted`;

        return result;
    }

    exportToExcel(dataType: 'cables' | 'nodes' | 'all'): void {
        if (!this.currentProject) return;

        if (dataType === 'cables' || dataType === 'all') {
            ExcelService.exportToExcel(
                this.currentProject.cables,
                `${this.currentProject.projectId}_cables_${new Date().toISOString().split('T')[0]}.xlsx`
            );
        }

        // Additional export logic for nodes can be added here
    }

    // ===== STATISTICS =====

    getStatistics() {
        const cables = this.getCables();
        const nodes = this.getNodes();

        return {
            totalCables: cables.length,
            totalNodes: nodes.length,
            routedCables: cables.filter(c => c.calculatedPath?.length).length,
            routeErrors: cables.filter(c => c.routeError).length,
            totalLength: cables.reduce((sum, c) => sum + (c.calculatedLength || c.length || 0), 0),
            bySystem: this.groupBy(cables, 'system'),
            byType: this.groupBy(cables, 'type'),
            byDeck: this.groupBy(cables, 'supplyDeck')
        };
    }

    private groupBy(cables: Cable[], key: keyof Cable) {
        const result: { [k: string]: { count: number; length: number } } = {};
        cables.forEach(c => {
            const k = String(c[key] || 'Unknown');
            if (!result[k]) result[k] = { count: 0, length: 0 };
            result[k].count++;
            result[k].length += c.calculatedLength || c.length || 0;
        });
        return result;
    }

    // ===== LISTENERS =====

    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(l => l());
    }
}

// Singleton export
export const DataManagerService = new DataManagerServiceClass();
