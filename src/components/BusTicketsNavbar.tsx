"use client";

import React, { useState } from 'react';
import { Bus, Menu, ChevronDown, LifeBuoy } from 'lucide-react'; // Import LifeBuoy for collapsible
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'; // Import Collapsible components

interface NavItem {
  name: string;
  href?: string;
  type: 'link' | 'collapsible';
  icon?: React.ElementType; // Optional icon for collapsible items
  children?: { name: string; href: string; }[];
}

const BusTicketsNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({}); // State for multiple collapsibles

  const handleCollapsibleToggle = (itemName: string) => {
    setCollapsedStates(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const navLinks: NavItem[] = [
    { name: 'Inicio', href: '/bus-tickets', type: 'link' },
    {
      name: 'Información',
      type: 'collapsible',
      children: [
        { name: 'Sobre Nosotros', href: '/bus-tickets/about' },
        { name: 'Política de Privacidad', href: '/bus-tickets/privacy-policy' },
        { name: 'Términos y Condiciones', href: '/bus-tickets/terms-and-conditions' },
        { name: 'Servicios Adicionales', href: '/bus-tickets/additional-services' },
      ],
    },
    { name: 'Destinos', href: '/bus-tickets/destinations', type: 'link' },
    { name: 'Contacto', href: '/bus-tickets/contact', type: 'link' },
    {
      name: 'Centro de Ayuda', // This is the new collapsible parent
      type: 'collapsible',
      icon: LifeBuoy, // Icon for Help Center
      children: [
        { name: 'FAQ', href: '/bus-tickets/faq' },
        { name: 'Centro de Facturación', href: '/bus-tickets/billing-center' },
        // The general HelpCenterPage can be linked here too if desired, or accessed via FAQ/Contact
      ],
    },
    { name: 'Tours Principales', href: '/tours', type: 'link' }, // Link back to main tours page
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
              {navLinks.map((item) => (
                item.type === 'link' ? (
                  <Link
                    key={item.name}
                    to={item.href || '#'}
                    className="text-lg font-medium text-bus-foreground hover:text-bus-primary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <Collapsible
                    key={item.name}
                    open={collapsedStates[item.name] || false}
                    onOpenChange={() => handleCollapsibleToggle(item.name)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-lg font-medium text-bus-foreground hover:text-bus-primary transition-colors"
                      >
                        {item.icon && <item.icon className="h-5 w-5 mr-2" />} {/* Render icon */}
                        <span>{item.name}</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                      <div className="ml-4 border-l border-bus-primary/30 pl-2 py-1 space-y-1">
                        {item.children?.map((child) => (
                          <Link
                            key={child.name}
                            to={child.href}
                            className="block text-base text-bus-foreground/80 hover:text-bus-primary transition-colors py-1"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default BusTicketsNavbar;