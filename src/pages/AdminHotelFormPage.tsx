"use client";

import React, { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import HotelForm from '@/components/admin/hotels/HotelForm';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, DollarSign } from 'lucide-react'; // Import DollarSign
import { Button } from '@/components/ui/button'; // Import Button
import HotelPaymentDialog from '@/components/admin/hotels/HotelPaymentDialog'; // NEW: Import HotelPaymentDialog
import HotelPaymentHistoryTable from '@/components/admin/hotels/HotelPaymentHistoryTable'; // NEW: Import HotelPaymentHistoryTable

interface Hotel {
  id: string;
  name: string;
  total_quote_cost: number;
  total_paid: number;
  remaining_payment: number;
}

const AdminHotelFormPage = () => {
  const { id } = useParams<{ id: string }>(); // Get hotel ID from URL for editing
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useSession();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false); // NEW: State for payment dialog
  const [selectedHotelForPayment, setSelectedHotelForPayment] = useState<Hotel | null>(null); // NEW: State for hotel in payment dialog
  const [refreshPaymentsKey, setRefreshPaymentsKey] = useState(0); // NEW: Key to refresh payment history

  const handleSaveSuccess = () => {
    navigate('/admin/hotels'); // Redirect back to the hotels list after saving
  };

  // NEW: Callback to refresh hotel data in the form and payment history
  const handleHotelDataRefresh = (updatedHotel?: Hotel) => {
    if (updatedHotel) {
      setSelectedHotelForPayment(updatedHotel); // Update the hotel data in state for the dialog
    }
    setRefreshPaymentsKey(prev => prev + 1); // Trigger re-fetch of payment history
  };

  // NEW: Handler for opening payment dialog
  const handleRegisterPayment = (hotelData: Hotel) => {
    setSelectedHotelForPayment(hotelData);
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
        <AdminHeader pageTitle={id ? "Editar Cotización de Hotel" : "Crear Nueva Cotización de Hotel"} />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <HotelForm hotelId={id} onSave={handleSaveSuccess} onHotelDataLoaded={handleHotelDataRefresh} onRegisterPayment={handleRegisterPayment} />
          
          {/* NEW: Payment History Table */}
          {id && (
            <div className="mt-8">
              <HotelPaymentHistoryTable hotelId={id} key={refreshPaymentsKey} onPaymentsUpdated={() => handleHotelDataRefresh(selectedHotelForPayment || undefined)} />
            </div>
          )}
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      {/* NEW: HotelPaymentDialog */}
      {selectedHotelForPayment && (
        <HotelPaymentDialog
          isOpen={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          hotel={selectedHotelForPayment}
          onPaymentRegistered={() => handleHotelDataRefresh(selectedHotelForPayment)} // Refresh hotel data after payment
        />
      )}
    </div>
  );
};

export default AdminHotelFormPage;