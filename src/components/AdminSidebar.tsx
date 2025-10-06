"use client";

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LayoutDashboard, Package, Newspaper, Users, Settings, TreePalm, Pin, PinOff, MessageSquareText, ChevronDown, Hotel, Truck, UserRound, Bus, Handshake, Ticket, MapPin, Map } from 'lucide-react'; // Added Map icon for Routes
import { useSession } from '@/components/SessionContextProvider';

interface NavItem {
  href?: string;
  icon: React.ElementType;
  label: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    icon: Ticket,
    label: 'Boletos de Autobús',
    children: [
      { href: '/admin/bus-tickets', icon: Ticket, label: 'Horarios' },
      { href: '/admin/bus-tickets/destinations', icon: MapPin, label: 'Destinos' },
      { href: '/admin/bus-tickets/routes', icon: Map, label: 'Rutas' }, // NEW: Added Routes submenu item
    ],
  },
  {
    icon: Package,
    label: 'Gestión de Viajes',
    children: [
      { href: '/admin/tours', icon: Package, label: 'Tours' },
      { href: '/admin/hotels', icon: Hotel, label: 'Hoteles' },
      { href: '/admin/buses', icon: Bus, label: 'Autobuses' },
      { href: '/admin/providers', icon: Handshake, label: 'Proveedores' },
      { href: '/admin/clients', icon: UserRound, label: 'Clientes' },
    ],
  },
  { href: '/admin/blog', icon: Newspaper, label: 'Blog' },
  { href: '/admin/reviews', icon: MessageSquareText, label: 'Opiniones' },
  { href: '/admin/users', icon: Users, label: 'Usuarios' },
  { href: '/admin/settings', icon: Settings, label: 'Configuración' },
];

const AdminSidebar = () => {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const location = useLocation();
  const { user, isAdmin, isLoading } = useSession();

  const isExpanded = isPinned || isHovering;

  const togglePin = () => {
    setIsPinned(prev => !prev);
  };

  const isParentActive = (item: NavItem) => {
    return item.children?.some(child => location.pathname.startsWith(child.href || '')) || false;
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-gray-900 text-gray-300 transition-all duration-300 ease-in-out relative z-30",
        isExpanded ? "w-64" : "w-20"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-center h-16 border-b border-gray-700">
        <Link to="/admin/dashboard" className="flex items-center space-x-2">
          <TreePalm className="h-6 w-6 text-rosa-mexicano" />
          {isExpanded && (
            <>
              <span className="text-xl font-bold text-white">Admin Panel</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePin();
                }}
                className="text-white hover:bg-gray-700 rounded-full h-8 w-8 ml-2"
              >
                {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                <span className="sr-only">{isPinned ? "Desfijar barra lateral" : "Fijar barra lateral"}</span>
              </Button>
            </>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-grow mt-4 space-y-2 px-2">
        {navItems.map((item) => (
          item.children ? (
            <Collapsible key={item.label} defaultOpen={isParentActive(item)}>
              <CollapsibleTrigger asChild>
                {!isExpanded ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full h-10 justify-center",
                          isParentActive(item) ? "bg-gray-700 text-white" : "hover:bg-gray-700"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="sr-only">{item.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-10 justify-start px-4 space-x-3",
                      isParentActive(item) ? "bg-gray-700 text-white" : "hover:bg-gray-700"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                  </Button>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <div className="ml-4 border-l border-gray-700 pl-2 py-1 space-y-1">
                  {item.children.map((child) => (
                    <Button
                      key={child.href}
                      variant="ghost"
                      className={cn(
                        "w-full h-9 justify-start px-4 space-x-3 text-sm",
                        location.pathname === child.href
                          ? "bg-rosa-mexicano text-white hover:bg-rosa-mexicano/90"
                          : "hover:bg-gray-700"
                      )}
                      asChild
                    >
                      <Link to={child.href || '#'}>
                        <child.icon className="h-4 w-4" />
                        <span>{child.label}</span>
                      </Link>
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div key={item.href}>
              {!isExpanded ? (
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
                      <Link to={item.href || '#'}>
                        <item.icon className="h-5 w-5" />
                        <span className="sr-only">{item.label}</span>
                      </Link>
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
                    <Link to={item.href || '#'}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                )}
            </div>
          )
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-700">
        {/* Footer content if needed */}
      </div>
    </aside>
  );
};

export default AdminSidebar;