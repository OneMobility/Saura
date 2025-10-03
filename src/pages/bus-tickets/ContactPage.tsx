"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter'; // NEW: Import BusTicketsFooter
import ContactSection from '@/components/ContactSection'; // Reusing the existing ContactSection
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';

const ContactPage = () => {
  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow">
          <ContactSection /> {/* Displaying the existing contact form */}
        </main>
        <BusTicketsFooter /> {/* NEW: Use BusTicketsFooter */}
      </div>
    </BusTicketsThemeProvider>
  );
};

export default ContactPage;