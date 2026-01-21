"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, Search, Hotel as HotelIcon } from 'lucide-react'; // Added Search and HotelIcon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format, parse, isValid, parseISO, differenceInDays } from 'date-fns'; // Import differenceInDays
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import TourSeatMap from '@/components/TourSeatMap';
import { useNavigate } from 'react-router-dom';
import { TourProviderService, AvailableProvider } from '@/types/shared';
import RichTextEditor from '@/components/RichTextEditor';

// Hotel interface now represents a "hotel quote" from the 'hotels' table
interface HotelQuote {
  id: string;
  name: string; // Hotel name
  location: string;
  quoted_date: string | null;
  num_nights_quoted: number;
  cost_per_night_double: number;
  cost_per_night_triple: number;
  cost_per_night_quad: number;
  capacity_double: number;
  capacity_triple: number;
  capacity_quad: number;
  num_double_rooms: number; // NEW
  num_triple_rooms: number; // NEW
  num_quad_rooms: number; // NEW
  num_courtesy_rooms: number; // NEW: Added courtesy rooms
  is_active: boolean;
  advance_payment: number;
  total_paid: number;
}

// TourHotelDetail now references a hotel quote ID
interface TourHotelDetail {
  id: string; // Unique ID for this entry in the tour's hotel_details array
  hotel_quote_id: string; // References an ID from the 'hotels' table (which are now quotes)
}

// Definición de tipos para el layout de asientos
type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty' | 'entry';
  number?: number; // Solo para asientos
};
type SeatLayoutRow = SeatLayoutItem[];
type SeatLayout = SeatLayoutRow[];

interface Bus {
  id: string;
  name: string;
  license_plate: string;
  rental_cost: number;
  total_capacity: number;
  seat_layout_json: SeatLayout | null; // Incluir el layout de asientos
  advance_payment: number; // NEW
  total_paid: number; // NEW
}

interface Tour {
  id?: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  full_content: string;
  duration: string;
  includes: string[];
  itinerary: { day: number; activity: string }[];
  bus_id: string | null; // NEW: Link to Bus
  bus_capacity: number; // Now derived from selected bus
  bus_cost: number; // Now derived from selected bus
  courtesies: number; // Renamed to Coordinadores
  hotel_details: TourHotelDetail[]; // Updated type
  provider_details: TourProviderService[]; // Updated type to reference providers
  total_base_cost?: number;
  paying_clients_count?: number;
  cost_per_paying_person?: number;
  selling_price_per_person: number; // Ensure this is part of the interface
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
  selling_price_child: number; // NEW: Price for children under 12
  other_income: number; // NEW: Other income for the tour
  user_id?: string;
  departure_date: string | null; // NEW: Departure Date
  return_date: string | null; // NEW: Return Date
  departure_time: string | null; // NEW: Departure Time
  return_time: string | null; // NEW
}

interface TourFormProps {
  tourId?: string; // Optional tourId for editing existing tours
  onSave: () => void; // Callback to redirect after saving
}

// NEW: Interface for BreakevenResult
interface BreakevenResult {
  clientsNeededToBreakEven: number; // Number of clients needed to break even
  message: string;
  recommendations: string[]; // Array of recommendations
  potentialProfitAtExpectedClients: number | null; // NEW: Potential profit
}

// NEW: Helper function to calculate room allocation for a given number of people (simplified for analysis)
interface RoomDetails {
  double_rooms: number;
  triple_rooms: number;
  quad_rooms: number;
}

const calculateIdealRoomAllocation = (numAdults: number): RoomDetails => {
  let double = 0;
  let triple = 0;
  let quad = 0;
  let remaining = numAdults;

  if (remaining <= 0) return { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

  // Prioritize quad rooms
  quad = Math.floor(remaining / 4);
  remaining %= 4;

  // Handle remaining people
  if (remaining === 3) {
    triple++;
  } else if (remaining === 2) {
    double++;
  } else if (remaining === 1) {
    // If 1 person remains, try to convert a quad to a triple + double if possible
    // Otherwise, assign a double room (paying for 2)
    if (quad > 0) {
      quad--;
      triple++;
      double++;
    } else {
      double++;
    }
  }
  return { double_rooms: double, triple_rooms: triple, quad_rooms: quad };
};


const TourForm: React.FC<TourFormProps> = ({ tourId, onSave }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Tour>({
    title: '',
    slug: '',
    description: '',
    image_url: '',
    full_content: '',
    duration: '',
    includes: [],
    itinerary: [],
    bus_id: null,
    bus_capacity: 0,
    bus_cost: 0,
    courtesies: 0,
    hotel_details: [],
    provider_details: [],
    selling_price_per_person: 0,
    selling_price_double_occupancy: 0,
    selling_price_triple_occupancy: 0,
    selling_price_quad_occupancy: 0,
    selling_price_child: 0,
    other_income: 0,
    departure_date: null,
    return_date: null,
    departure_time: '08:00',
    return_time: '18:00',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableHotelQuotes, setAvailableHotelQuotes] = useState<HotelQuote[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [selectedBusLayout, setSelectedBusLayout] = useState<SeatLayout | null>(null);

  // NEW: Date states for Popover/Input control
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [departureDateInput, setDepartureDateInput] = useState<string>('');
  const [returnDateInput, setReturnDateInput] = useState<string>('');

  // NEW: Financial states
  const [totalSoldSeats, setTotalSoldSeats] = useState(0);
  const [totalRemainingPayments, setTotalRemainingPayments] = useState(0);
  const [desiredProfitPercentage, setDesiredProfitPercentage] = useState(20);
  const [suggestedSellingPrice, setSuggestedSellingPrice] = useState(0);
  const [totalClientsRevenue, setTotalClientsRevenue] = useState(0);

  // NEW: Break-even analysis states
  const [expectedClientsForBreakeven, setExpectedClientsForBreakeven] = useState(0);
  const [breakevenResult, setBreakevenResult] = useState<BreakevenResult | null>(null);

  // NEW: Cheapest Hotel Quote state
  const [cheapestHotelQuote, setCheapestHotelQuote] = useState<{ name: string; estimated_total_cost: number; id: string } | null>(null);
  const [loadingCheapestHotel, setLoadingCheapestHotel] = useState(false);


  // Fetch available hotel quotes
  useEffect(() => {
    const fetchAvailableHotelQuotes = async () => {
      const { data, error } = await supabase
        .from('hotels') // 'hotels' table now stores quotes
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error al cargar cotizaciones de hoteles disponibles:', error);
        toast.error('Error al cargar la lista de cotizaciones de hoteles disponibles.');
      } else {
        setAvailableHotelQuotes(data || []);
      }
    };
    fetchAvailableHotelQuotes();
  }, []);

  // NEW: Fetch available buses
  useEffect(() => {
    const fetchAvailableBuses = async () => {
      const { data, error } = await supabase
        .from('buses')
        .select('*') // Select all columns including seat_layout_json, advance_payment, total_paid
        .order('name', { ascending: true });

      if (error) {
        console.error('Error al cargar autobuses disponibles:', error);
        toast.error('Error al cargar la lista de autobuses disponibles.');
      } else {
        setAvailableBuses(data || []);
      }
    };
    fetchAvailableBuses();
  }, []);

  // NEW: Fetch available providers
  useEffect(() => {
    const fetchAvailableProviders = async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error al cargar proveedores disponibles:', error);
        toast.error('Error al cargar la lista de proveedores disponibles.');
      } else {
        setAvailableProviders(data || []);
      }
    };
    fetchAvailableProviders();
  }, []);

  useEffect(() => {
    const fetchTourData = async () => {
      if (tourId) {
        setLoadingInitialData(true);
        const { data, error } = await supabase
          .from('tours')
          .select('*')
          .eq('id', tourId)
          .single();

        if (error) {
          console.error('Error al obtener tour para editar:', error);
          toast.error('Error al cargar los datos del tour para editar.');
          setLoadingInitialData(false);
          return;
        }

        if (data) {
          setFormData({
            ...data,
            includes: data.includes || [],
            itinerary: data.itinerary || [],
            hotel_details: data.hotel_details || [],
            provider_details: data.provider_details || [],
            bus_id: data.bus_id || null,
            selling_price_per_person: data.selling_price_per_person || 0,
            selling_price_double_occupancy: data.selling_price_double_occupancy || 0,
            selling_price_triple_occupancy: data.selling_price_triple_occupancy || 0,
            selling_price_quad_occupancy: data.selling_price_quad_occupancy || 0,
            selling_price_child: data.selling_price_child || 0,
            other_income: data.other_income || 0,
            departure_date: data.departure_date || null,
            return_date: data.return_date || null,
            departure_time: data.departure_time || '08:00',
            return_time: data.return_time || '18:00',
          });
          setImageUrlPreview(data.image_url);

          // Set date states
          if (data.departure_date) {
            const date = parseISO(data.departure_date);
            setDepartureDate(date);
            setDepartureDateInput(format(date, 'dd/MM/yy', { locale: es }));
          }
          if (data.return_date) {
            const date = parseISO(data.return_date);
            setReturnDate(date);
            setReturnDateInput(format(date, 'dd/MM/yy', { locale: es }));
          }

          // Set selected bus layout if bus_id is present
          if (data.bus_id) {
            const bus = availableBuses.find(b => b.id === data.bus_id);
            setSelectedBusLayout(bus?.seat_layout_json || null);
          }
          setExpectedClientsForBreakeven(data.paying_clients_count || 0);
        }
      } else {
        // Reset form for new tour
        setFormData({
          title: '',
          slug: '',
          description: '',
          image_url: '',
          full_content: '',
          duration: '',
          includes: [],
          itinerary: [],
          bus_id: null,
          bus_capacity: 0,
          bus_cost: 0,
          courtesies: 0,
          hotel_details: [],
          provider_details: [],
          selling_price_per_person: 0,
          selling_price_double_occupancy: 0,
          selling_price_triple_occupancy: 0,
          selling_price_quad_occupancy: 0,
          selling_price_child: 0,
          other_income: 0,
          departure_date: null,
          return_date: null,
          departure_time: '08:00',
          return_time: '18:00',
        });
        setImageFile(null);
        setImageUrlPreview('');
        setSelectedBusLayout(null);
        setExpectedClientsForBreakeven(0);
        setDepartureDate(undefined);
        setReturnDate(undefined);
        setDepartureDateInput('');
        setReturnDateInput('');
      }
      setLoadingInitialData(false);
    };

    fetchTourData();
  }, [tourId, availableBuses]);

  // NEW: Fetch total sold seats and clients revenue
  useEffect(() => {
    const fetchSoldData = async () => {
      if (!tourId) {
        setTotalSoldSeats(0);
        setTotalClientsRevenue(0);
        return;
      }

      // Fetch sold seats
      const { count: seatsCount, error: seatsError } = await supabase
        .from('tour_seat_assignments')
        .select('id', { count: 'exact' })
        .eq('tour_id', tourId)
        .eq('status', 'booked');

      if (seatsError) {
        console.error('Error fetching sold seats:', seatsError);
        setTotalSoldSeats(0);
      } else {
        setTotalSoldSeats(seatsCount || 0);
      }

      // Fetch total revenue from active clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('total_amount')
        .eq('tour_id', tourId)
        .neq('status', 'cancelled'); // Only count active clients

      if (clientsError) {
        console.error('Error fetching clients revenue:', clientsError);
        setTotalClientsRevenue(0);
      } else {
        const sumRevenue = (clientsData || []).reduce((sum, client) => sum + client.total_amount, 0);
        setTotalClientsRevenue(sumRevenue);
      }
    };
    fetchSoldData();
  }, [tourId]);

  const calculateCosts = useCallback(() => {
    // Calculate total provider cost from linked providers
    const totalProviderCost = formData.provider_details.reduce((sum, providerService) => {
      // Use the snapshot cost stored in the tour's provider_details
      return sum + (providerService.cost_per_unit_snapshot * providerService.quantity);
    }, 0);
    
    let totalHotelCost = 0; // Total cost for all rooms across all linked hotel quotes
    let currentTotalRemainingPayments = 0; // NEW: for total remaining payments

    formData.hotel_details.forEach(tourHotelDetail => {
      const hotelQuote = availableHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
      if (!hotelQuote) return;

      // Calculate cost based on the *contracted rooms in the hotel quote*
      const costDouble = (hotelQuote.num_double_rooms || 0) * hotelQuote.cost_per_night_double * hotelQuote.num_nights_quoted;
      const costTriple = (hotelQuote.num_triple_rooms || 0) * hotelQuote.cost_per_night_triple * hotelQuote.num_nights_quoted;
      const costQuad = (hotelQuote.num_quad_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
      
      const totalContractedRoomsCost = costDouble + costTriple + costQuad;

      // Subtract the value of courtesy rooms from the total contracted cost
      const costOfCourtesyRooms = (hotelQuote.num_courtesy_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
      
      totalHotelCost += totalContractedRoomsCost - costOfCourtesyRooms;

      // NEW: Add hotel remaining payment (adjusted for courtesies)
      currentTotalRemainingPayments += (totalContractedRoomsCost - costOfCourtesyRooms) - (hotelQuote.total_paid || 0);
    });

    const selectedBus = availableBuses.find(b => b.id === formData.bus_id);
    const busRentalCost = selectedBus?.rental_cost || 0;
    const busTotalPaid = selectedBus?.total_paid || 0;

    const totalBaseCost = busRentalCost + totalProviderCost + totalHotelCost;

    const payingClientsCount = formData.bus_capacity - formData.courtesies;
    const costPerPayingPerson = payingClientsCount > 0 ? totalBaseCost / payingClientsCount : 0;

    // NEW: Add bus remaining payment
    currentTotalRemainingPayments += busRentalCost - busTotalPaid;

    // Calculate average selling price for potential revenue calculations
    const averageAdultSellingPrice = (formData.selling_price_double_occupancy + formData.selling_price_triple_occupancy + formData.selling_price_quad_occupancy) / 3;

    setFormData((prev) => ({
      ...prev,
      total_base_cost: totalBaseCost,
      paying_clients_count: payingClientsCount,
      cost_per_paying_person: costPerPayingPerson,
      selling_price_per_person: averageAdultSellingPrice,
    }));
    setTotalRemainingPayments(currentTotalRemainingPayments);

    // Calculate suggested selling price (average adult price)
    if (costPerPayingPerson > 0 && desiredProfitPercentage >= 0) {
      const calculatedSuggestedPrice = costPerPayingPerson * (1 + desiredProfitPercentage / 100);
      setSuggestedSellingPrice(calculatedSuggestedPrice);
    } else {
      setSuggestedSellingPrice(0);
    }

  }, [
    formData.bus_capacity,
    formData.bus_id,
    formData.courtesies,
    formData.provider_details,
    formData.hotel_details,
    formData.selling_price_double_occupancy,
    formData.selling_price_triple_occupancy,
    formData.selling_price_quad_occupancy,
    availableHotelQuotes,
    availableBuses,
    desiredProfitPercentage
  ]);

  useEffect(() => {
    calculateCosts();
  }, [calculateCosts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => {
      const updatedData = { ...prev, [id]: value };

      if (id === 'title') {
        updatedData.slug = generateSlug(value);
      }
      // For numeric fields, parse as float
      if (['bus_capacity', 'bus_cost', 'courtesies', 'selling_price_per_person', 'selling_price_double_occupancy', 'selling_price_triple_occupancy', 'selling_price_quad_occupancy', 'selling_price_child', 'other_income'].includes(id)) {
        updatedData[id as keyof Tour] = parseFloat(value) || 0;
      }
      return updatedData;
    });
  };

  const handleRichTextChange = (field: 'description' | 'full_content', content: string) => {
    setFormData((prev) => ({ ...prev, [field]: content }));
  };

  const handleNumberChange = (id: keyof Tour, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: parseFloat(value) || 0,
    }));
  };

  const handleDateSelect = (field: 'departure_date' | 'return_date', date: Date | undefined) => {
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : null;
    const inputFormat = date ? format(date, 'dd/MM/yy', { locale: es }) : '';

    if (field === 'departure_date') {
      setDepartureDate(date);
      setDepartureDateInput(inputFormat);
      setFormData((prev) => ({ ...prev, departure_date: formattedDate }));
    } else {
      setReturnDate(date);
      setReturnDateInput(inputFormat);
      setFormData((prev) => ({ ...prev, return_date: formattedDate }));
    }
  };

  const handleDateInputChange = (field: 'departure_date' | 'return_date', e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsedDate = parse(value, 'dd/MM/yy', new Date());
    const formattedDate = isValid(parsedDate) ? format(parsedDate, 'yyyy-MM-dd') : null;

    if (field === 'departure_date') {
      setDepartureDateInput(value);
      setDepartureDate(isValid(parsedDate) ? parsedDate : undefined);
      setFormData((prev) => ({ ...prev, departure_date: formattedDate }));
    } else {
      setReturnDateInput(value);
      setReturnDate(isValid(parsedDate) ? parsedDate : undefined);
      setFormData((prev) => ({ ...prev, return_date: formattedDate }));
    }
  };

  const handleTimeChange = (field: 'departure_time' | 'return_time', e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrlPreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImageUrlPreview(formData.image_url || '');
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from('tour-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    setIsUploadingImage(false);

    if (error) {
      console.error('Error al subir la imagen:', error);
      toast.error('Error al subir la imagen.');
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('tour-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleArrayChange = (field: keyof Tour, index: number, value: string) => {
    setFormData((prev) => {
      const newArray = [...(prev[field] as string[])];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field: keyof Tour) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as string[]), ''],
    }));
  };

  const removeArrayItem = (field: keyof Tour, index: number) => {
    setFormData((prev) => {
      const newArray = [...(prev[field] as string[])];
      newArray.splice(index, 1);
      return { ...prev, [field]: newArray };
    });
  };

  const handleItineraryChange = (index: number, field: 'day' | 'activity', value: string) => {
    setFormData((prev) => {
      const newItinerary = [...prev.itinerary];
      if (field === 'day') {
        newItinerary[index] = { ...newItinerary[index], day: parseInt(value) || 0 };
      } else {
        newItinerary[index] = { ...newItinerary[index], activity: value };
      }
      return { ...prev, itinerary: newItinerary };
    });
  };

  const addItineraryItem = () => {
    setFormData((prev) => ({
      ...prev,
      itinerary: [...prev.itinerary, { day: prev.itinerary.length + 1, activity: '' }],
    }));
  };

  const removeItineraryItem = (index: number) => {
    setFormData((prev) => {
      const newItinerary = [...prev.itinerary];
      newItinerary.splice(index, 1);
      return { ...prev, itinerary: newItinerary.map((item, i) => ({ ...item, day: i + 1 })) };
    });
  };

  const handleTourHotelChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newHotelDetails = [...prev.hotel_details];
      newHotelDetails[index] = { ...newHotelDetails[index], hotel_quote_id: value };
      return { ...prev, hotel_details: newHotelDetails };
    });
  };

  const addTourHotelItem = () => {
    setFormData((prev) => ({
      ...prev,
      hotel_details: [...prev.hotel_details, {
        id: uuidv4(),
        hotel_quote_id: '',
      }],
    }));
  };

  const removeTourHotelItem = (idToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      hotel_details: prev.hotel_details.filter((detail) => detail.id !== idToRemove),
    }));
  };

  // NEW: Handle provider service changes
  const handleProviderServiceChange = (id: string, field: 'provider_id' | 'quantity', value: string | number) => {
    setFormData((prev) => {
      const newProviderDetails = [...prev.provider_details];
      const index = newProviderDetails.findIndex(pd => pd.id === id);

      if (index !== -1) {
        if (field === 'provider_id') {
          const selectedProvider = availableProviders.find(p => p.id === value);
          if (selectedProvider) {
            newProviderDetails[index] = {
              ...newProviderDetails[index],
              provider_id: value as string,
              cost_per_unit_snapshot: selectedProvider.cost_per_unit,
              selling_price_per_unit_snapshot: selectedProvider.selling_price_per_unit,
              name_snapshot: selectedProvider.name,
              service_type_snapshot: selectedProvider.service_type,
              unit_type_snapshot: selectedProvider.unit_type,
            };
          }
        } else if (field === 'quantity') {
          newProviderDetails[index] = { ...newProviderDetails[index], quantity: value as number };
        }
      }
      return { ...prev, provider_details: newProviderDetails };
    });
  };

  // NEW: Add provider service to tour
  const addTourProviderService = () => {
    setFormData((prev) => ({
      ...prev,
      provider_details: [...prev.provider_details, {
        id: uuidv4(),
        provider_id: '',
        quantity: 1,
        cost_per_unit_snapshot: 0,
        selling_price_per_unit_snapshot: 0,
        name_snapshot: '',
        service_type_snapshot: '',
        unit_type_snapshot: 'person',
      }],
    }));
  };

  // NEW: Remove provider service from tour
  const removeTourProviderService = (idToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      provider_details: prev.provider_details.filter((detail) => detail.id !== idToRemove),
    }));
  };

  // NEW: Handle bus selection
  const handleBusSelect = (busId: string) => {
    const selectedBus = availableBuses.find(bus => bus.id === busId);
    setFormData(prev => ({
      ...prev,
      bus_id: busId,
      bus_capacity: selectedBus?.total_capacity || 0,
      bus_cost: selectedBus?.rental_cost || 0,
    }));
    setSelectedBusLayout(selectedBus?.seat_layout_json || null);
  };

  // NEW: Break-even analysis function
  const runBreakevenAnalysis = useCallback(() => {
    const recommendations: string[] = [];
    let message = '';
    let potentialProfitAtExpectedClients: number | null = null;

    const totalBaseCost = formData.total_base_cost || 0;
    const averageSellingPrice = (formData.selling_price_double_occupancy + formData.selling_price_triple_occupancy + formData.selling_price_quad_occupancy) / 3;
    const costPerPayingPersonIfFull = formData.cost_per_paying_person || 0;
    const maxPayingCapacity = formData.bus_capacity - formData.courtesies;

    if (totalBaseCost <= 0 || averageSellingPrice <= 0) {
      message = 'Asegúrate de que el costo base total y el precio de venta promedio sean mayores que cero para calcular el punto de equilibrio.';
      setBreakevenResult({ clientsNeededToBreakEven: 0, message, recommendations: [], potentialProfitAtExpectedClients: null });
      return;
    }

    // --- Initial Break-even Calculation ---
    const initialClientsNeededToBreakEven = totalBaseCost / averageSellingPrice;
    message = `Para cubrir el costo base total de $${totalBaseCost.toFixed(2)} con un precio de venta promedio de $${averageSellingPrice.toFixed(2)} por persona, necesitas aproximadamente ${Math.ceil(initialClientsNeededToBreakEven)} clientes.`;

    // Calculate potential profit at expected clients
    if (expectedClientsForBreakeven > 0) {
      const potentialRevenueAtExpectedClients = expectedClientsForBreakeven * averageSellingPrice;
      potentialProfitAtExpectedClients = potentialRevenueAtExpectedClients - totalBaseCost;
      recommendations.push(`Con ${expectedClientsForBreakeven} clientes esperados y el precio de venta promedio actual, la ganancia potencial sería de $${potentialProfitAtExpectedClients.toFixed(2)}.`);
    }

    // --- Recommendations ---

    // 1. Basic profitability check if tour fills up
    if (costPerPayingPersonIfFull > averageSellingPrice) {
      recommendations.push(`¡Alerta! El precio de venta promedio actual ($${averageSellingPrice.toFixed(2)}) es menor que el costo por persona si el tour se llena ($${costPerPayingPersonIfFull.toFixed(2)}). Considera aumentar tus precios para asegurar la rentabilidad.`);
    } else if (costPerPayingPersonIfFull > 0 && averageSellingPrice > costPerPayingPersonIfFull) {
      recommendations.push(`¡Bien! El precio de venta promedio cubre el costo por persona si el tour se llena. Tienes un margen de ganancia saludable.`);
    }

    // 2. Required Selling Price for Expected Clients
    if (expectedClientsForBreakeven > 0) {
      const requiredPriceForExpectedClients = totalBaseCost / expectedClientsForBreakeven;
      if (requiredPriceForExpectedClients > averageSellingPrice) {
        recommendations.push(`Para alcanzar el punto de equilibrio con ${expectedClientsForBreakeven} clientes, el precio de venta promedio debería ser de $${requiredPriceForExpectedClients.toFixed(2)} por persona.`);
      } else {
        recommendations.push(`Con ${expectedClientsForBreakeven} clientes esperados, tu precio de venta promedio actual ($${averageSellingPrice.toFixed(2)}) ya es suficiente para cubrir los costos.`);
      }
    }

    // 3. Room Reduction Analysis (if expected clients are less than current capacity)
    if (expectedClientsForBreakeven > 0 && expectedClientsForBreakeven < maxPayingCapacity) {
      const idealRoomAllocation = calculateIdealRoomAllocation(expectedClientsForBreakeven);

      let totalContractedDouble = 0;
      let totalContractedTriple = 0;
      let totalContractedQuad = 0;
      let totalContractedCourtesy = 0;

      formData.hotel_details.forEach(tourHotelDetail => {
        const hotelQuote = availableHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
        if (hotelQuote) {
          totalContractedDouble += hotelQuote.num_double_rooms || 0;
          totalContractedTriple += hotelQuote.num_triple_rooms || 0;
          totalContractedQuad += hotelQuote.num_quad_rooms || 0;
          totalContractedCourtesy += hotelQuote.num_courtesy_rooms || 0;
        }
      });

      let potentialRoomSavings = 0;
      let roomsToReduceMessage = [];

      // Prioritize reducing quad rooms first
      if (totalContractedQuad > idealRoomAllocation.quad_rooms) {
        const reduceBy = totalContractedQuad - idealRoomAllocation.quad_rooms;
        roomsToReduceMessage.push(`${reduceBy} habitación(es) cuádruple(s)`);
        // Calculate savings for quad rooms (using cost_per_night_quad)
        formData.hotel_details.forEach(tourHotelDetail => {
          const hotelQuote = availableHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
          if (hotelQuote && hotelQuote.num_quad_rooms > 0) {
            const actualReduction = Math.min(reduceBy, hotelQuote.num_quad_rooms);
            potentialRoomSavings += actualReduction * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
          }
        });
      }
      // Then triple rooms
      if (totalContractedTriple > idealRoomAllocation.triple_rooms) {
        const reduceBy = totalContractedTriple - idealRoomAllocation.triple_rooms;
        roomsToReduceMessage.push(`${reduceBy} habitación(es) triple(s)`);
        // Calculate savings for triple rooms
        formData.hotel_details.forEach(tourHotelDetail => {
          const hotelQuote = availableHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
          if (hotelQuote && hotelQuote.num_triple_rooms > 0) {
            const actualReduction = Math.min(reduceBy, hotelQuote.num_triple_rooms);
            potentialRoomSavings += actualReduction * hotelQuote.cost_per_night_triple * hotelQuote.num_nights_quoted;
          }
        });
      }
      // Then double rooms
      if (totalContractedDouble > idealRoomAllocation.double_rooms) {
        const reduceBy = totalContractedDouble - idealRoomAllocation.double_rooms;
        roomsToReduceMessage.push(`${reduceBy} habitación(es) doble(s)`);
        // Calculate savings for double rooms
        formData.hotel_details.forEach(tourHotelDetail => {
          const hotelQuote = availableHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
          if (hotelQuote && hotelQuote.num_double_rooms > 0) {
            const actualReduction = Math.min(reduceBy, hotelQuote.num_double_rooms);
            potentialRoomSavings += actualReduction * hotelQuote.cost_per_night_double * hotelQuote.num_nights_quoted;
          }
        });
      }
      // Finally, courtesy rooms (if they have a cost, which they do by reducing total cost)
      if (totalContractedCourtesy > 0) { // Assuming courtesy rooms are always "extra" and can be reduced if not needed
        const reduceBy = totalContractedCourtesy; // Reduce all courtesy rooms for max savings
        roomsToReduceMessage.push(`${reduceBy} habitación(es) de coordinador`);
        formData.hotel_details.forEach(tourHotelDetail => {
          const hotelQuote = availableHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
          if (hotelQuote && hotelQuote.num_courtesy_rooms > 0) {
            potentialRoomSavings += hotelQuote.num_courtesy_rooms * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
          }
        });
      }


      if (potentialRoomSavings > 0) {
        const newTotalBaseCostAfterRoomReduction = totalBaseCost - potentialRoomSavings;
        const newClientsNeededToBreakEven = newTotalBaseCostAfterRoomReduction / averageSellingPrice;
        
        let newEstimatedPriceWithReduction = 0;
        if (expectedClientsForBreakeven > 0) {
          newEstimatedPriceWithReduction = newTotalBaseCostAfterRoomReduction / expectedClientsForBreakeven;
        }

        recommendations.push(`Considera reducir ${roomsToReduceMessage.join(', ')} para ahorrar $${potentialRoomSavings.toFixed(2)}. Con estos ahorros, el nuevo punto de equilibrio sería de ${Math.ceil(newClientsNeededToBreakEven)} clientes.`);
        if (expectedClientsForBreakeven > 0) {
          recommendations.push(`Con estos ahorros y ${expectedClientsForBreakeven} clientes esperados, el precio de venta promedio necesario para el punto de equilibrio sería de $${newEstimatedPriceWithReduction.toFixed(2)} por persona.`);
        }
      }
    }

    setBreakevenResult({
      clientsNeededToBreakEven: initialClientsNeededToBreakEven,
      message: message,
      recommendations: recommendations,
      potentialProfitAtExpectedClients: potentialProfitAtExpectedClients,
    });

  }, [
    formData.total_base_cost,
    formData.selling_price_double_occupancy,
    formData.selling_price_triple_occupancy,
    formData.selling_price_quad_occupancy,
    formData.cost_per_paying_person,
    formData.bus_capacity,
    formData.courtesies,
    expectedClientsForBreakeven,
    formData.hotel_details,
    availableHotelQuotes,
  ]);

  // NEW: Handler to find the cheapest hotel quote
  const handleFindCheapestHotel = async () => {
    if (!formData.departure_date || !formData.return_date) {
      toast.error('Por favor, selecciona la fecha de salida y regreso del tour.');
      return;
    }

    setLoadingCheapestHotel(true);
    setCheapestHotelQuote(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        toast.error('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setLoadingCheapestHotel(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('find-cheapest-hotel-quote', {
        body: {
          departureDate: formData.departure_date,
          returnDate: formData.return_date,
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('Error invoking find-cheapest-hotel-quote:', error);
        toast.error(`Error al buscar cotización: ${data?.error || error.message || 'Error desconocido.'}`);
      } else if (data.cheapestQuote) {
        setCheapestHotelQuote(data.cheapestQuote);
        toast.success(`Cotización más barata encontrada: ${data.cheapestQuote.name}`);
      } else if (data.error) {
        toast.error(data.error);
      } else {
        toast.info('No se encontraron cotizaciones de hotel activas para esas fechas.');
      }
    } catch (error: any) {
      console.error('Unexpected error finding cheapest hotel:', error);
      toast.error(`Ocurrió un error inesperado: ${error.message}`);
    } finally {
      setLoadingCheapestHotel(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalImageUrl = formData.image_url;

    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) {
        setIsSubmitting(false);
        return;
      }
      finalImageUrl = uploadedUrl;
    } else if (!formData.image_url && !tourId) {
      toast.error('Por favor, sube una imagen de portada.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.bus_id) {
      toast.error('Por favor, selecciona un autobús para el tour.');
      setIsSubmitting(false);
      return;
    }

    if (formData.bus_capacity <= 0) {
      toast.error('La capacidad del autobús debe ser mayor que 0.');
      setIsSubmitting(false);
      return;
    }

    if (formData.courtesies >= formData.bus_capacity) {
      toast.error('El número de coordinadores no puede ser igual o mayor que la capacidad del autobús.');
      setIsSubmitting(false);
      return;
    }

    if (formData.selling_price_double_occupancy <= 0 || formData.selling_price_triple_occupancy <= 0 || formData.selling_price_quad_occupancy <= 0) {
      toast.error('Los precios de venta por persona para todas las ocupaciones deben ser mayores que 0.');
      setIsSubmitting(false);
      return;
    }
    
    if (formData.selling_price_child < 0) {
      toast.error('El precio de venta para menores no puede ser negativo.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.departure_date || !formData.return_date) {
      toast.error('Por favor, selecciona la fecha de salida y regreso.');
      setIsSubmitting(false);
      return;
    }

    if (new Date(formData.departure_date) >= new Date(formData.return_date)) {
      toast.error('La fecha de regreso debe ser posterior a la fecha de salida.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.departure_time || !formData.return_time) {
      toast.error('Por favor, introduce la hora de salida y regreso.');
      setIsSubmitting(false);
      return;
    }


    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Debes iniciar sesión para crear o editar tours.');
      setIsSubmitting(false);
      return;
    }

    // Calculate selling_price_per_person as the average of the tiered prices
    const calculatedSellingPricePerPerson = (
      formData.selling_price_double_occupancy +
      formData.selling_price_triple_occupancy +
      formData.selling_price_quad_occupancy
    ) / 3;

    const tourDataToSave = {
      ...formData,
      image_url: finalImageUrl,
      user_id: user.id,
      total_base_cost: formData.total_base_cost,
      paying_clients_count: formData.paying_clients_count,
      cost_per_paying_person: formData.cost_per_paying_person,
      selling_price_per_person: calculatedSellingPricePerPerson,
      other_income: formData.other_income,
      departure_date: formData.departure_date,
      return_date: formData.return_date,
      departure_time: formData.departure_time,
      return_time: formData.return_time,
    };

    if (tourId) {
      // Update existing tour
      const { error } = await supabase
        .from('tours')
        .update({ ...tourDataToSave, updated_at: new Date().toISOString() })
        .eq('id', tourId);

      if (error) {
        console.error('Error al actualizar el tour:', error);
        toast.error('Error al actualizar el tour.');
      } else {
        toast.success('Tour actualizado con éxito.');
        onSave();
      }
    } else {
      // Insert new tour
      const { error } = await supabase
        .from('tours')
        .insert(tourDataToSave);

      if (error) {
        console.error('Error al crear el tour:', error);
        toast.error('Error al crear el tour.');
      } else {
        toast.success('Tour creado con éxito.');
        onSave();
      }
    }
    setIsSubmitting(false);
  };

  if (loadingInitialData) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando formulario del tour...</p>
      </div>
    );
  }

  // Calculate average selling price for display in financial summary
  const averageSellingPrice = (formData.selling_price_double_occupancy + formData.selling_price_triple_occupancy + formData.selling_price_quad_occupancy) / 3;
  const totalPotentialRevenue = (formData.paying_clients_count || 0) * averageSellingPrice;
  const totalSoldRevenue = totalClientsRevenue + formData.other_income;
  const totalToSell = totalPotentialRevenue - totalClientsRevenue;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{tourId ? 'Editar Tour' : 'Crear Nuevo Tour'}</h2>
      <form onSubmit={handleSubmit} className="grid gap-6 py-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="title" className="md:text-right">Título</Label>
          <Input id="title" value={formData.title} onChange={handleChange} className="md:col-span-3" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="slug" className="md:text-right">Slug (URL)</Label>
          <Input id="slug" value={formData.slug} onChange={handleChange} className="md:col-span-3" placeholder="titulo-del-tour" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
          <Label htmlFor="description" className="md:text-right pt-2">Descripción Corta</Label>
          <div className="md:col-span-3">
            <RichTextEditor
              value={formData.description}
              onChange={(content) => handleRichTextChange('description', content)}
              placeholder="Escribe una descripción breve para el tour."
              className="min-h-[100px]"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
          <Label htmlFor="full_content" className="md:text-right pt-2">Contenido Completo</Label>
          <div className="md:col-span-3">
            <RichTextEditor
              value={formData.full_content}
              onChange={(content) => handleRichTextChange('full_content', content)}
              placeholder="Escribe el contenido completo del tour aquí."
              className="min-h-[150px]"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="image_file" className="md:text-right">Imagen de Portada</Label>
          <div className="md:col-span-3 flex flex-col gap-2">
            <Input id="image_file" type="file" accept="image/*" onChange={handleImageFileChange} className="file:text-rosa-mexicano file:font-semibold file:border-0 file:bg-transparent file:mr-4" />
            {imageUrlPreview && (
              <div className="mt-2">
                <img src={imageUrlPreview} alt="Vista previa" className="w-48 h-32 object-cover rounded-md" />
              </div>
            )}
            {!imageFile && !imageUrlPreview && (
              <p className="text-sm text-gray-500">Sube una imagen para la portada del tour.</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="duration" className="md:text-right">Duración</Label>
          <Input id="duration" value={formData.duration} onChange={handleChange} className="md:col-span-3" placeholder="Ej: 7 días / 6 noches" required />
        </div>

        {/* NEW: Date Fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="departure_date" className="md:text-right">Fecha de Salida</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "md:col-span-2 justify-start text-left font-normal",
                  !departureDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {departureDate ? format(departureDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={departureDate}
                onSelect={(date) => handleDateSelect('departure_date', date)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
          <Input
            id="departure_time"
            type="text"
            pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
            value={formData.departure_time || ''}
            onChange={(e) => handleTimeChange('departure_time', e)}
            placeholder="HH:MM"
            className="md:col-span-1"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="return_date" className="md:text-right">Fecha de Regreso</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "md:col-span-2 justify-start text-left font-normal",
                  !returnDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {returnDate ? format(returnDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={returnDate}
                onSelect={(date) => handleDateSelect('return_date', date)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
          <Input
            id="return_time"
            type="text"
            pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
            value={formData.return_time || ''}
            onChange={(e) => handleTimeChange('return_time', e)}
            placeholder="HH:MM"
            className="md:col-span-1"
            required
          />
        </div>

        {/* Includes */}
        <div className="space-y-2 col-span-full">
          <Label className="text-lg font-semibold">Qué Incluye</Label>
          {formData.includes.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => handleArrayChange('includes', index, e.target.value)}
                placeholder="Ej: Transporte aéreo y terrestre"
              />
              <Button type="button" variant="destructive" size="icon" onClick={() => removeArrayItem('includes', index)}>
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addArrayItem('includes')}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ítem
          </Button>
        </div>

        {/* Itinerary */}
        <div className="space-y-2 col-span-full">
          <Label className="text-lg font-semibold">Itinerario</Label>
          {formData.itinerary.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Label className="w-12">Día {item.day}:</Label>
              <Input
                value={item.activity}
                onChange={(e) => handleItineraryChange(index, 'activity', e.target.value)}
                placeholder="Ej: Llegada a Cancún, traslado al hotel"
                className="flex-grow"
              />
              <Button type="button" variant="destructive" size="icon" onClick={() => removeItineraryItem(index)}>
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addItineraryItem}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Día
          </Button>
        </div>

        {/* Bus Details */}
        <h3 className="text-xl font-semibold col-span-full mt-4">Detalles del Autobús</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="bus_id" className="md:text-right">Seleccionar Autobús</Label>
          <Select value={formData.bus_id || ''} onValueChange={handleBusSelect}>
            <SelectTrigger className="md:col-span-3">
              <SelectValue placeholder="Seleccionar un autobús" />
            </SelectTrigger>
            <SelectContent>
              {availableBuses.map((bus) => (
                <SelectItem key={bus.id} value={bus.id}>
                  {bus.name} (Capacidad: {bus.total_capacity}, Costo: ${bus.rental_cost.toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="bus_capacity" className="md:text-right">Capacidad Autobús</Label>
          <Input id="bus_capacity" type="text" pattern="[0-9]*" value={formData.bus_capacity} readOnly className="md:col-span-3 bg-gray-100 cursor-not-allowed" title="Derivado del autobús seleccionado" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="bus_cost" className="md:text-right">Costo Autobús</Label>
          <Input id="bus_cost" type="text" pattern="[0-9]*\.?[0-9]*" value={formData.bus_cost} readOnly className="md:col-span-3 bg-gray-100 cursor-not-allowed" title="Derivado del autobús seleccionado" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="courtesies" className="md:text-right">Coordinadores (Asientos Bus)</Label>
          <Input id="courtesies" type="text" pattern="[0-9]*" value={formData.courtesies} onChange={(e) => handleNumberChange('courtesies', e.target.value)} className="md:col-span-3" required />
        </div>

        {/* Seat Map for Admin to block courtesies */}
        {formData.bus_id && formData.bus_capacity > 0 && (
          <div className="col-span-full mt-6">
            <h3 className="text-xl font-semibold mb-4">Visualización de Asientos</h3>
            <TourSeatMap
              tourId={tourId || 'new-tour'}
              busCapacity={formData.bus_capacity}
              courtesies={formData.courtesies}
              seatLayoutJson={selectedBusLayout}
              readOnly={true}
              adminMode={false}
            />
            <div className="flex justify-end mt-4">
              <Button
                type="button"
                onClick={() => navigate(`/admin/buses/edit/${formData.bus_id}`)}
                className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white"
              >
                Gestionar Bus
              </Button>
            </div>
          </div>
        )}

        {/* Hotel Details (now linking to quotes) */}
        <div className="space-y-2 col-span-full">
          <Label className="text-lg font-semibold">Cotizaciones de Hoteles Vinculadas</Label>
          {formData.hotel_details.map((tourHotelDetail, index) => {
            const selectedQuote = availableHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
            const quoteDisplay = selectedQuote
              ? `${selectedQuote.name} (${selectedQuote.location}) - ${selectedQuote.num_nights_quoted} Noches - ${selectedQuote.quoted_date ? format(new Date(selectedQuote.quoted_date), 'PPP') : 'Fecha N/A'}`
              : 'Seleccionar Cotización';
            const totalQuoteCost = selectedQuote
              ? (((selectedQuote.num_double_rooms || 0) * selectedQuote.cost_per_night_double * selectedQuote.num_nights_quoted) +
                ((selectedQuote.num_triple_rooms || 0) * selectedQuote.cost_per_night_triple * selectedQuote.num_nights_quoted) +
                ((selectedQuote.num_quad_rooms || 0) * selectedQuote.cost_per_night_quad * selectedQuote.num_nights_quoted)) -
                ((selectedQuote.num_courtesy_rooms || 0) * selectedQuote.cost_per_night_quad * selectedQuote.num_nights_quoted)
              : 0;

            return (
              <div key={tourHotelDetail.id} className="flex flex-col md:flex-row items-center gap-2 border p-2 rounded-md">
                <Select
                  value={tourHotelDetail.hotel_quote_id}
                  onValueChange={(value) => handleTourHotelChange(index, value)}
                >
                  <SelectTrigger className="w-full md:w-2/3">
                    <SelectValue placeholder={quoteDisplay} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHotelQuotes.map((quote) => (
                      <SelectItem key={quote.id} value={quote.id}>
                        {`${quote.name} (${quote.location}) - ${quote.num_nights_quoted} Noches - ${quote.quoted_date ? format(new Date(quote.quoted_date), 'PPP') : 'Fecha N/A'} (Coordinadores: ${quote.num_courtesy_rooms})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedQuote && (
                  <span className="text-sm text-gray-600 md:w-1/4 text-center md:text-left">
                    Costo Neto: ${totalQuoteCost.toFixed(2)}
                  </span>
                )}
                <Button type="button" variant="destructive" size="icon" onClick={() => removeTourHotelItem(tourHotelDetail.id)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="outline" onClick={addTourHotelItem}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cotización de Hotel
          </Button>
        </div>

        {/* NEW: Cheapest Hotel Finder */}
        <div className="col-span-full mt-4 p-4 bg-blue-50 rounded-md">
          <h3 className="text-xl font-semibold mb-4 text-blue-800 flex items-center">
            <HotelIcon className="mr-2 h-5 w-5" /> Búsqueda de Hotel Más Barato
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            Busca la cotización de hotel activa más barata para la duración de este tour (basado en costo por noche doble).
          </p>
          <div className="flex justify-end">
            <Button 
              type="button" 
              onClick={handleFindCheapestHotel} 
              disabled={loadingCheapestHotel || !formData.departure_date || !formData.return_date}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loadingCheapestHotel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Buscar Hotel Más Barato
            </Button>
          </div>
          {cheapestHotelQuote && (
            <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
              <h4 className="font-semibold text-blue-900">Resultado:</h4>
              <p className="text-blue-800">
                <span className="font-bold">{cheapestHotelQuote.name}</span> ({cheapestHotelQuote.location})
              </p>
              <p className="text-blue-800 text-sm">
                Costo Estimado para {cheapestHotelQuote.num_nights_tour} noches (Doble): <span className="font-bold">${cheapestHotelQuote.estimated_total_cost.toFixed(2)}</span>
              </p>
              <Button 
                type="button" 
                variant="link" 
                className="p-0 h-auto text-blue-600"
                onClick={() => navigate(`/admin/hotels/edit/${cheapestHotelQuote.id}`)}
              >
                Ver Cotización
              </Button>
            </div>
          )}
        </div>

        {/* NEW: Provider Services */}
        <div className="space-y-2 col-span-full">
          <Label className="text-lg font-semibold">Servicios de Proveedores Vinculados</Label>
          {formData.provider_details.map((tourProviderService) => {
            const selectedProvider = availableProviders.find(p => p.id === tourProviderService.provider_id);
            const providerDisplay = selectedProvider
              ? `${selectedProvider.name} (${selectedProvider.service_type} - ${selectedProvider.unit_type})`
              : 'Seleccionar Proveedor';
            const totalCost = tourProviderService.cost_per_unit_snapshot * tourProviderService.quantity;

            return (
              <div key={tourProviderService.id} className="flex flex-col md:flex-row items-center gap-2 border p-2 rounded-md">
                <Select
                  value={tourProviderService.provider_id}
                  onValueChange={(value) => handleProviderServiceChange(tourProviderService.id, 'provider_id', value)}
                >
                  <SelectTrigger className="w-full md:w-1/2">
                    <SelectValue placeholder={providerDisplay} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {`${provider.name} (${provider.service_type} - ${provider.unit_type})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  pattern="[0-9]*"
                  value={tourProviderService.quantity}
                  onChange={(e) => handleProviderServiceChange(tourProviderService.id, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder="Cantidad"
                  className="w-full md:w-1/6"
                  required
                />
                <span className="text-sm text-gray-600 md:w-1/4 text-center md:text-left">
                  Costo Total: ${totalCost.toFixed(2)}
                </span>
                <Button type="button" variant="destructive" size="icon" onClick={() => removeTourProviderService(tourProviderService.id)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="outline" onClick={addTourProviderService}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Servicio de Proveedor
          </Button>
        </div>

        {/* Financial Summary */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
          <div>
            <Label className="font-semibold">Costo Base Total del Tour:</Label>
            <p>${formData.total_base_cost?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <Label className="font-semibold">Clientes Pagantes Potenciales:</Label>
            <p>{formData.paying_clients_count || 0}</p>
          </div>
          <div>
            <Label className="font-semibold">Costo por Persona Pagante:</Label>
            <p>${formData.cost_per_paying_person?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <Label className="font-semibold">Asientos Vendidos:</Label>
            <p>{totalSoldSeats}</p>
          </div>
          <div>
            <Label className="font-semibold">Ingresos por Clientes Activos:</Label>
            <p>${totalClientsRevenue.toFixed(2)}</p>
          </div>
          <div>
            <Label htmlFor="other_income" className="font-semibold">Otros Ingresos:</Label>
            <Input
              id="other_income"
              type="text"
              pattern="[0-9]*\.?[0-9]*"
              value={formData.other_income}
              onChange={handleChange}
              className="w-full"
              required
            />
          </div>
          <div>
            <Label className="font-semibold">Total Vendido (Ingresos):</Label>
            <p>${totalSoldRevenue.toFixed(2)}</p>
          </div>
          <div>
            <Label className="font-semibold">Total por Vender (Ingresos Potenciales):</Label>
            <p>${totalToSell.toFixed(2)}</p>
          </div>
          <div className="md:col-span-2">
            <Label className="font-semibold">Total por Pagar en Costos (Pendiente):</Label>
            <p>${totalRemainingPayments.toFixed(2)}</p>
          </div>
        </div>

        {/* Selling Price & Profit */}
        <div className="col-span-full mt-4 p-4 bg-blue-50 rounded-md">
          <h3 className="text-xl font-semibold mb-4 text-blue-800">Estrategia de Precios</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label htmlFor="desired_profit_percentage" className="md:text-right">Ganancia Deseada (%)</Label>
            <Input
              id="desired_profit_percentage"
              type="text"
              pattern="[0-9]*\.?[0-9]*"
              value={desiredProfitPercentage}
              onChange={(e) => setDesiredProfitPercentage(parseFloat(e.target.value) || 0)}
              className="md:col-span-3"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="suggested_selling_price" className="md:text-right font-bold text-lg">Precio de Venta Sugerido por Persona (Promedio Adulto)</Label>
            <Input id="suggested_selling_price" type="text" value={suggestedSellingPrice.toFixed(2)} readOnly className="md:col-span-3 text-lg font-bold bg-blue-100 cursor-not-allowed" title="Calculado en base al costo por persona pagante y la ganancia deseada" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="selling_price_double_occupancy" className="md:text-right font-bold text-lg">Precio Venta por Persona (Doble)</Label>
            <Input id="selling_price_double_occupancy" type="text" pattern="[0-9]*\.?[0-9]*" value={formData.selling_price_double_occupancy} onChange={handleChange} className="md:col-span-3 text-lg font-bold" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="selling_price_triple_occupancy" className="md:text-right font-bold text-lg">Precio Venta por Persona (Triple)</Label>
            <Input id="selling_price_triple_occupancy" type="text" pattern="[0-9]*\.?[0-9]*" value={formData.selling_price_triple_occupancy} onChange={handleChange} className="md:col-span-3 text-lg font-bold" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="selling_price_quad_occupancy" className="md:text-right font-bold text-lg">Precio Venta por Persona (Cuádruple)</Label>
            <Input id="selling_price_quad_occupancy" type="text" pattern="[0-9]*\.?[0-9]*" value={formData.selling_price_quad_occupancy} onChange={handleChange} className="md:col-span-3 text-lg font-bold" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="selling_price_child" className="md:text-right font-bold text-lg">Precio Venta por Menor (-12 años)</Label>
            <Input id="selling_price_child" type="text" pattern="[0-9]*\.?[0-9]*" value={formData.selling_price_child} onChange={handleChange} className="md:col-span-3 text-lg font-bold" required />
          </div>
        </div>

        {/* Break-even Analysis Section */}
        <div className="col-span-full mt-4 p-4 bg-yellow-50 rounded-md">
          <h3 className="text-xl font-semibold mb-4 text-yellow-800">Análisis de Punto de Equilibrio</h3>
          <p className="text-sm text-gray-700 mb-4">
            Calcula cuántos clientes necesitas para cubrir los costos del tour y recibe recomendaciones.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label htmlFor="expected_clients_for_breakeven" className="md:text-right">Clientes Esperados (para análisis)</Label>
            <Input
              id="expected_clients_for_breakeven"
              type="text"
              pattern="[0-9]*"
              value={expectedClientsForBreakeven}
              onChange={(e) => setExpectedClientsForBreakeven(parseFloat(e.target.value) || 0)}
              className="md:col-span-3"
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button type="button" onClick={runBreakevenAnalysis} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              Calcular Punto de Equilibrio
            </Button>
          </div>

          {breakevenResult && (
            <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded-md">
              <h4 className="font-semibold text-lg text-yellow-900 mb-2">Resultado del Análisis:</h4>
              <p className="text-yellow-800 mb-2">{breakevenResult.message}</p>
              <p className="text-yellow-800">
                Clientes Necesarios para Punto de Equilibrio: <span className="font-bold">{Math.ceil(breakevenResult.clientsNeededToBreakEven)}</span>
              </p>
              {breakevenResult.potentialProfitAtExpectedClients !== null && (
                <p className="text-yellow-800">
                  Ganancia Potencial con {expectedClientsForBreakeven} clientes: <span className="font-bold">${breakevenResult.potentialProfitAtExpectedClients.toFixed(2)}</span>
                </p>
              )}
              {breakevenResult.recommendations.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-semibold text-yellow-900">Recomendaciones:</h5>
                  <ul className="list-disc list-inside text-yellow-800">
                    {breakevenResult.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>


        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSubmitting || isUploadingImage}>
            {isSubmitting || isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isUploadingImage ? 'Subiendo imagen...' : (tourId ? 'Guardar Cambios' : 'Crear Tour')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TourForm;