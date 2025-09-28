"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner'; // Using sonner for toasts

const TourInquirySection = () => {
  const [contractNumber, setContractNumber] = useState('');

  const handleInquiry = () => {
    if (contractNumber.trim() === '') {
      toast.error('Por favor, introduce un número de contrato.');
      return;
    }
    // Aquí iría la lógica para consultar el tour con el número de contrato
    // Por ahora, solo mostraremos un mensaje de éxito/error simulado
    toast.info(`Buscando detalles para el contrato: ${contractNumber}`);
    console.log('Consultando tour para el número de contrato:', contractNumber);
    // Simular una respuesta
    setTimeout(() => {
      if (contractNumber === '12345') { // Ejemplo de número de contrato válido
        toast.success('¡Tour encontrado! Detalles enviados a tu correo.');
      } else {
        toast.error('Número de contrato no encontrado. Por favor, verifica e intenta de nuevo.');
      }
    }, 2000);
  };

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-rosa-mexicano text-white">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Consulta tu Tour
        </h2>
        <p className="text-lg mb-8">
          Introduce tu número de contrato para ver los detalles de tu reserva.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="contract-number" className="sr-only">Número de Contrato</Label>
            <Input
              type="text"
              id="contract-number"
              placeholder="Número de Contrato"
              className="bg-white text-gray-800 placeholder:text-gray-500 border-none focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-white"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
            />
          </div>
          <Button
            onClick={handleInquiry}
            className="bg-white text-rosa-mexicano hover:bg-gray-100 font-semibold px-6 py-3"
          >
            Consultar
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TourInquirySection;