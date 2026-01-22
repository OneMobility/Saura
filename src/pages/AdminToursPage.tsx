"use client";

import React, { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle, DollarSign } from 'lucide-react';
import ToursTable from '@/components/admin/tours/ToursTable';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AdminToursPage = () => {
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of tours
  const { user, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();

  const handleTourSave = () => {
    setRefreshKey(prev => prev + 1); // Increment key to trigger re-fetch in ToursTable
  };

  const handleAddTour = () => {
    navigate('/admin/tours/new'); // Navigate to the new form page for creation
  };

  const handleCostOptimizationMode = () => {
    navigate('/admin/tours/new?mode=cost-optimization'); // Navigate to the new form page in cost optimization mode
  };

  const handleEditTour = (tour: any) => { // Use 'any' for now, will define Tour interface later
    navigate(`/admin/tours/edit/${tour.id}`); // Navigate to the new form page for editing
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
          <div className="flex space-x-2">
            <Button onClick={handleCostOptimizationMode} className="bg-green-600 hover:bg-green-700 text-white">
              <DollarSign className="mr-2 h-4 w-4" /> Optimizar Costo
            </Button>
            <Button onClick={handleAddTour} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Tour
            </Button>
          </div>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <ToursTable key={refreshKey} onEditTour={handleEditTour} onTourDeleted={handleTourSave} />
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminToursPage;