"use client";

import React, { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import ProviderForm from '@/components/admin/providers/ProviderForm';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, DollarSign } from 'lucide-react'; // Import DollarSign
import { Button } from '@/components/ui/button'; // Import Button
import ProviderPaymentDialog from '@/components/admin/providers/ProviderPaymentDialog'; // NEW: Import ProviderPaymentDialog
import ProviderPaymentHistoryTable from '@/components/admin/providers/ProviderPaymentHistoryTable'; // NEW: Import ProviderPaymentHistoryTable

interface Provider {
  id: string; // Make id required for consistency
  name: string;
  cost_per_unit: number;
  total_paid: number;
}

const AdminProviderFormPage = () => {
  const { id } = useParams<{ id: string }>(); // Get provider ID from URL for editing
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useSession();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false); // NEW: State for payment dialog
  const [selectedProviderForPayment, setSelectedProviderForPayment] = useState<Provider | null>(null); // NEW: State for provider in payment dialog
  const [refreshPaymentsKey, setRefreshPaymentsKey] = useState(0); // NEW: Key to refresh payment history

  const handleSaveSuccess = () => {
    navigate('/admin/providers'); // Redirect back to the providers list after saving
  };

  // NEW: Callback to refresh provider data in the form and payment history
  const handleProviderDataRefresh = (updatedProvider?: Provider) => {
    if (updatedProvider) {
      setSelectedProviderForPayment(updatedProvider); // Update the provider data in state for the dialog
    }
    setRefreshPaymentsKey(prev => prev + 1); // Trigger re-fetch of payment history
  };

  // NEW: Handler for opening payment dialog
  const handleRegisterPayment = (providerData: Provider) => {
    setSelectedProviderForPayment(providerData);
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
        <AdminHeader pageTitle={id ? "Editar Proveedor" : "Crear Nuevo Proveedor"} />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <ProviderForm providerId={id} onSave={handleSaveSuccess} onProviderDataLoaded={handleProviderDataRefresh} onRegisterPayment={handleRegisterPayment} />
          
          {/* NEW: Payment History Table */}
          {id && (
            <div className="mt-8">
              <ProviderPaymentHistoryTable providerId={id} key={refreshPaymentsKey} onPaymentsUpdated={() => handleProviderDataRefresh(selectedProviderForPayment || undefined)} />
            </div>
          )}
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      {/* NEW: ProviderPaymentDialog */}
      {selectedProviderForPayment && (
        <ProviderPaymentDialog
          isOpen={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          provider={selectedProviderForPayment}
          onPaymentRegistered={() => handleProviderDataRefresh(selectedSelectedProviderForPayment)} // Refresh provider data after payment
        />
      )}
    </div>
  );
};

export default AdminProviderFormPage;