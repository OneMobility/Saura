"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { BusSchedule, BusRoute } from '@/types/shared';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface BusSchedulesTableProps {
  onEditSchedule: (schedule: BusSchedule) => void;
  onScheduleDeleted: () => void;
  refreshKey: number;
}

const BusSchedulesTable: React.FC<BusSchedulesTableProps> = ({ onEditSchedule, onScheduleDeleted, refreshKey }) => {
  const [schedules, setSchedules] = useState<BusSchedule[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  useEffect(() => {
    fetchSchedulesAndDependencies();
  }, [refreshKey]);

  const fetchSchedulesAndDependencies = async () => {
    setLoading(true);
    const [schedulesRes, routesRes] = await Promise.all([
      supabase.from('bus_schedules').select('*').order('departure_time', { ascending: true }),
      supabase.from('bus_routes').select('id, name'),
    ]);

    if (routesRes.error) {
      console.error('Error fetching bus routes:', routesRes.error);
      toast.error('Error al cargar las rutas de autobús.');
    } else {
      setAvailableRoutes(routesRes.data || []);
    }

    if (schedulesRes.error) {
      console.error('Error fetching bus schedules:', schedulesRes.error);
      toast.error('Error al cargar los horarios de autobús.');
    } else {
      setSchedules(schedulesRes.data || []);
    }
    setLoading(false);
  };

  const getRouteName = (routeId: string) => {
    return availableRoutes.find(route => route.id === routeId)?.name || 'N/A';
  };

  const formatDaysOfWeek = (days: number[]) => {
    if (days.length === 7) return 'Todos los días';
    if (days.length === 0) return 'N/A';
    return days.sort((a, b) => a - b).map(day => dayNames[day]).join(', ');
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este horario?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('bus_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bus schedule:', error);
      toast.error('Error al eliminar el horario.');
    } else {
      toast.success('Horario eliminado con éxito.');
      onScheduleDeleted(); // Notify parent to refresh
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando horarios de autobús...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Horarios de Autobús Existentes</h2>
      {schedules.length === 0 ? (
        <p className="text-gray-600">No hay horarios de autobús configurados.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ruta</TableHead>
                <TableHead>Hora de Salida</TableHead>
                <TableHead>Días de la Semana</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{getRouteName(schedule.route_id)}</TableCell>
                  <TableCell>{schedule.departure_time}</TableCell>
                  <TableCell>{formatDaysOfWeek(schedule.day_of_week)}</TableCell>
                  <TableCell>{schedule.effective_date_start ? format(parseISO(schedule.effective_date_start), 'dd/MM/yy', { locale: es }) : 'N/A'}</TableCell>
                  <TableCell>{schedule.effective_date_end ? format(parseISO(schedule.effective_date_end), 'dd/MM/yy', { locale: es }) : 'N/A'}</TableCell>
                  <TableCell>{schedule.is_active ? 'Sí' : 'No'}</TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditSchedule(schedule)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteSchedule(schedule.id as string)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default BusSchedulesTable;