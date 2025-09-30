"use client";

import React, { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClientsTable from '@/components/admin/clients/ClientsTable'; // Import the new ClientsTable
// Removed ClientFormDialog import as it's now a page

const AdminClientsPage = () => {
  const { user, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();
  // Removed isCreateDialogOpen state
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of clients

  const handleClientSave = () => {
    setRefreshKey(prev => prev + 1); // Increment key to trigger re-fetch in ClientsTable
  };

  const handleAddClient = () => {
    navigate('/admin/clients/new'); // Navigate to the new form page for creation
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Clientes">
          <Button onClick={handleAddClient} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Cliente
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <ClientsTable refreshKey={refreshKey} />
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      {/* Removed ClientFormDialog */}
    </div>
  );
};

export default AdminClientsPage;