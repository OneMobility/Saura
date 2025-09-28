"use client";

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutDashboard, Package, Newspaper, Users, Settings, ChevronLeft, ChevronRight, TreePalm } from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/tours', icon: Package, label: 'Tours' },
  { href: '/admin/blog', icon: Newspaper, label: 'Blog' },
  { href: '/admin/users', icon: Users, label: 'Usuarios' },
  { href: '/admin/settings', icon: Settings, label: 'Configuración' },
];

const AdminSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-gray-900 text-gray-300 transition-all duration-300 ease-in-out relative",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-center h-16 border-b border-gray-700">
        <Link to="/admin/dashboard" className="flex items-center space-x-2">
          <TreePalm className="h-6 w-6 text-rosa-mexicano" />
          {!isCollapsed && <span className="text-xl font-bold text-white">Admin Panel</span>}
        </Link>
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="absolute -right-4 top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white rounded-full h-8 w-8 border border-gray-700 hidden lg:flex z-10"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-grow mt-4 space-y-2 px-2">
        {navItems.map((item) => (
          <div key={item.href}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-10 justify-center",
                      location.pathname === item.href
                        ? "bg-rosa-mexicano text-white hover:bg-rosa-mexicano/90"
                        : "hover:bg-gray-700"
                    )}
                    asChild
                  >
                    <Link to={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span className="sr-only">{item.label}</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-10 justify-start px-4 space-x-3",
                  location.pathname === item.href
                    ? "bg-rosa-mexicano text-white hover:bg-rosa-mexicano/90"
                    : "hover:bg-gray-700"
                )}
                asChild
              >
                <Link to={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            )}
          </div>
        ))}
      </nav>

      {/* Sidebar Footer (e.g., for fixed items or spacing) */}
      <div className="p-4 border-t border-gray-700">
        {/* Puedes añadir elementos de pie de página aquí si es necesario */}
      </div>
    </aside>
  );
};

export default AdminSidebar;