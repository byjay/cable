import { cableEmployeeService } from './CableEmployeeService';
import { cloudConnector } from './CloudConnector';

/**
 * 5-Agent Cross-Check Report Generator
 * Runs a self-diagnostic on the system
 */

export const runSystemDiagnostics = async () => {
    const report = {
        timestamp: new Date().toISOString(),
        agents: {
            auth: { status: 'PENDING', checks: [] as string[] },
            data: { status: 'PENDING', checks: [] as string[] },
            ui: { status: 'PENDING', checks: [] as string[] },
            cloud: { status: 'PENDING', checks: [] as string[] }
        }
    };

    console.group("🤖 5-Agent System Diagnostic Starting...");

    // 1. Auth Check
    const superAdmin = cableEmployeeService.login('designsir', '1');
    if (superAdmin && superAdmin.role === 'SUPER_ADMIN') {
        report.agents.auth.status = 'PASS';
        report.agents.auth.checks.push("SUPER_ADMIN Login: OK");
        report.agents.auth.checks.push("Role Verification: OK");
    } else {
        report.agents.auth.status = 'FAIL';
        report.agents.auth.checks.push("SUPER_ADMIN Login: FAILED");
    }

    // 2. Cloud Check
    if (cloudConnector) {
        report.agents.cloud.status = 'READY';
        report.agents.cloud.checks.push("Connector Module: Loaded");
        report.agents.cloud.checks.push(cloudConnector.isCloudActive() ? "Cloud: ACTIVE" : "Cloud: STANDBY (Local Mode)");
    }

    // 3. Data Isolation Check
    const userKey = cableEmployeeService.getUserStorageKey('test_user', 'test');
    if (userKey === 'cable_data_test_user_test') {
        report.agents.data.status = 'PASS';
        report.agents.data.checks.push("Key Isolation Strategy: OK");
    } else {
        report.agents.data.status = 'FAIL';
    }

    console.log("Diagnostic Complete:", report);
    console.groupEnd();

    return report;
};
