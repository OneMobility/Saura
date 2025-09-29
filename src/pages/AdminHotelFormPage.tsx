"use client";

import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import HotelForm from '@/components/admin/hotels/HotelForm'; // Import the refactored HotelForm
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AdminHotelFormPage = () => {
  const { id } = useParams<{ id: string }>(); // Get hotel ID from URL for editing
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useSession();

  const handleSaveSuccess = () => {
    navigate('/admin/hotels'); // Redirect back to the hotels list after saving
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
        <AdminHeader pageTitle={id ? "Editar Cotización de Hotel" : "Crear Nueva Cotización de Hotel"} />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <HotelForm hotelId={id} onSave={handleSaveSuccess} />
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminHotelFormPage;