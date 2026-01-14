import { Cable, Node, CableType } from '../types';

export interface HistoryEntry {
    id: string;
    timestamp: string;
    action: string;
    description: string;
    projectId: string;
    snapshot: {
        cables: Cable[];
        nodes: Node[];
        cableTypes: CableType[];
    };
}

const HISTORY_KEY = 'SCMY_HISTORY';
const MAX_HISTORY_ENTRIES = 5; // Reduced from 50 to prevent QuoteExceededError

class HistoryServiceClass {
    private history: HistoryEntry[] = [];

    constructor() {
        this.loadHistory();
    }

    private loadHistory(): void {
        try {
            const saved = localStorage.getItem(HISTORY_KEY);
            this.history = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load history:', e);
            this.history = [];
        }
    }

    private saveHistory(): void {
        try {
            // Keep only the last MAX_HISTORY_ENTRIES
            if (this.history.length > MAX_HISTORY_ENTRIES) {
                this.history = this.history.slice(-MAX_HISTORY_ENTRIES);
            }
            localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
        } catch (e: any) {
            console.error('Failed to save history:', e);
            // If quota exceeded, clear history and try to save just the latest
            if (e.name === 'QuotaExceededError' || e.message === 'QuotaExceededError') {
                console.warn('Storage Quota Exceeded. Clearing old history...');
                this.history = this.history.slice(-1); // Keep only last entry
                try {
                    localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
                } catch (retryError) {
                    console.error('Critical: Could not save even the last entry.', retryError);
                }
            }
        }
    }

    // Summarize diff between two states
    summarizeDiff(oldCables: Cable[], newCables: Cable[], oldNodes: Node[], newNodes: Node[]): string {
        const cableDiff = newCables.length - oldCables.length;
        const nodeDiff = newNodes.length - oldNodes.length;

        const parts = [];
        if (cableDiff !== 0) parts.push(`Cables: ${oldCables.length} → ${newCables.length} (${cableDiff > 0 ? '+' : ''}${cableDiff})`);
        else if (newCables.length > 0) parts.push(`Cables: ${newCables.length} (no change)`);

        if (nodeDiff !== 0) parts.push(`Nodes: ${oldNodes.length} → ${newNodes.length} (${nodeDiff > 0 ? '+' : ''}${nodeDiff})`);
        else if (newNodes.length > 0) parts.push(`Nodes: ${newNodes.length} (no change)`);

        return parts.join(' | ') || "No data changes";
    }

    // Record a snapshot of current state
    record(
        action: string,
        description: string,
        projectId: string,
        cables: Cable[],
        nodes: Node[],
        cableTypes: CableType[]
    ): void {
        const entry: HistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            action,
            description,
            projectId,
            snapshot: {
                cables: [...cables],
                nodes: [...nodes],
                cableTypes: [...cableTypes]
            }
        };

        this.history.push(entry);
        this.saveHistory();
        console.log(`📝 History recorded: ${action} - ${description}`);
    }

    // Get all history entries
    getHistory(): HistoryEntry[] {
        return [...this.history].reverse(); // Most recent first
    }

    // Get history for a specific project
    getProjectHistory(projectId: string): HistoryEntry[] {
        return this.history
            .filter(h => h.projectId === projectId)
            .reverse();
    }

    // Restore to a specific history entry
    restore(entryId: string): HistoryEntry | null {
        const entry = this.history.find(h => h.id === entryId);
        if (entry) {
            console.log(`⏪ Restoring to: ${entry.action} at ${entry.timestamp}`);
            return entry;
        }
        return null;
    }

    // Clear all history
    clearHistory(): void {
        this.history = [];
        this.saveHistory();
    }

    // Delete a specific entry
    deleteEntry(entryId: string): void {
        this.history = this.history.filter(h => h.id !== entryId);
        this.saveHistory();
    }

    // Get history count
    getCount(): number {
        return this.history.length;
    }
}

// Singleton export
export const HistoryService = new HistoryServiceClass();
