"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, Link } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Loader2, Package, Users, DollarSign, Hotel, Bus, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardSummaryCard from '@/components/admin/dashboard/DashboardSummaryCard';
import ClientStatusChart from '@/components/admin/dashboard/ClientStatusChart';
import MonthlyRevenueChart from '@/components/admin/dashboard/MonthlyRevenueChart';
import { format, parseISO, subHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const AdminDashboard = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();

  const [totalTours, setTotalTours] = useState<number>(0);
  const [totalClients, setTotalClients] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalBuses, setTotalBuses] = useState<number>(0);
  const [totalHotels, setTotalHotels] = useState<number>(0);
  const [clientStatusData, setClientStatusData] = useState<any[]>([]);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any[]>([]);
  const [expiredClients, setExpiredClients] = useState<any[]>([]);
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
      const yesterday = subHours(new Date(), 24).toISOString();

      const [
        toursCount,
        clientsCount,
        revenueData,
        busesCount,
        hotelsCount,
        clientStatus,
        monthlyPayments,
        expiredPending
      ] = await Promise.all([
        supabase.from('tours').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('total_paid, status').neq('status', 'cancelled'),
        supabase.from('buses').select('id', { count: 'exact', head: true }),
        supabase.from('hotels').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('status'),
        supabase.from('client_payments').select('payment_date, amount'),
        supabase.from('clients')
          .select('id, contract_number, first_name, last_name, created_at')
          .eq('status', 'pending')
          .eq('total_paid', 0)
          .lt('created_at', yesterday)
          .limit(5)
      ]);

      setTotalTours(toursCount.count || 0);
      setTotalClients(clientsCount.count || 0);
      setTotalBuses(busesCount.count || 0);
      setTotalHotels(hotelsCount.count || 0);
      setExpiredClients(expiredPending.data || []);

      const calculatedRevenue = (revenueData.data || []).reduce((sum, client) => sum + client.total_paid, 0);
      setTotalRevenue(calculatedRevenue);

      const statusCounts: { [key: string]: number } = {};
      (clientStatus.data || []).forEach(client => {
        statusCounts[client.status] = (statusCounts[client.status] || 0) + 1;
      });
      setClientStatusData(Object.keys(statusCounts).map(status => ({ status, count: statusCounts[status] })));

      const monthlyRevenue: { [key: string]: number } = {};
      (monthlyPayments.data || []).forEach(payment => {
        const date = parseISO(payment.payment_date);
        const monthYear = format(date, 'MMM yyyy', { locale: es });
        monthlyRevenue[monthYear] = (monthlyRevenue[monthYear] || 0) + payment.amount;
      });

      const sortedMonthlyRevenue = Object.keys(monthlyRevenue)
        .sort((a, b) => parseISO(`01 ${a.replace(' ', '')}`).getTime() - parseISO(`01 ${b.replace(' ', '')}`).getTime())
        .map(month => ({ month, revenue: monthlyRevenue[month] }));
      
      setMonthlyRevenueData(sortedMonthlyRevenue);

    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!window.confirm('¿Eliminar esta reserva caducada? Se liberarán los asientos.')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) {
      toast.success('Reserva eliminada.');
      fetchDashboardData();
    }
  };

  if (sessionLoading || (user && isAdmin && loadingData)) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Panel de Control" />
        <main className="flex-grow container mx-auto px-4 py-8">
          
          {/* NOTIFICACIONES DE RESERVAS CADUCADAS */}
          {expiredClients.length > 0 && (
            <div className="mb-8 space-y-4">
              <h2 className="text-lg font-black uppercase text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> Reservas Pendientes Expiradas (+24h sin pago)
              </h2>
              {expiredClients.map(client => (
                <Alert key={client.id} className="bg-white border-red-200 border-2 shadow-sm rounded-2xl overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-100 p-2 rounded-full"><AlertCircle className="h-5 w-5 text-red-600" /></div>
                      <div>
                        <AlertTitle className="font-black">Folio: {client.contract_number}</AlertTitle>
                        <AlertDescription className="text-xs text-gray-500">
                          {client.first_name} {client.last_name} • Registrado: {format(parseISO(client.created_at), 'Pp', { locale: es })}
                        </AlertDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild className="rounded-xl font-bold">
                        <Link to={`/admin/clients/edit/${client.id}`}>Revisar</Link>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteClient(client.id)} className="rounded-xl font-bold">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Alert>
              ))}
              <Button variant="link" asChild className="text-red-600 font-bold p-0">
                <Link to="/admin/clients" className="flex items-center gap-1">Ver todos los clientes <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
            <DashboardSummaryCard title="Tours" value={totalTours} icon={Package} />
            <DashboardSummaryCard title="Clientes" value={totalClients} icon={Users} />
            <DashboardSummaryCard title="Ingresos" value={`$${totalRevenue.toFixed(0)}`} icon={DollarSign} />
            <DashboardSummaryCard title="Buses" value={totalBuses} icon={Bus} />
            <DashboardSummaryCard title="Hoteles" value={totalHotels} icon={Hotel} />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <ClientStatusChart data={clientStatusData} />
            <MonthlyRevenueChart data={monthlyRevenueData} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;