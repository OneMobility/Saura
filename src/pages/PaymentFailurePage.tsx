"use client";

import React from 'react';
import { XCircle, AlertTriangle, MessageSquare, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PaymentFailurePage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-24 max-w-2xl">
        <Card className="shadow-2xl border-none overflow-hidden rounded-3xl">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-8">
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
            
            <h1 className="text-3xl font-black text-gray-900 mb-4">¡Oops! Algo salió mal con el pago</h1>
            <p className="text-lg text-gray-600 mb-8">
              No pudimos procesar tu transacción en este momento. Esto puede deberse a fondos insuficientes, 
              una interrupción en la conexión o que tu banco rechazó el cargo.
            </p>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-10 flex items-start gap-4 text-left">
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-amber-900">¿Qué puedo hacer?</p>
                <ul className="text-amber-800 text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Verifica que los datos de tu tarjeta sean correctos.</li>
                  <li>Asegúrate de tener fondos suficientes.</li>
                  <li>Intenta con un método de pago diferente.</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button asChild variant="outline" className="h-14 rounded-2xl border-gray-200">
                <Link to="/tours">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Tours
                </Link>
              </Button>
              <Button asChild className="h-14 rounded-2xl bg-rosa-mexicano hover:bg-rosa-mexicano/90">
                <button onClick={() => window.open(`https://wa.me/528444041469`, '_blank')} className="w-full flex items-center justify-center">
                  <MessageSquare className="mr-2 h-5 w-5" /> Hablar con un Asesor
                </button>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentFailurePage;