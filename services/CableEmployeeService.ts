/**
 * CableEmployeeService - User Management for Cable System
 * Adapted from SDMS EmployeeService
 * Kim Bong-jung (designsir@seastargo.com) is the ONLY SUPER_ADMIN
 */

export interface CableEmployee {
    id: string;
    name: string;
    password: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'GUEST';
    status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
    company: string;
    position: string;
    email: string;
    phone: string;
    createdAt: string;
    lastLogin?: string;
    shipAccess?: string[]; // HK2401, S1001_35K_FD, etc.
}

const EMPLOYEES_KEY = 'cable_employees';
const DEFAULT_PASSWORD = '1';

// SUPER_ADMIN - Only Kim Bong-jung
export const SUPER_ADMIN_EMAIL = 'designsir@seastargo.com';

class CableEmployeeService {
    private employees: CableEmployee[] = [];

    constructor() {
        this.loadData();
        this.initDefaultUsers();
    }

    private loadData(): void {
        try {
            const stored = localStorage.getItem(EMPLOYEES_KEY);
            if (stored) {
                this.employees = JSON.parse(stored);
            }
        } catch (e) {
            console.error('[CableEmployeeService] Failed to load data:', e);
        }
    }

    private saveEmployees(): void {
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(this.employees));
    }

    private initDefaultUsers(): void {
        const CURRENT_VERSION = 'v1';
        const storedVersion = localStorage.getItem('cable_employees_version');

        if (storedVersion !== CURRENT_VERSION) {
            this.employees = [
                // ==========================================
                // SUPER_ADMIN - Kim Bong-jung (ONLY ONE)
                // ==========================================
                {
                    id: 'designsir',
                    name: '김봉정',
                    password: '1',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE',
                    company: 'SEASTAR',
                    position: '시스템 관리자',
                    email: 'designsir@seastargo.com',
                    phone: '',
                    shipAccess: ['*'], // All ships
                    createdAt: new Date().toISOString()
                },
                // ==========================================
                // ADMIN - Limited admin users
                // ==========================================
                {
                    id: 'admin',
                    name: 'Admin',
                    password: '1',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    company: 'SEASTAR',
                    position: '관리자',
                    email: 'admin@seastargo.com',
                    phone: '',
                    shipAccess: ['*'],
                    createdAt: new Date().toISOString()
                },
                // ==========================================
                // MANAGER
                // ==========================================
                {
                    id: 'manager',
                    name: 'Manager',
                    password: '1',
                    role: 'MANAGER',
                    status: 'ACTIVE',
                    company: 'SEASTAR',
                    position: '매니저',
                    email: 'manager@seastargo.com',
                    phone: '',
                    shipAccess: ['HK2401', 'S1001_35K_FD'],
                    createdAt: new Date().toISOString()
                },
                // ==========================================
                // USER
                // ==========================================
                {
                    id: 'user',
                    name: 'User',
                    password: '1',
                    role: 'USER',
                    status: 'ACTIVE',
                    company: 'SEASTAR',
                    position: '사용자',
                    email: 'user@seastargo.com',
                    phone: '',
                    shipAccess: ['HK2401'],
                    createdAt: new Date().toISOString()
                },
                // ==========================================
                // GUEST
                // ==========================================
                {
                    id: 'guest',
                    name: 'Guest',
                    password: '1',
                    role: 'GUEST',
                    status: 'ACTIVE',
                    company: 'External',
                    position: '외부 방문자',
                    email: 'guest@external.com',
                    phone: '',
                    shipAccess: [],
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveEmployees();
            localStorage.setItem('cable_employees_version', CURRENT_VERSION);
            console.log('[CableEmployeeService] Default users initialized');
        }
    }

    /**
     * Login with name, email, or ID
     */
    login(nameOrEmail: string, password: string): CableEmployee | null {
        const searchTerm = nameOrEmail.toLowerCase().trim();

        const employee = this.employees.find(e => {
            const matchName = e.name.toLowerCase() === searchTerm;
            const matchId = e.id.toLowerCase() === searchTerm;
            const matchEmail = e.email.toLowerCase() === searchTerm;
            const matchEmailPrefix = e.email.split('@')[0].toLowerCase() === searchTerm;

            return (matchName || matchId || matchEmail || matchEmailPrefix) && e.password === password;
        });

        if (employee) {
            if (employee.status !== 'ACTIVE') {
                throw new Error('계정이 비활성화 상태입니다.');
            }
            employee.lastLogin = new Date().toISOString();
            this.saveEmployees();
            return employee;
        }

        return null;
    }

    /**
     * Change password
     */
    changePassword(employeeId: string, newPassword: string): boolean {
        const employee = this.employees.find(e => e.id === employeeId);
        if (employee) {
            employee.password = newPassword;
            this.saveEmployees();
            return true;
        }
        return false;
    }

    /**
     * Get all employees (SUPER_ADMIN only)
     */
    getAllEmployees(): CableEmployee[] {
        return [...this.employees];
    }

    /**
     * Update employee
     */
    updateEmployee(employeeId: string, updates: Partial<CableEmployee>): boolean {
        const index = this.employees.findIndex(e => e.id === employeeId);
        if (index !== -1) {
            this.employees[index] = { ...this.employees[index], ...updates };
            this.saveEmployees();
            return true;
        }
        return false;
    }

    /**
     * Add new employee
     */
    addEmployee(employee: Omit<CableEmployee, 'id' | 'createdAt'>): CableEmployee {
        const newEmployee: CableEmployee = {
            ...employee,
            id: `emp_${Date.now()}`,
            createdAt: new Date().toISOString()
        };
        this.employees.push(newEmployee);
        this.saveEmployees();
        return newEmployee;
    }

    /**
     * Delete employee
     */
    deleteEmployee(employeeId: string): boolean {
        const index = this.employees.findIndex(e => e.id === employeeId);
        if (index !== -1) {
            this.employees.splice(index, 1);
            this.saveEmployees();
            return true;
        }
        return false;
    }

    /**
     * Check if user is SUPER_ADMIN
     */
    isSuperAdmin(email: string): boolean {
        return email === SUPER_ADMIN_EMAIL;
    }
}

export const cableEmployeeService = new CableEmployeeService();
