"use client";

import React from 'react';

interface BusTicketsThemeProviderProps {
  children: React.ReactNode;
}

const BusTicketsThemeProvider: React.FC<BusTicketsThemeProviderProps> = ({ children }) => {
  return (
    <div className="bus-tickets-theme">
      {children}
    </div>
  );
};

export default BusTicketsThemeProvider;