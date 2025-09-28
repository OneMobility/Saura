"use client";

import React, { useState } from 'react';
import { TreePalm, Menu, Sun, CloudSun, Moon } from 'lucide-react'; // Import icons
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSession } from '@/components/SessionContextProvider'; // Import useSession
import { getGreeting } from '@/utils/greetings'; // Import getGreeting utility

const iconMap: { [key: string]: React.ElementType } = {
  Sun: Sun,
  CloudSun: CloudSun,
  Moon: Moon,
};

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAdmin, isLoading, firstName } = useSession(); // Get session info

  const navLinks = [
    { name: 'Inicio', href: '/' },
    { name: 'Tours', href: '/tours' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contacto', href: '/contact' },
  ];

  const { text: personalizedGreetingText, icon: greetingIconName } = getGreeting(firstName); // Get both text and icon name
  const GreetingIcon = iconMap[greetingIconName]; // Get the actual icon component

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

      {/* Main navigation and greeting */}
      <div className="flex items-center justify-between flex-grow px-4">
        {/* Desktop Nav Links (hidden on mobile, shown on larger screens) */}
        <div className="hidden md:flex space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="text-lg font-medium text-gray-800 hover:text-rosa-mexicano transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Greeting and Admin Access (Desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-2 text-gray-700">
              {GreetingIcon && <GreetingIcon className="h-5 w-5 text-rosa-mexicano" />}
              <span className="font-medium">{personalizedGreetingText}</span>
            </div>
          )}
          <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <Link to={user && isAdmin ? "/admin/dashboard" : "/login"}>
              {user && isAdmin ? "Panel Admin" : "Acceso Admin"}
            </Link>
          </Button>
        </div>

        {/* Hamburger Menu (always visible) */}
        <div className="md:hidden flex items-center">
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
                {user && (
                  <div className="flex items-center space-x-2 text-gray-700 mt-4">
                    {GreetingIcon && <GreetingIcon className="h-5 w-5 text-rosa-mexicano" />}
                    <span className="font-medium">{personalizedGreetingText}</span>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;