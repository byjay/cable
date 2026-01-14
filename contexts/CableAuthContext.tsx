/**
 * CableAuthContext - Authentication Context for Cable Management
 * Adapted from SDMS AuthContext
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { cableEmployeeService, CableEmployee, SUPER_ADMIN_EMAIL } from '../services/CableEmployeeService';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface CableAuthContextType {
    user: CableEmployee | null;
    loading: boolean;
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    login: (nameOrEmail: string, password: string) => Promise<void>;
    logout: () => void;
    changePassword: (newPassword: string) => Promise<boolean>;
    registerShip: (shipId: string) => Promise<boolean>;
}

const CableAuthContext = createContext<CableAuthContextType | undefined>(undefined);

export const CableAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<CableEmployee | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionStart, setSessionStart] = useState<number | null>(null);

    // Session timeout check
    const checkSessionTimeout = useCallback(() => {
        if (sessionStart && Date.now() - sessionStart > SESSION_TIMEOUT_MS) {
            console.log('[CableAuth] Session timeout - forcing logout');
            localStorage.removeItem('cable_session');
            window.location.reload();
        }
    }, [sessionStart]);

    useEffect(() => {
        // Check for existing session
        const checkSession = () => {
            try {
                const stored = localStorage.getItem('cable_session');
                if (stored) {
                    const session = JSON.parse(stored);
                    const loginTime = session.loginTime || 0;

                    // Check timeout
                    if (Date.now() - loginTime > SESSION_TIMEOUT_MS) {
                        console.log('[CableAuth] Previous session expired');
                        localStorage.removeItem('cable_session');
                        setLoading(false);
                        return;
                    }

                    if (session.user) {
                        setUser(session.user);
                        setSessionStart(loginTime);
                    }
                }
            } catch (e) {
                console.error('[CableAuth] Session restore failed:', e);
            }
            setLoading(false);
        };
        checkSession();

        // Check timeout every minute
        const intervalId = setInterval(checkSessionTimeout, 60000);

        return () => clearInterval(intervalId);
    }, [checkSessionTimeout]);

    /**
     * Login
     */
    const login = async (nameOrEmail: string, password: string): Promise<void> => {
        try {
            const employee = cableEmployeeService.login(nameOrEmail, password);

            if (!employee) {
                throw new Error('로그인 실패: 이름/이메일 또는 비밀번호를 확인하세요.');
            }

            const loginTime = Date.now();
            setUser(employee);
            setSessionStart(loginTime);
            localStorage.setItem('cable_session', JSON.stringify({
                user: employee,
                loginTime
            }));
        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    };

    /**
     * Logout
     */
    const logout = () => {
        setUser(null);
        setSessionStart(null);
        localStorage.removeItem('cable_session');
    };

    /**
     * Change password
     */
    const changePassword = async (newPassword: string): Promise<boolean> => {
        if (!user) return false;
        return cableEmployeeService.changePassword(user.id, newPassword);
    };

    /**
     * Register Ship
     */
    const registerShip = async (shipId: string): Promise<boolean> => {
        if (!user) return false;
        const success = cableEmployeeService.registerShipAccess(user.id, shipId);
        if (success) {
            // Update local state instantly
            const updatedUser = { ...user, shipAccess: [...(user.shipAccess || []), shipId] };
            setUser(updatedUser);
            // Update session storage
            localStorage.setItem('cable_session', JSON.stringify({
                user: updatedUser,
                loginTime: sessionStart
            }));
            return true;
        }
        return false;
    };

    const isSuperAdmin = user ? user.email === SUPER_ADMIN_EMAIL : false;

    return (
        <CableAuthContext.Provider value={{
            user,
            loading,
            isAuthenticated: !!user,
            isSuperAdmin,
            login,
            logout,

            changePassword,
            registerShip
        }}>
            {children}
        </CableAuthContext.Provider>
    );
};

export const useCableAuth = () => {
    const context = useContext(CableAuthContext);
    if (context === undefined) {
        throw new Error('useCableAuth must be used within CableAuthProvider');
    }
    return context;
};
