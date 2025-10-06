"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BusSchedulesTable from '@/components/admin/bus-schedules/BusSchedulesTable'; // NEW: Import BusSchedulesTable
import BusScheduleFormDialog from '@/components/admin/bus-schedules/BusScheduleFormDialog'; // NEW: Import BusScheduleFormDialog
import { BusSchedule } from '@/types/shared';

const AdminBusSchedulesPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<BusSchedule | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of schedules

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  const handleAddSchedule = () => {
    setSelectedSchedule(null);
    setIsFormDialogOpen(true);
  };

  const handleEditSchedule = (schedule: BusSchedule) => {
    setSelectedSchedule(schedule);
    setIsFormDialogOpen(true);
  };

  const handleScheduleSave = () => {
    setRefreshKey(prev => prev + 1); // Increment key to trigger re-fetch in BusSchedulesTable
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
        <AdminHeader pageTitle="Gestión de Horarios de Autobús">
          <Button onClick={handleAddSchedule} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Horario
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <BusSchedulesTable onEditSchedule={handleEditSchedule} onScheduleDeleted={handleScheduleSave} refreshKey={refreshKey} />
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      <BusScheduleFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSave={handleScheduleSave}
        initialData={selectedSchedule}
      />
    </div>
  );
};

export default AdminBusSchedulesPage;