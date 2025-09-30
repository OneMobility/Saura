"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Loader2, Package, Users, DollarSign, Hotel, Bus, CalendarCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardSummaryCard from '@/components/admin/dashboard/DashboardSummaryCard';
import ClientStatusChart from '@/components/admin/dashboard/ClientStatusChart';
import MonthlyRevenueChart from '@/components/admin/dashboard/MonthlyRevenueChart';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientStatusData {
  status: string;
  count: number;
}

interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

const AdminDashboard = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();

  const [totalTours, setTotalTours] = useState<number>(0);
  const [totalClients, setTotalClients] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalBuses, setTotalBuses] = useState<number>(0);
  const [totalHotels, setTotalHotels] = useState<number>(0);
  const [clientStatusData, setClientStatusData] = useState<ClientStatusData[]>([]);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<MonthlyRevenueData[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchDashboardData();
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      const [
        toursCountResponse,
        clientsCountResponse,
        revenueResponse,
        busesCountResponse,
        hotelsCountResponse,
        clientStatusResponse,
        monthlyPaymentsResponse,
      ] = await Promise.all([
        supabase.from('tours').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('total_paid, status').neq('status', 'cancelled'),
        supabase.from('buses').select('id', { count: 'exact', head: true }),
        supabase.from('hotels').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('status'),
        supabase.from('client_payments').select('payment_date, amount'),
      ]);

      // Summary Cards Data
      setTotalTours(toursCountResponse.count || 0);
      setTotalClients(clientsCountResponse.count || 0);
      setTotalBuses(busesCountResponse.count || 0);
      setTotalHotels(hotelsCountResponse.count || 0);

      const calculatedRevenue = (revenueResponse.data || []).reduce((sum, client) => sum + client.total_paid, 0);
      setTotalRevenue(calculatedRevenue);

      // Client Status Chart Data
      const statusCounts: { [key: string]: number } = {};
      (clientStatusResponse.data || []).forEach(client => {
        statusCounts[client.status] = (statusCounts[client.status] || 0) + 1;
      });
      setClientStatusData(Object.keys(statusCounts).map(status => ({ status, count: statusCounts[status] })));

      // Monthly Revenue Chart Data
      const monthlyRevenue: { [key: string]: number } = {};
      (monthlyPaymentsResponse.data || []).forEach(payment => {
        const date = parseISO(payment.payment_date);
        const monthYear = format(date, 'MMM yyyy', { locale: es });
        monthlyRevenue[monthYear] = (monthlyRevenue[monthYear] || 0) + payment.amount;
      });

      // Sort months chronologically for the chart
      const sortedMonthlyRevenue = Object.keys(monthlyRevenue)
        .sort((a, b) => {
          const dateA = parseISO(`01 ${a.replace(' ', '')}`); // Assuming 'MMM yyyy' format
          const dateB = parseISO(`01 ${b.replace(' ', '')}`);
          return dateA.getTime() - dateB.getTime();
        })
        .map(month => ({ month, revenue: monthlyRevenue[month] }));
      
      setMonthlyRevenueData(sortedMonthlyRevenue);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error(`Error al cargar los datos del dashboard: ${error.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  if (sessionLoading || (user && isAdmin && loadingData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="mt-4 text-gray-700">Cargando dashboard...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null; // Should be redirected by ProtectedRoute
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Dashboard de Administración" />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
            <DashboardSummaryCard title="Total Tours" value={totalTours} icon={Package} />
            <DashboardSummaryCard title="Total Clientes" value={totalClients} icon={Users} />
            <DashboardSummaryCard title="Ingresos Totales" value={`$${totalRevenue.toFixed(2)}`} icon={DollarSign} />
            <DashboardSummaryCard title="Autobuses Registrados" value={totalBuses} icon={Bus} />
            <DashboardSummaryCard title="Cotizaciones de Hoteles" value={totalHotels} icon={Hotel} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ClientStatusChart data={clientStatusData} />
            <MonthlyRevenueChart data={monthlyRevenueData} />
          </div>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminDashboard;