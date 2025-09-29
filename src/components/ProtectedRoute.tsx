"use client";

import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, isAdmin, isLoading } = useSession();

  console.log('ProtectedRoute:', location.pathname, '- isLoading:', isLoading, 'user:', !!user, 'isAdmin:', isAdmin, 'adminOnly:', adminOnly);

  if (isLoading) {
    console.log('ProtectedRoute:', location.pathname, '- Showing loading state.');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Cargando autenticación...</p>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute:', location.pathname, '- User not authenticated, redirecting to /login.');
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    console.log('ProtectedRoute:', location.pathname, '- User is authenticated but not admin, redirecting to /.');
    return <Navigate to="/" replace />; // Or to a /forbidden page
  }

  console.log('ProtectedRoute:', location.pathname, '- Access granted.');
  return <>{children}</>;
};

export default ProtectedRoute;