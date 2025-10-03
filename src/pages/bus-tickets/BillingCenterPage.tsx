"use client";

import React, { useState } from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import Footer from '@/components/Footer';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const BillingCenterPage = () => {
  const [contractNumber, setContractNumber] = useState('');
  const [rfc, setRfc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractNumber.trim() || !rfc.trim()) {
      toast.error('Por favor, rellena el número de contrato y el RFC.');
      return;
    }
    setLoading(true);
    // Aquí iría la lógica para enviar la solicitud de facturación
    console.log('Solicitud de facturación enviada:', { contractNumber, rfc });
    toast.success('Tu solicitud de facturación ha sido enviada. Recibirás tu factura en un plazo de 24-48 horas.');
    setContractNumber('');
    setRfc('');
    setLoading(false);
  };

  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Centro de Facturación
          </h1>
          <p className="text-lg text-center mb-10">
            Solicita tu factura electrónica para tus boletos de autobús.
          </p>
          <div className="bg-card p-8 rounded-lg shadow-lg max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="contract-number" className="text-lg">Número de Contrato</Label>
                <Input
                  type="text"
                  id="contract-number"
                  placeholder="Introduce tu número de contrato"
                  className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-primary"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="rfc" className="text-lg">RFC</Label>
                <Input
                  type="text"
                  id="rfc"
                  placeholder="Introduce tu RFC"
                  className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-primary"
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground font-semibold py-3 text-lg"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Solicitar Factura'}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-6 text-center">
              Asegúrate de que los datos proporcionados sean correctos para evitar demoras en la emisión de tu factura.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default BillingCenterPage;