"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import BusSlideshow from '@/components/bus-tickets/BusSlideshow'; // Reusing existing slideshow
import SearchTripSection from '@/components/bus-tickets/SearchTripSection'; // Reusing existing search section
import BusDestinationsSection from '@/components/bus-tickets/BusDestinationsSection'; // New destinations section
import BusAboutUsSection from '@/components/bus-tickets/BusAboutUsSection'; // New about us section
import BusContactSection from '@/components/bus-tickets/BusContactSection'; // New contact section

const BusTicketsPage = () => {
  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow">
          {/* Slideshow Section */}
          <BusSlideshow />

          {/* Search Trip Section */}
          <SearchTripSection />

          {/* Destinations Section */}
          <BusDestinationsSection />

          {/* About Us Summary Section */}
          <BusAboutUsSection />

          {/* Contact Section */}
          <BusContactSection />
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default BusTicketsPage;