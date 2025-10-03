"use client";

import React, { useState } from 'react';
import { Bus, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const BusTicketsNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Inicio', href: '/bus-tickets' },
    { name: 'Destinos', href: '/bus-tickets/destinations' },
    { name: 'Sobre Nosotros', href: '/bus-tickets/about' },
    { name: 'Política de Privacidad', href: '/bus-tickets/privacy-policy' },
    { name: 'Términos y Condiciones', href: '/bus-tickets/terms-and-conditions' },
    { name: 'FAQ', href: '/bus-tickets/faq' },
    { name: 'Centro de Facturación', href: '/bus-tickets/billing-center' },
    { name: 'Contacto', href: '/bus-tickets/contact' },
    { name: 'Tours Principales', href: '/tours' }, // Link back to main tours page
  ];

  return (
    <nav className="bg-bus-primary text-bus-primary-foreground shadow-md w-full flex items-stretch min-h-[64px]">
      {/* Left section with logo */}
      <div
        className="bg-bus-secondary flex items-center pl-4 pr-12"
        style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)', minWidth: '200px' }}
      >
        <Link to="/bus-tickets" className="flex items-center space-x-2">
          <Bus className="text-bus-primary h-6 w-6" />
          <div className="text-lg font-bold text-bus-primary">Saura Bus</div>
        </Link>
      </div>

      {/* Hamburger Menu (always visible) */}
      <div className="flex items-center justify-end flex-grow pr-4">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-bus-primary-foreground hover:bg-bus-primary/90">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-bus-background p-6">
            <div className="flex flex-col space-y-4 pt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-lg font-medium text-bus-foreground hover:text-bus-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)} // Close sheet on link click
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default BusTicketsNavbar;