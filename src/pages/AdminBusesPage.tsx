"use client";

import React, { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BusesTable from '@/components/admin/buses/BusesTable'; // Import the new BusesTable
import BusForm from '@/components/admin/buses/BusForm'; // Import the new BusForm
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Bus {
  id: string;
  name: string;
  license_plate: string;
  rental_cost: number;
  total_capacity: number;
  seat_map_image_url: string | null;
  created_at: string;
}

const AdminBusesPage = () => {
  const { user, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of buses
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | undefined>(undefined);

  const handleBusSave = () => {
    setRefreshKey(prev => prev + 1); // Increment key to trigger re-fetch in BusesTable
    setIsFormDialogOpen(false); // Close dialog after save
  };

  const handleAddBus = () => {
    setSelectedBus(undefined); // Clear selected bus for new entry
    setIsFormDialogOpen(true);
  };

  const handleEditBus = (bus: Bus) => {
    setSelectedBus(bus);
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
        <AdminHeader pageTitle="Gestión de Autobuses">
          <Button onClick={handleAddBus} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Autobús
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <BusesTable key={refreshKey} onEditBus={handleEditBus} onBusDeleted={handleBusSave} />
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBus ? 'Editar Autobús' : 'Añadir Nuevo Autobús'}</DialogTitle>
          </DialogHeader>
          <BusForm busId={selectedBus?.id} onSave={handleBusSave} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBusesPage;