"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, KeyRound, Loader2, UserPlus } from 'lucide-react';
import UserEditDialog from '@/components/admin/users/UserEditDialog';
import AdminUserCreateDialog from '@/components/admin/users/AdminUserCreateDialog';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for logout

interface UserProfile {
  id: string;
  email: string; // Email from auth.users
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  role: string | null;
  created_at: string;
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-admin-users');

      if (error) {
        console.error('Error invoking list-admin-users function:', error);
        toast.error(`Error al cargar los usuarios: ${data?.error || error.message || 'Error desconocido.'}`);
      } else if (data && data.users) {
        setUsers(data.users);
      } else {
        toast.error('Respuesta inesperada al cargar usuarios.');
      }
    } catch (error: any) {
      console.error('Unexpected error fetching users:', error);
      toast.error(`Error inesperado al cargar usuarios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUserSave = (updatedUser: UserProfile) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === updatedUser.id ? { ...user, ...updatedUser } : user))
    );
  };

  const handlePasswordReset = async (email: string) => {
    if (!email || email === 'N/A') {
      toast.error('No se puede restablecer la contraseña para este usuario (correo no disponible).');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?reset=true`,
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      toast.error('Error al enviar el correo de restablecimiento de contraseña.');
    } else {
      toast.success(`Se ha enviado un correo de restablecimiento de contraseña a ${email}.`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex flex-col flex-grow items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="mt-4 text-gray-700">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          {/* Title removed from here */}
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <UserPlus className="mr-2 h-4 w-4" /> Crear Nuevo Usuario
          </Button>
          <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white ml-4">
            Cerrar Sesión
          </Button>
        </header>
        {/* Page title moved here, below the Navbar/Header */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 px-4 pt-8 pb-4">Gestión de Usuarios</h1>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Usuarios Registrados</h2>
            {users.length === 0 ? (
              <p className="text-gray-600">No hay usuarios registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Apellido</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.first_name || 'N/A'}</TableCell>
                        <TableCell>{user.last_name || 'N/A'}</TableCell>
                        <TableCell>{user.username || 'N/A'}</TableCell>
                        <TableCell>{user.role || 'user'}</TableCell>
                        <TableCell className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePasswordReset(user.email)}
                            className="text-yellow-600 hover:bg-yellow-50"
                          >
                            <KeyRound className="h-4 w-4" />
                            <span className="sr-only">Restablecer Contraseña</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      {selectedUser && (
        <UserEditDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          user={selectedUser}
          onSave={handleUserSave}
        />
      )}
      <AdminUserCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onUserCreated={fetchUsers}
      />
    </div>
  );
};

export default AdminUsersPage;