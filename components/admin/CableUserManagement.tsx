import React, { useState } from 'react';
import { useCableAuth } from '../../contexts/CableAuthContext';
import { cableEmployeeService, CableEmployee, SUPER_ADMIN_EMAIL } from '../../services/CableEmployeeService';
import { Shield, Search, Save, Trash2, Edit2, UserPlus } from 'lucide-react';

const AVAILABLE_SHIPS = ['HK2401', 'S1001_35K_FD', 'S1002_LNG', 'H5500_CONT'];

const CableUserManagement: React.FC = () => {
    const { user, isSuperAdmin } = useCableAuth();
    const [users, setUsers] = useState<CableEmployee[]>(cableEmployeeService.getAllEmployees());
    const [searchTerm, setSearchTerm] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [editingUser, setEditingUser] = useState<CableEmployee | null>(null);

    // Security check
    if (!isSuperAdmin) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-center p-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">Access Denied</h2>
                <p className="text-slate-500 max-w-md">
                    SUPER_ADMIN 권한이 필요합니다.
                    <br />
                    김봉정님만 접근 가능합니다.
                </p>
            </div>
        );
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRoleChange = (userId: string, newRole: CableEmployee['role']) => {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setHasChanges(true);
    };

    const handleStatusChange = (userId: string, newStatus: CableEmployee['status']) => {
        setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        setHasChanges(true);
    };

    const handleShipAccessChange = (userId: string, ships: string[]) => {
        setUsers(users.map(u => u.id === userId ? { ...u, shipAccess: ships } : u));
        setHasChanges(true);
    };

    const saveChanges = () => {
        users.forEach(u => {
            cableEmployeeService.updateEmployee(u.id, u);
        });
        setHasChanges(false);
        alert('모든 변경사항이 저장되었습니다.');
    };

    const deleteUser = (userId: string) => {
        if (confirm('정말 이 사용자를 삭제하시겠습니까?')) {
            cableEmployeeService.deleteEmployee(userId);
            setUsers(users.filter(u => u.id !== userId));
            setHasChanges(true);
        }
    };

    return (
        <div className="p-4 max-w-[1600px] mx-auto h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-purple-600 w-6 h-6" />
                        User Management
                    </h1>
                    <p className="text-xs text-slate-500">케이블 관리 시스템 사용자 관리</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1.5" />
                        <input
                            type="text"
                            placeholder="Search by name, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-purple-500 w-64 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* User Table */}
            <div className="flex-1 overflow-hidden bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                            <tr>
                                <th className="p-2 border-b border-r border-slate-300 font-bold">ID</th>
                                <th className="p-2 border-b border-r border-slate-300 font-bold">Name</th>
                                <th className="p-2 border-b border-r border-slate-300 font-bold">Email</th>
                                <th className="p-2 border-b border-r border-slate-300 font-bold">Role</th>
                                <th className="p-2 border-b border-r border-slate-300 font-bold">Status</th>
                                <th className="p-2 border-b border-r border-slate-300 font-bold">Ship Access</th>
                                <th className="p-2 border-b border-slate-300 font-bold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u, idx) => (
                                <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                    <td className="p-2 border-b border-r border-slate-200 text-slate-500">{u.id}</td>
                                    <td className="p-2 border-b border-r border-slate-200 font-medium text-slate-900">{u.name}</td>
                                    <td className="p-2 border-b border-r border-slate-200 text-slate-600">{u.email}</td>
                                    <td className="p-2 border-b border-r border-slate-200">
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value as CableEmployee['role'])}
                                            className="w-full text-xs py-0.5 px-1 bg-transparent border-none focus:ring-1 focus:ring-purple-500 rounded hover:bg-slate-200 cursor-pointer"
                                            disabled={u.email === SUPER_ADMIN_EMAIL}
                                        >
                                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                            <option value="ADMIN">ADMIN</option>
                                            <option value="MANAGER">MANAGER</option>
                                            <option value="USER">USER</option>
                                            <option value="GUEST">GUEST</option>
                                        </select>
                                    </td>
                                    <td className="p-2 border-b border-r border-slate-200">
                                        <span className={`inline-block px-1.5 rounded-[3px] text-[10px] font-bold w-16 text-center ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                u.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="p-2 border-b border-r border-slate-200">
                                        {u.shipAccess?.includes('*') ? (
                                            <span className="font-bold text-slate-800">ALL SHIPS</span>
                                        ) : (
                                            <span className="text-slate-600">{u.shipAccess?.join(', ') || '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-2 border-b border-slate-200">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setEditingUser(u)}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            {u.email !== SUPER_ADMIN_EMAIL && (
                                                <button
                                                    onClick={() => deleteUser(u.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Save Button */}
            {hasChanges && (
                <div className="fixed bottom-6 right-6 animate-in slide-in-from-bottom-4 z-50">
                    <button
                        onClick={saveChanges}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-2xl transition-all font-bold"
                    >
                        <Save className="w-5 h-5 animate-pulse" />
                        Save Changes
                    </button>
                </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <ShipAccessModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={(ships) => {
                        handleShipAccessChange(editingUser.id, ships);
                        setEditingUser(null);
                    }}
                />
            )}
        </div>
    );
};

// Ship Access Modal
const ShipAccessModal: React.FC<{
    user: CableEmployee;
    onClose: () => void;
    onSave: (ships: string[]) => void;
}> = ({ user, onClose, onSave }) => {
    const [selectedShips, setSelectedShips] = useState<string[]>(user.shipAccess || []);
    const isAllSelected = selectedShips.includes('*');

    const toggleShip = (shipId: string) => {
        if (shipId === '*') {
            setSelectedShips(isAllSelected ? [] : ['*']);
            return;
        }

        if (isAllSelected) {
            setSelectedShips(AVAILABLE_SHIPS.filter(id => id !== shipId));
        } else {
            if (selectedShips.includes(shipId)) {
                setSelectedShips(selectedShips.filter(id => id !== shipId));
            } else {
                setSelectedShips([...selectedShips, shipId]);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-900">Ship Access - {user.name}</h3>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 mb-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={() => toggleShip('*')}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                            <span className="font-medium text-slate-900">All Ships (*)</span>
                            <p className="text-xs text-slate-500">모든 호선 접근 권한</p>
                        </div>
                    </label>

                    <div className="space-y-2">
                        {AVAILABLE_SHIPS.map(ship => (
                            <label key={ship} className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer ${selectedShips.includes(ship) || isAllSelected ? 'border-purple-200 bg-purple-50/30' : 'border-slate-100'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={selectedShips.includes(ship) || isAllSelected}
                                    onChange={() => toggleShip(ship)}
                                    disabled={isAllSelected}
                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="font-medium text-slate-900">{ship}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(selectedShips)}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CableUserManagement;
