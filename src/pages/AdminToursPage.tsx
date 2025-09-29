"use client";

import React, { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import ToursTable from '@/components/admin/tours/ToursTable'; // Import the new ToursTable
import TourFormDialog from '@/components/admin/tours/TourFormDialog'; // Import the new TourFormDialog
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AdminToursPage = () => {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null); // For editing
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of tours
  const { user, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();

  const handleTourSave = () => {
    setRefreshKey(prev => prev + 1); // Increment key to trigger re-fetch in ToursTable
    setIsFormDialogOpen(false); // Close dialog after saving
    setSelectedTour(null); // Clear selected tour
  };

  const handleAddTour = () => {
    setSelectedTour(null); // Ensure no tour is selected for a new entry
    setIsFormDialogOpen(true);
  };

  const handleEditTour = (tour: any) => { // Use 'any' for now, will define Tour interface later
    setSelectedTour(tour);
    setIsFormDialogOpen(true);
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
        <AdminHeader pageTitle="Gestión de Tours">
          <Button onClick={handleAddTour} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Tour
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <ToursTable key={refreshKey} onEditTour={handleEditTour} onTourDeleted={handleTourSave} />
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      <TourFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => {
          setIsFormDialogOpen(false);
          setSelectedTour(null); // Clear selected tour on close
        }}
        onSave={handleTourSave}
        initialData={selectedTour}
      />
    </div>
  );
};

export default AdminToursPage;