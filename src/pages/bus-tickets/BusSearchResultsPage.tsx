"use client";

import React, { useState, useEffect, useCallback } from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import { useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, Clock, MapPin, DollarSign, CalendarDays } from 'lucide-react';
import { format, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface SearchResult {
  routeId: string;
  routeName: string;
  departureTime: string;
  adultPrice: number;
  childPrice: number;
  durationMinutes: number | null;
  distanceKm: number | null;
  scheduleId: string;
  busId: string | null;
  originName: string;
  destinationName: string;
}

const BusSearchResultsPage = () => {
  const location = useLocation();
  const { originId, destinationId, searchDate } = location.state || {};

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originName, setOriginName] = useState<string>('');
  const [destinationName, setDestinationName] = useState<string>('');

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    if (!originId || !destinationId || !searchDate) {
      setError('Faltan parámetros de búsqueda. Por favor, regresa y realiza una nueva búsqueda.');
      setLoading(false);
      return;
    }

    const searchDayOfWeek = getDay(new Date(searchDate)); // 0 for Sunday, 1 for Monday, etc.
    const formattedSearchDate = format(new Date(searchDate), 'yyyy-MM-dd');

    try {
      // Fetch all destinations to map IDs to names
      const { data: destinationsData, error: destinationsError } = await supabase
        .from('bus_destinations')
        .select('id, name');
      if (destinationsError) throw destinationsError;
      const destinationMap = new Map(destinationsData.map(d => [d.id, d.name]));

      setOriginName(destinationMap.get(originId) || 'Origen Desconocido');
      setDestinationName(destinationMap.get(destinationId) || 'Destino Desconocido');

      // 1. Fetch all routes
      const { data: routesData, error: routesError } = await supabase
        .from('bus_routes')
        .select('id, name, all_stops, bus_id, is_active')
        .eq('is_active', true);
      if (routesError) throw routesError;

      // 2. Fetch all segments
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('route_segments')
        .select('*');
      if (segmentsError) throw segmentsError;

      // 3. Fetch all schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('bus_schedules')
        .select('id, route_id, departure_time, day_of_week, effective_date_start, effective_date_end, is_active')
        .eq('is_active', true);
      if (schedulesError) throw schedulesError;

      const foundResults: SearchResult[] = [];

      routesData.forEach(route => {
        // Check if origin and destination are in the route's stops and in correct order
        const originIndex = route.all_stops.indexOf(originId);
        const destinationIndex = route.all_stops.indexOf(destinationId);

        if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
          // Find the direct segment for this origin-destination pair within this route
          const segment = segmentsData.find(
            s => s.route_id === route.id && s.start_destination_id === originId && s.end_destination_id === destinationId
          );

          if (segment) {
            // Find schedules for this route and day
            schedulesData.forEach(schedule => {
              if (
                schedule.route_id === route.id &&
                schedule.day_of_week.includes(searchDayOfWeek) &&
                (!schedule.effective_date_start || new Date(formattedSearchDate) >= parseISO(schedule.effective_date_start)) &&
                (!schedule.effective_date_end || new Date(formattedSearchDate) <= parseISO(schedule.effective_date_end))
              ) {
                foundResults.push({
                  routeId: route.id,
                  routeName: route.name,
                  departureTime: schedule.departure_time,
                  adultPrice: segment.adult_price,
                  childPrice: segment.child_price,
                  durationMinutes: segment.duration_minutes,
                  distanceKm: segment.distance_km,
                  scheduleId: schedule.id,
                  busId: route.bus_id,
                  originName: destinationMap.get(originId) || 'N/A',
                  destinationName: destinationMap.get(destinationId) || 'N/A',
                });
              }
            });
          }
        }
      });

      // Sort results by departure time
      foundResults.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
      setResults(foundResults);

    } catch (err: any) {
      console.error('Error fetching search results:', err);
      setError('Error al cargar los resultados de la búsqueda: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [originId, destinationId, searchDate]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const displayDate = searchDate ? format(new Date(searchDate), 'EEEE, dd MMMM yyyy', { locale: es }) : 'Fecha no especificada';

  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="mb-8">
            <Button asChild variant="outline" className="bg-white text-bus-primary hover:bg-gray-100 border-bus-primary hover:border-bus-primary/90">
              <Link to="/bus-tickets">
                <ArrowLeft className="mr-2 h-4 w-4" /> Nueva Búsqueda
              </Link>
            </Button>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Resultados de Búsqueda
          </h1>
          <p className="text-lg text-center mb-10">
            <span className="font-semibold">{originName}</span> a <span className="font-semibold">{destinationName}</span> el <span className="font-semibold">{displayDate}</span>
          </p>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
              <p className="ml-4 text-xl">Buscando horarios...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 p-8 bg-card rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Error en la Búsqueda</h2>
              <p className="text-xl">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center text-muted-foreground p-8 bg-card rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">No se encontraron horarios</h2>
              <p className="text-xl">Intenta ajustar tus criterios de búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {results.map((result) => (
                <Card key={result.scheduleId} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="text-bus-primary text-2xl">{result.routeName}</CardTitle>
                    <CardDescription className="flex items-center space-x-2 text-lg">
                      <MapPin className="h-5 w-5 text-bus-secondary" />
                      <span>{result.originName} <ArrowLeft className="inline-block rotate-180" /> {result.destinationName}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Clock className="h-5 w-5 text-bus-primary" />
                      <p className="text-xl font-semibold">Salida: {result.departureTime}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground">Precio Adulto:</p>
                        <p className="text-xl font-bold text-bus-primary">${result.adultPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Precio Niño:</p>
                        <p className="text-xl font-bold text-bus-primary">${result.childPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-muted-foreground">
                      {result.durationMinutes && <p><Clock className="inline-block h-4 w-4 mr-1" /> {result.durationMinutes} min</p>}
                      {result.distanceKm && <p><MapPin className="inline-block h-4 w-4 mr-1" /> {result.distanceKm} km</p>}
                    </div>
                    <Button className="w-full bg-bus-secondary hover:bg-bus-secondary/90 text-bus-secondary-foreground font-semibold py-3 text-lg">
                      Seleccionar Horario
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default BusSearchResultsPage;