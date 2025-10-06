"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BusRoutesTable from '@/components/admin/bus-routes/BusRoutesTable'; // Import the new BusRoutesTable
import BusRouteFormDialog from '@/components/admin/bus-routes/BusRouteFormDialog'; // Import the new BusRouteFormDialog
import { BusRoute } from '@/types/shared';

const AdminBusRoutesPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of routes

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  const handleAddRoute = () => {
    setSelectedRoute(null);
    setIsFormDialogOpen(true);
  };

  const handleEditRoute = (route: BusRoute) => {
    setSelectedRoute(route);
    setIsFormDialogOpen(true);
  };

  const handleRouteSave = () => {
    setRefreshKey(prev => prev + 1); // Increment key to trigger re-fetch in BusRoutesTable
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Rutas de Autobús">
          <Button onClick={handleAddRoute} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Ruta
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <BusRoutesTable onEditRoute={handleEditRoute} onRouteDeleted={handleRouteSave} refreshKey={refreshKey} />
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      <BusRouteFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSave={handleRouteSave}
        initialData={selectedRoute}
      />
    </div>
  );
};

export default AdminBusRoutesPage;