"use client";

import React, { useCallback, useRef } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import UserManagementTable from '@/components/admin/users/UserManagementTable';
import CreateUserDialog from '@/components/admin/users/CreateUserDialog';
import { toast } from 'sonner';

const AdminUsersPage = () => {
  const { user, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();
  const userTableRef = useRef<any>(null); // Ref to call fetchUsers on the table

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Cargando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate('/login');
    return null;
  }

  const handleUserCreated = useCallback(() => {
    // This function will be called after a user is successfully created
    // We need to trigger a refresh of the user list in UserManagementTable
    if (userTableRef.current && userTableRef.current.fetchUsers) {
      userTableRef.current.fetchUsers();
    } else {
      // Fallback if ref or method is not available (e.g., component not mounted yet)
      toast.info('Lista de usuarios actualizada. Es posible que necesites recargar la página si no ves los cambios.');
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="flex flex-col flex-grow">
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
        </header>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="flex justify-end mb-6">
            <CreateUserDialog onUserCreated={handleUserCreated} />
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <UserManagementTable ref={userTableRef} />
          </div>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminUsersPage;