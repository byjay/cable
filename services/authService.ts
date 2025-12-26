import { User } from '../types';

const USER_STORAGE_KEY = 'SEASTAR_USERS_DB';
const CURRENT_USER_KEY = 'SEASTAR_CURRENT_USER';

// Default Admin for initial setup
const DEFAULT_ADMIN: User = {
    id: 'admin',
    username: 'admin',
    password: '123', // Simple default
    role: 'ADMIN',
    assignedShips: ['ALL'] // Special keyword for access to everything? Or list all? 'ALL' is easier.
};

// Default Designer for user request
export const DEFAULT_DESIGNER: User = {
    id: 'designer',
    username: 'designer@seastar.work',
    password: '123',
    role: 'ADMIN',
    assignedShips: ['ALL']
};

export const AuthService = {
    // === User Management ===
    getUsers: (): User[] => {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (!stored) {
            // Initialize with defaults if empty
            const defaults = [DEFAULT_ADMIN, DEFAULT_DESIGNER];
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaults));
            return defaults;
        }
        return JSON.parse(stored);
    },

    saveUsers: (users: User[]) => {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
    },

    createUser: (newUser: User) => {
        const users = AuthService.getUsers();
        if (users.find(u => u.username === newUser.username)) {
            throw new Error('Username already exists');
        }
        users.push(newUser);
        AuthService.saveUsers(users);
        return newUser;
    },

    updateUser: (updatedUser: User) => {
        const users = AuthService.getUsers();
        const index = users.findIndex(u => u.id === updatedUser.id);
        if (index === -1) throw new Error('User not found');
        users[index] = updatedUser;
        AuthService.saveUsers(users);
    },

    deleteUser: (userId: string) => {
        const users = AuthService.getUsers().filter(u => u.id !== userId);
        AuthService.saveUsers(users);
    },

    // === Authentication ===
    login: (username: string, pass: string): User | null => {
        const users = AuthService.getUsers();
        // Simple plain check
        const user = users.find(u => u.username === username && u.password === pass);
        if (user) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
            return user;
        }
        return null;
    },

    logout: () => {
        localStorage.removeItem(CURRENT_USER_KEY);
    },

    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem(CURRENT_USER_KEY);
        return stored ? JSON.parse(stored) : null;
    },

    // === Permission Helpers ===
    isAdmin: (user: User | null): boolean => {
        return user?.role === 'ADMIN';
    },

    canAccessShip: (user: User | null, shipId: string): boolean => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        if (user.assignedShips.includes('ALL')) return true;
        return user.assignedShips.includes(shipId);
    }
};
