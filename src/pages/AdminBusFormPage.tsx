"use client";

import React, { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import BusForm from '@/components/admin/buses/BusForm';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, DollarSign } from 'lucide-react'; // Import DollarSign
import { Button } from '@/components/ui/button'; // Import Button
import BusPaymentDialog from '@/components/admin/buses/BusPaymentDialog'; // NEW: Import BusPaymentDialog
import BusPaymentHistoryTable from '@/components/admin/buses/BusPaymentHistoryTable'; // NEW: Import BusPaymentHistoryTable

interface Bus {
  id: string; // Made required
  name: string;
  rental_cost: number;
  total_paid: number;
  remaining_payment: number;
}

const AdminBusFormPage = () => {
  const { id } = useParams<{ id: string }>(); // Get bus ID from URL for editing
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useSession();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false); // NEW: State for payment dialog
  const [selectedBusForPayment, setSelectedBusForPayment] = useState<Bus | null>(null); // NEW: State for bus in payment dialog
  const [refreshPaymentsKey, setRefreshPaymentsKey] = useState(0); // NEW: Key to refresh payment history

  const handleSaveSuccess = () => {
    navigate('/admin/buses'); // Redirect back to the buses list after saving
  };

  // NEW: Callback to refresh bus data in the form and payment history
  const handleBusDataRefresh = (updatedBus?: Bus) => {
    if (updatedBus) {
      setSelectedBusForPayment(updatedBus); // Update the bus data in state for the dialog
    }
    setRefreshPaymentsKey(prev => prev + 1); // Trigger re-fetch of payment history
  };

  // NEW: Handler for opening payment dialog
  const handleRegisterPayment = (busData: Bus) => {
    setSelectedBusForPayment(busData);
    setIsPaymentDialogOpen(true);
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
        <AdminHeader pageTitle={id ? "Editar Autobús" : "Crear Nuevo Autobús"} />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <BusForm busId={id} onSave={handleSaveSuccess} onBusDataLoaded={handleBusDataRefresh} onRegisterPayment={handleRegisterPayment} />
          
          {/* NEW: Payment History Table */}
          {id && (
            <div className="mt-8">
              <BusPaymentHistoryTable busId={id} key={refreshPaymentsKey} onPaymentsUpdated={() => handleBusDataRefresh(selectedBusForPayment || undefined)} />
            </div>
          )}
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      {/* NEW: BusPaymentDialog */}
      {selectedBusForPayment && (
        <BusPaymentDialog
          isOpen={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          bus={selectedBusForPayment}
          onPaymentRegistered={() => handleBusDataRefresh(selectedBusForPayment)} // Refresh bus data after payment
        />
      )}
    </div>
  );
};

export default AdminBusFormPage;