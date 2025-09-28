"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ContactSection from '@/components/ContactSection'; // Reusing the existing ContactSection

const ContactPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <ContactSection /> {/* Displaying the existing contact form */}
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;