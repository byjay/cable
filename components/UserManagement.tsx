import React, { useState } from 'react';
import { Users, Shield, Eye, Edit } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'USER' | 'GUEST';
    lastLogin?: string;
}

interface UserManagementProps {
    currentRole: 'ADMIN' | 'GUEST';
    onRoleChange: (role: 'ADMIN' | 'GUEST') => void;
}

const MOCK_USERS: User[] = [
    { id: '1', name: 'Admin User', email: 'admin@seastar.work', role: 'ADMIN', lastLogin: '2025-12-25 23:00' },
    { id: '2', name: 'Designer', email: 'designer@seastar.work', role: 'USER', lastLogin: '2025-12-25 20:00' },
    { id: '3', name: 'Guest Viewer', email: 'guest@seastar.work', role: 'GUEST', lastLogin: '2025-12-24 15:00' },
];

const UserManagement: React.FC<UserManagementProps> = ({ currentRole, onRoleChange }) => {
    const [users] = useState<User[]>(MOCK_USERS);

    const getRoleBadge = (role: string) => {
        const colors: { [k: string]: string } = {
            ADMIN: 'bg-red-600 text-white',
            USER: 'bg-blue-600 text-white',
            GUEST: 'bg-gray-600 text-white'
        };
        return <span className={`px-2 py-0.5 rounded text-xs ${colors[role] || 'bg-gray-500'}`}>{role}</span>;
    };

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <h2 className="text-xl font-bold text-seastar-cyan mb-4 flex items-center gap-2">
                <Users size={20} /> User Management
            </h2>

            {/* Current Role Section */}
            <div className="glass-panel p-4 rounded-lg border border-seastar-700 mb-4">
                <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Shield size={14} /> Current Session Role
                </h3>
                <div className="flex gap-4">
                    <button
                        onClick={() => onRoleChange('ADMIN')}
                        className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition ${currentRole === 'ADMIN'
                                ? 'bg-red-600 text-white'
                                : 'bg-seastar-800 text-gray-400 hover:bg-seastar-700'
                            }`}
                    >
                        <Edit size={16} /> ADMIN (Full Access)
                    </button>
                    <button
                        onClick={() => onRoleChange('GUEST')}
                        className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition ${currentRole === 'GUEST'
                                ? 'bg-gray-600 text-white'
                                : 'bg-seastar-800 text-gray-400 hover:bg-seastar-700'
                            }`}
                    >
                        <Eye size={16} /> GUEST (Read Only)
                    </button>
                </div>
            </div>

            {/* User List */}
            <div className="glass-panel p-4 rounded-lg border border-seastar-700 flex-1">
                <h3 className="text-sm font-bold text-gray-300 mb-3">Registered Users</h3>
                <table className="w-full text-sm">
                    <thead className="text-gray-400 border-b border-seastar-700">
                        <tr>
                            <th className="text-left py-2">Name</th>
                            <th className="text-left py-2">Email</th>
                            <th className="text-left py-2">Role</th>
                            <th className="text-left py-2">Last Login</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-t border-seastar-700 hover:bg-seastar-800">
                                <td className="py-2 text-white">{user.name}</td>
                                <td className="py-2 text-gray-400">{user.email}</td>
                                <td className="py-2">{getRoleBadge(user.role)}</td>
                                <td className="py-2 text-gray-500 text-xs">{user.lastLogin}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
