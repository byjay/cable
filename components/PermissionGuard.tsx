import React from 'react';
import { useCableAuth } from '../contexts/CableAuthContext';
import { CableEmployee } from '../services/CableEmployeeService';
import { Shield } from 'lucide-react';

interface PermissionGuardProps {
    children: React.ReactNode;
    requiredRole?: CableEmployee['role'][];
    requireSuperAdmin?: boolean;
    fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
    children,
    requiredRole,
    requireSuperAdmin = false,
    fallback
}) => {
    const { user, isAuthenticated, isSuperAdmin } = useCableAuth();

    if (!isAuthenticated || !user) {
        return null;
    }

    if (requireSuperAdmin && !isSuperAdmin) {
        return fallback ? <>{fallback}</> : <AccessDenied />;
    }

    if (requiredRole && !requiredRole.includes(user.role) && !isSuperAdmin) {
        return fallback ? <>{fallback}</> : <AccessDenied />;
    }

    return <>{children}</>;
};

const AccessDenied = () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 shadow-sm">
            <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Access Restricted</h2>
        <p className="text-slate-500 max-w-md">
            You do not have permission to view this content.
            <br />
            Contact your administrator if you believe this is an error.
        </p>
    </div>
);

export default PermissionGuard;
