"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusContactSection from '@/components/bus-tickets/BusContactSection'; // Corrected import path
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';

const BusContactPage = () => {
  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow">
          <BusContactSection /> {/* Displaying the existing contact form */}
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default BusContactPage;