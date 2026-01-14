import React, { useState } from 'react';
import { Shield, Lock, Save, AlertTriangle } from 'lucide-react';
import { useCableAuth } from '../../contexts/CableAuthContext';
import { cableEmployeeService, CableEmployee, SUPER_ADMIN_EMAIL } from '../../services/CableEmployeeService';

// Define permission modules
const MODULES = [
    { id: 'cable_list', label: 'Cable List & Management' },
    { id: 'tray_analysis', label: 'Tray Analysis & Routing' },
    { id: '3d_viewer', label: '3D Viewer & Simulation' },
    { id: 'reports', label: 'Reports & Installation Status' },
    { id: 'admin_tools', label: 'Admin Tools & Settings' }
];

const PERMISSION_TYPES = ['view', 'edit', 'delete', 'export'] as const;

interface PermissionConfig {
    [moduleId: string]: {
        view: boolean;
        edit: boolean;
        delete: boolean;
        export: boolean;
    };
}

const DEFAULT_PERMISSIONS: PermissionConfig = MODULES.reduce((acc, module) => ({
    ...acc,
    [module.id]: { view: true, edit: false, delete: false, export: false }
}), {});

const CablePermissionEditor: React.FC = () => {
    const { isSuperAdmin } = useCableAuth();
    const [employees] = useState<CableEmployee[]>(cableEmployeeService.getAllEmployees());
    const [selectedRole, setSelectedRole] = useState<CableEmployee['role']>('MANAGER');

    // In a real app, these would be loaded from a service. For now, we simulate role-based config.
    // We'll use a local state to simulate editing permissions for a role.
    const [permissions, setPermissions] = useState<Record<string, PermissionConfig>>({
        'SUPER_ADMIN': MODULES.reduce((acc, m) => ({ ...acc, [m.id]: { view: true, edit: true, delete: true, export: true } }), {}),
        'ADMIN': MODULES.reduce((acc, m) => ({ ...acc, [m.id]: { view: true, edit: true, delete: true, export: true } }), {}),
        'MANAGER': MODULES.reduce((acc, m) => ({ ...acc, [m.id]: { view: true, edit: true, delete: false, export: true } }), {}),
        'USER': MODULES.reduce((acc, m) => ({ ...acc, [m.id]: { view: true, edit: false, delete: false, export: false } }), {}),
        'GUEST': MODULES.reduce((acc, m) => ({ ...acc, [m.id]: { view: true, edit: false, delete: false, export: false } }), {}),
    });

    const [hasChanges, setHasChanges] = useState(false);

    if (!isSuperAdmin) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-center p-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">Access Denied</h2>
                <p className="text-slate-500 max-w-md">
                    Permission configuration is restricted to SUPER_ADMIN only.
                </p>
            </div>
        );
    }

    const currentPerms = permissions[selectedRole] || DEFAULT_PERMISSIONS;

    const togglePermission = (moduleId: string, type: typeof PERMISSION_TYPES[number]) => {
        if (selectedRole === 'SUPER_ADMIN') return; // Cannot edit super admin

        setPermissions(prev => ({
            ...prev,
            [selectedRole]: {
                ...prev[selectedRole],
                [moduleId]: {
                    ...prev[selectedRole][moduleId],
                    [type]: !prev[selectedRole][moduleId][type]
                }
            }
        }));
        setHasChanges(true);
    };

    const savePermissions = () => {
        // Here you would save to the service/localStorage
        // cableEmployeeService.saveRolePermissions(permissions);
        localStorage.setItem('cable_role_permissions', JSON.stringify(permissions));
        setHasChanges(false);
        alert('Permissions saved successfully!');
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto h-full flex flex-col bg-slate-50">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Lock className="text-purple-600 w-8 h-8" />
                        Permission Configuration
                    </h1>
                    <p className="text-sm text-slate-500">Configure detailed access control for each user role</p>
                </div>

                {hasChanges && (
                    <button
                        onClick={savePermissions}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow transition-colors font-bold"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
                {/* Role Selector */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <h3 className="font-bold text-slate-700 mb-4 px-2">Select Role</h3>
                    <div className="space-y-1">
                        {['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'GUEST'].map((role) => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role as any)}
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${selectedRole === role
                                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                {role}
                                {role === 'SUPER_ADMIN' && <Lock size={12} className="text-slate-400" />}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex gap-2 text-amber-800 mb-2">
                            <AlertTriangle size={16} />
                            <span className="text-xs font-bold">Role Summary</span>
                        </div>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            <strong>{selectedRole}</strong> has access to {Object.values(currentPerms).filter(p => p.view).length} modules.
                            {selectedRole === 'SUPER_ADMIN' && ' This role has full system access and cannot be restricted.'}
                        </p>
                    </div>
                </div>

                {/* Permission Matrix */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Access Matrix: <span className="text-purple-600">{selectedRole}</span></h3>
                        <div className="text-xs text-slate-500">
                            Check boxes to grant permission
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b w-1/3">Module Name</th>
                                    {PERMISSION_TYPES.map(type => (
                                        <th key={type} className="p-4 text-xs font-bold text-slate-500 uppercase border-b text-center w-1/6">
                                            {type}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {MODULES.map(module => (
                                    <tr key={module.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-slate-800">{module.label}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{module.id}</div>
                                        </td>
                                        {PERMISSION_TYPES.map(type => (
                                            <td key={type} className="p-4 text-center">
                                                <div className="flex justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={currentPerms[module.id]?.[type] || false}
                                                        onChange={() => togglePermission(module.id, type)}
                                                        disabled={selectedRole === 'SUPER_ADMIN'}
                                                        className={`w-5 h-5 rounded border-slate-300 transition-colors focus:ring-purple-500 ${selectedRole === 'SUPER_ADMIN'
                                                                ? 'text-slate-400 bg-slate-100 cursor-not-allowed'
                                                                : 'text-purple-600 cursor-pointer'
                                                            }`}
                                                    />
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CablePermissionEditor;
