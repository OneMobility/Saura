"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SearchTripSection = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [passengers, setPassengers] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !date || passengers <= 0) {
      toast.error('Por favor, rellena todos los campos de búsqueda.');
      return;
    }
    setLoading(true);
    // Aquí iría la lógica para buscar viajes
    console.log('Buscando viajes:', { origin, destination, date: date.toISOString(), passengers });
    toast.success('Búsqueda realizada. Mostrando resultados (simulado).');
    setLoading(false);
    // En una aplicación real, esto redirigiría a una página de resultados
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
            <Input
              type="text"
              id="origin"
              placeholder="Ciudad de Origen"
              className="p-3 focus-visible:ring-bus-secondary"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="destination" className="text-lg text-bus-primary-foreground">Destino</Label>
            <Input
              type="text"
              id="destination"
              placeholder="Ciudad de Destino"
              className="p-3 focus-visible:ring-bus-secondary"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              disabled={loading}
            />
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
              type="number"
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