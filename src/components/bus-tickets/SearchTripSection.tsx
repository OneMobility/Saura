"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Search, Loader2 } from 'lucide-react'; // Import Loader2
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client'; // Import supabase
import { useNavigate } from 'react-router-dom'; // Import useNavigate

interface BusDestination {
  id: string;
  name: string;
}

const SearchTripSection = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [passengers, setPassengers] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableDestinations, setAvailableDestinations] = useState<BusDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);

  useEffect(() => {
    const fetchDestinations = async () => {
      setLoadingDestinations(true);
      const { data, error } = await supabase
        .from('bus_destinations')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching bus destinations:', error);
        toast.error('Error al cargar los destinos disponibles.');
      } else {
        setAvailableDestinations(data || []);
      }
      setLoadingDestinations(false);
    };
    fetchDestinations();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || origin === 'none' || !destination || destination === 'none' || !date || passengers <= 0) { // Adjusted condition
      toast.error('Por favor, rellena todos los campos de búsqueda.');
      return;
    }
    setLoading(true);
    
    // Navigate to the search results page with state
    navigate('/bus-tickets/search-results', {
      state: {
        originId: origin,
        destinationId: destination,
        searchDate: date.toISOString(), // Pass date as ISO string
        passengers: passengers,
      },
    });

    setLoading(false);
  };

  return (
    <section className="relative z-10 py-12 px-4 md:px-8 lg:px-16 bg-background text-bus-foreground">
      <div className="max-w-6xl mx-auto bg-bus-primary p-8 rounded-lg shadow-xl relative z-20"> {/* Added max-w-6xl */}
        <h2 className="text-3xl md:text-4xl font-bold text-center text-bus-primary-foreground mb-8">
          Busca tu <span className="text-bus-secondary">Viaje</span> en Autobús
        </h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <Label htmlFor="origin" className="text-lg text-bus-primary-foreground">Origen</Label>
            <Select value={origin} onValueChange={setOrigin} required disabled={loading || loadingDestinations}>
              <SelectTrigger className="p-3 focus-visible:ring-bus-secondary">
                <SelectValue placeholder="Selecciona Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecciona Origen</SelectItem> {/* Changed value to 'none' */}
                {availableDestinations.map((dest) => (
                  <SelectItem key={dest.id} value={dest.id}>
                    {dest.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="destination" className="text-lg text-bus-primary-foreground">Destino</Label>
            <Select value={destination} onValueChange={setDestination} required disabled={loading || loadingDestinations}>
              <SelectTrigger className="p-3 focus-visible:ring-bus-secondary">
                <SelectValue placeholder="Selecciona Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecciona Destino</SelectItem> {/* Changed value to 'none' */}
                {availableDestinations.map((dest) => (
                  <SelectItem key={dest.id} value={dest.id}>
                    {dest.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-lg text-bus-primary-foreground">Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal p-3",
                    !date && "text-muted-foreground",
                    "focus-visible:ring-bus-secondary"
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={es}
                  disabled={loading}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="passengers" className="text-lg text-bus-primary-foreground">Pasajeros</Label>
            <Input
              type="text" // Changed to text
              pattern="[0-9]*" // Pattern for integers
              id="passengers"
              placeholder="Número de Pasajeros"
              className="p-3 focus-visible:ring-bus-secondary"
              value={passengers}
              onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
              min={1}
              required
              disabled={loading}
            />
          </div>
          <div className="col-span-full">
            <Button
              type="submit"
              className="w-full bg-bus-secondary hover:bg-bus-secondary/90 text-bus-secondary-foreground font-semibold py-3 text-lg"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Buscar Boletos
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default SearchTripSection;