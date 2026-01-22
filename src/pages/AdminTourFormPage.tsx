"use client";

import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import TourForm from '@/components/admin/tours/TourForm'; // Import the refactored TourForm
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'; // Import useSearchParams
import { Loader2 } from 'lucide-react';

const AdminTourFormPage = () => {
  const { id } = useParams<{ id: string }>(); // Get tour ID from URL for editing
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useSession();
  const [searchParams] = useSearchParams(); // Get search params
  const mode = searchParams.get('mode'); // Check for mode=cost-optimization

  const handleSaveSuccess = () => {
    navigate('/admin/tours'); // Redirect back to the tours list after saving
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
        <AdminHeader pageTitle={id ? "Editar Tour" : (mode === 'cost-optimization' ? "Crear Tour (Optimización de Costos)" : "Crear Nuevo Tour")} />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <TourForm tourId={id} onSave={handleSaveSuccess} costOptimizationMode={mode === 'cost-optimization'} />
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminTourFormPage;