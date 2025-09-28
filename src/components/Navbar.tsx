"use client";

import React, { useState } from 'react';
import { TreePalm, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSession } from '@/components/SessionContextProvider'; // Import useSession

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAdmin, isLoading } = useSession(); // Get session info

  const navLinks = [
    { name: 'Inicio', href: '/' },
    { name: 'Tours', href: '/tours' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contacto', href: '/contact' },
  ];

  return (
    <nav className="bg-white shadow-sm w-full flex items-stretch min-h-[64px]">
      {/* Left section with logo */}
      <div
        className="bg-rosa-mexicano flex items-center pl-4 pr-12"
        style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)', minWidth: '200px' }}
      >
        <Link to="/" className="flex items-center space-x-2">
          <TreePalm className="text-white h-6 w-6" />
          <div className="text-lg font-bold text-white">Saura Tours</div>
        </Link>
      </div>

      {/* Hamburger Menu (always visible) */}
      <div className="flex items-center justify-end flex-grow pr-4">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-700 hover:bg-gray-100">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-white p-6">
            <div className="flex flex-col space-y-4 pt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-lg font-medium text-gray-800 hover:text-rosa-mexicano transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)} // Close sheet on link click
                >
                  {link.name}
                </Link>
              ))}
              {/* Admin Access button in the mobile menu */}
              <Link
                to={user && isAdmin ? "/admin/dashboard" : "/login"}
                className="text-lg font-medium text-gray-800 hover:text-rosa-mexicano transition-colors mt-4"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {user && isAdmin ? "Panel Admin" : "Acceso Admin"}
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default Navbar;