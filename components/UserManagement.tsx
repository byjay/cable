import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { AuthService } from '../services/authService';
import { AVAILABLE_SHIPS } from '../hooks/useProjectData';
import { Trash2, UserPlus, Shield, Check, X, Ship, Lock, Save } from 'lucide-react';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User>>({});
    const [newUserMode, setNewUserMode] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        setUsers(AuthService.getUsers());
    };

    const handleSaveUser = () => {
        if (!editingUser.username || !editingUser.role) {
            alert("Username and Role are required.");
            return;
        }

        if (newUserMode) {
            // Check existence
            if (users.find(u => u.username === editingUser.username)) {
                alert("Username already exists.");
                return;
            }
            const newUser: User = {
                id: crypto.randomUUID(),
                username: editingUser.username,
                password: editingUser.password || '1234', // Default password
                role: editingUser.role as any,
                assignedShips: editingUser.assignedShips || [],
                createdAt: new Date().toISOString()
            };
            AuthService.saveUsers([...users, newUser]);
        } else {
            // Update
            const updatedUsers = users.map(u => u.id === editingUser.id ? { ...u, ...editingUser } as User : u);
            AuthService.saveUsers(updatedUsers);
        }

        setIsEditing(false);
        setNewUserMode(false);
        setEditingUser({});
        loadUsers();
    };

    const handleDeleteUser = (id: string) => {
        if (id === 'admin') {
            alert("Cannot delete the main admin user.");
            return;
        }
        if (confirm("Are you sure you want to delete this user?")) {
            const updated = users.filter(u => u.id !== id);
            AuthService.saveUsers(updated);
            loadUsers();
        }
    };

    const toggleShipAccess = (shipId: string) => {
        const currentShips = editingUser.assignedShips || [];
        if (currentShips.includes(shipId)) {
            setEditingUser({ ...editingUser, assignedShips: currentShips.filter(s => s !== shipId) });
        } else {
            setEditingUser({ ...editingUser, assignedShips: [...currentShips, shipId] });
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
            <h1 className="text-3xl font-bold text-seastar-cyan mb-8 flex items-center gap-3">
                <Shield className="w-8 h-8" /> User Management
            </h1>

            <div className="flex gap-8 flex-1 overflow-hidden">
                {/* User List */}
                <div className="w-1/3 bg-seastar-800 rounded-lg border border-seastar-700 flex flex-col">
                    <div className="p-4 border-b border-seastar-700 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-200">Users ({users.length})</h2>
                        <button
                            onClick={() => { setIsEditing(true); setNewUserMode(true); setEditingUser({ role: 'USER', assignedShips: [] }); }}
                            className="bg-seastar-cyan text-seastar-900 px-3 py-1 rounded-md text-sm font-bold flex items-center gap-1 hover:bg-cyan-300"
                        >
                            <UserPlus size={14} /> Add User
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {users.map(user => (
                            <div
                                key={user.id}
                                onClick={() => { setIsEditing(true); setNewUserMode(false); setEditingUser(user); }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center
                                    ${editingUser.id === user.id ? 'bg-seastar-700/50 border-seastar-cyan ring-1 ring-seastar-cyan' : 'bg-seastar-700/20 border-seastar-700 hover:bg-seastar-700'}`}
                            >
                                <div>
                                    <div className="font-bold text-gray-100 flex items-center gap-2">
                                        {user.username}
                                        {user.role === 'ADMIN' && <Shield size={12} className="text-yellow-400" />}
                                    </div>
                                    <div className="text-xs text-gray-400">{user.role} • {user.assignedShips.length === 0 ? 'No Ships' : user.assignedShips.includes('ALL') ? 'All Ships' : `${user.assignedShips.length} Ships`}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 bg-seastar-800 rounded-lg border border-seastar-700 p-6">
                    {isEditing ? (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-seastar-cyan border-b border-seastar-700 pb-2">
                                {newUserMode ? "Create New User" : `Edit User: ${editingUser.username}`}
                            </h2>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={editingUser.username || ''}
                                        onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                                        disabled={!newUserMode} // Can't change username after creation
                                        className="w-full bg-seastar-900 border border-seastar-600 rounded p-2 text-white focus:ring-2 focus:ring-seastar-cyan outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                                    <select
                                        value={editingUser.role || 'USER'}
                                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                                        className="w-full bg-seastar-900 border border-seastar-600 rounded p-2 text-white outline-none"
                                    >
                                        <option value="USER">User (Standard)</option>
                                        <option value="ADMIN">Admin (Full Access)</option>
                                        <option value="GUEST">Guest (Read Only)</option>
                                    </select>
                                </div>
                            </div>

                            {newUserMode && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Initial Password</label>
                                    <input
                                        type="password"
                                        value={editingUser.password || ''}
                                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                        placeholder="Default: 1234"
                                        className="w-full bg-seastar-900 border border-seastar-600 rounded p-2 text-white outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Granted Ship Access</label>
                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto bg-seastar-900/50 p-4 rounded-lg border border-seastar-700">
                                    {AVAILABLE_SHIPS.map(ship => (
                                        <div
                                            key={ship.id}
                                            onClick={() => toggleShipAccess(ship.id)}
                                            className={`p-2 rounded border cursor-pointer flex items-center gap-2 text-sm
                                                ${(editingUser.assignedShips || []).includes(ship.id)
                                                    ? 'bg-seastar-cyan/20 border-seastar-cyan text-seastar-cyan'
                                                    : 'bg-seastar-800 border-seastar-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center 
                                                ${(editingUser.assignedShips || []).includes(ship.id) ? 'bg-seastar-cyan border-seastar-cyan' : 'border-gray-500'}`}>
                                                {(editingUser.assignedShips || []).includes(ship.id) && <Check size={10} className="text-seastar-900" />}
                                            </div>
                                            {ship.name}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">* Admins automatically have access to all ships regardless of selection.</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-seastar-700">
                                {!newUserMode && (
                                    <button
                                        onClick={() => handleDeleteUser(editingUser.id!)}
                                        className="mr-auto text-red-400 hover:text-red-300 flex items-center gap-1 text-sm font-semibold"
                                    >
                                        <Trash2 size={16} /> Delete User
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsEditing(false); setEditingUser({}); }}
                                    className="px-4 py-2 rounded text-gray-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveUser}
                                    className="px-6 py-2 bg-seastar-cyan text-seastar-900 rounded font-bold hover:bg-cyan-300 flex items-center gap-2"
                                >
                                    <Save size={16} /> Save User
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <Shield size={64} className="mb-4 opacity-20" />
                            <p className="text-lg">Select a user to edit or create a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
