"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns'; // Import format for dates
import TourSeatMap from '@/components/TourSeatMap'; // Import the new TourSeatMap component

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
  courtesies: number;
  hotel_details: TourHotelDetail[]; // Updated type
  provider_details: { name: string; service: string; cost: number }[];
  total_base_cost?: number;
  paying_clients_count?: number;
  cost_per_paying_person?: number;
  selling_price_per_person: number; // Ensure this is part of the interface
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
  selling_price_child: number; // NEW: Price for children under 12
  user_id?: string;
}

interface TourFormProps {
  tourId?: string; // Optional tourId for editing existing tours
  onSave: () => void; // Callback to redirect after saving
}

// NEW: Interface for BreakevenResult
interface BreakevenResult {
  adjustedTotalBaseCost: number;
  adjustedCostPerPayingPerson: number;
  suggestedSellingPrice: number;
  message: string;
  simulatedDoubleRooms: number; // NEW
  simulatedTripleRooms: number; // NEW
  simulatedQuadRooms: number; // NEW
  costCovered: boolean; // NEW: Indicates if costs are covered
}

const TourForm: React.FC<TourFormProps> = ({ tourId, onSave }) => {
  const [formData, setFormData] = useState<Tour>({
    title: '',
    slug: '',
    description: '',
    image_url: '',
    full_content: '',
    duration: '',
    includes: [],
    itinerary: [],
    bus_id: null, // Initialize bus_id
    bus_capacity: 0,
    bus_cost: 0,
    courtesies: 0,
    hotel_details: [],
    provider_details: [],
    selling_price_per_person: 0, // Initialize this field
    selling_price_double_occupancy: 0, // Initialize new fields
    selling_price_triple_occupancy: 0,
    selling_price_quad_occupancy: 0,
    selling_price_child: 0, // Initialize new field
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableHotelQuotes, setAvailableHotelQuotes] = useState<HotelQuote[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]); // NEW: State for available buses
  const [selectedBusLayout, setSelectedBusLayout] = useState<SeatLayout | null>(null); // NEW: State for selected bus layout

  // NEW: Financial states
  const [totalSoldSeats, setTotalSoldSeats] = useState(0);
  const [totalRemainingPayments, setTotalRemainingPayments] = useState(0);
  const [desiredProfitPercentage, setDesiredProfitPercentage] = useState(20); // Default 20%
  const [suggestedSellingPrice, setSuggestedSellingPrice] = useState(0); // This will be an average

  // NEW: Break-even analysis states
  const [expectedClientsForBreakeven, setExpectedClientsForBreakeven] = useState(0);
  const [breakevenResult, setBreakevenResult] = useState<BreakevenResult | null>(null);

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
            bus_id: data.bus_id || null, // Ensure bus_id is set
            selling_price_per_person: data.selling_price_per_person || 0, // Set this field
            selling_price_double_occupancy: data.selling_price_double_occupancy || 0,
            selling_price_triple_occupancy: data.selling_price_triple_occupancy || 0,
            selling_price_quad_occupancy: data.selling_price_quad_occupancy || 0,
            selling_price_child: data.selling_price_child || 0, // Set new field
          });
          setImageUrlPreview(data.image_url);

          // Set selected bus layout if bus_id is present
          if (data.bus_id) {
            const bus = availableBuses.find(b => b.id === data.bus_id);
            setSelectedBusLayout(bus?.seat_layout_json || null);
          }
          setExpectedClientsForBreakeven(data.paying_clients_count || 0); // Initialize with full paying capacity
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
          selling_price_per_person: 0, // Reset this field
          selling_price_double_occupancy: 0,
          selling_price_triple_occupancy: 0,
          selling_price_quad_occupancy: 0,
          selling_price_child: 0, // Reset new field
        });
        setImageFile(null);
        setImageUrlPreview('');
        setSelectedBusLayout(null); // Clear layout for new tour
        setExpectedClientsForBreakeven(0);
      }
      setLoadingInitialData(false);
    };

    fetchTourData();
  }, [tourId, availableBuses]); // Add availableBuses to dependencies to ensure layout is set on load

  // NEW: Fetch total sold seats
  useEffect(() => {
    const fetchSoldSeats = async () => {
      if (!tourId) return;
      const { count, error } = await supabase
        .from('tour_seat_assignments')
        .select('id', { count: 'exact' })
        .eq('tour_id', tourId)
        .eq('status', 'booked');

      if (error) {
        console.error('Error fetching sold seats:', error);
        setTotalSoldSeats(0);
      } else {
        setTotalSoldSeats(count || 0);
      }
    };
    fetchSoldSeats();
  }, [tourId]);

  const calculateCosts = useCallback(() => {
    const totalProviderCost = formData.provider_details.reduce((sum, provider) => sum + provider.cost, 0);
    
    let totalHotelCost = 0; // Total cost for all rooms across all linked hotel quotes
    let currentTotalRemainingPayments = 0; // NEW: for total remaining payments

    formData.hotel_details.forEach(tourHotelDetail => {
      const hotelQuote = availableHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
      if (!hotelQuote) return;

      // Calculate cost based on the *contracted rooms in the hotel quote*
      // and the *cost per night for each room type* from the quote.
      const costDouble = (hotelQuote.num_double_rooms || 0) * hotelQuote.cost_per_night_double * hotelQuote.num_nights_quoted;
      const costTriple = (hotelQuote.num_triple_rooms || 0) * hotelQuote.cost_per_night_triple * hotelQuote.num_nights_quoted;
      const costQuad = (hotelQuote.num_quad_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
      
      const totalContractedRoomsCost = costDouble + costTriple + costQuad;

      // Subtract the value of courtesy rooms from the total contracted cost
      // Courtesy rooms are always valued at the quad occupancy rate
      const costOfCourtesyRooms = (hotelQuote.num_courtesy_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
      
      totalHotelCost += totalContractedRoomsCost - costOfCourtesyRooms;

      // NEW: Add hotel remaining payment (adjusted for courtesies)
      currentTotalRemainingPayments += (totalContractedRoomsCost - costOfCourtesyRooms) - (hotelQuote.total_paid || 0);
    });

    const selectedBus = availableBuses.find(b => b.id === formData.bus_id);
    const busRentalCost = selectedBus?.rental_cost || 0;
    const busAdvancePayment = selectedBus?.advance_payment || 0;
    const busTotalPaid = selectedBus?.total_paid || 0;

    const totalBaseCost = busRentalCost + totalProviderCost + totalHotelCost;

    const payingClientsCount = formData.bus_capacity - formData.courtesies;
    const costPerPayingPerson = payingClientsCount > 0 ? totalBaseCost / payingClientsCount : 0;

    // NEW: Add bus remaining payment
    currentTotalRemainingPayments += busRentalCost - busTotalPaid;

    // Calculate average selling price for potential revenue calculations
    // This average is for adults only, as child pricing is separate
    const averageAdultSellingPrice = (formData.selling_price_double_occupancy + formData.selling_price_triple_occupancy + formData.selling_price_quad_occupancy) / 3;

    setFormData((prev) => ({
      ...prev,
      total_base_cost: totalBaseCost,
      paying_clients_count: payingClientsCount,
      cost_per_paying_person: costPerPayingPerson,
      selling_price_per_person: averageAdultSellingPrice, // Set the average here
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
    formData.selling_price_double_occupancy, // Added to dependencies
    formData.selling_price_triple_occupancy, // Added to dependencies
    formData.selling_price_quad_occupancy, // Added to dependencies
    availableHotelQuotes,
    availableBuses,
    desiredProfitPercentage
  ]);

  useEffect(() => {
    calculateCosts();
  }, [calculateCosts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => {
      const newValue = type === 'number' ? parseFloat(value) : value;
      const updatedData = { ...prev, [id]: newValue };

      if (id === 'title') {
        updatedData.slug = generateSlug(value);
      }
      return updatedData;
    });
  };

  const handleNumberChange = (id: keyof Tour, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: parseFloat(value) || 0,
    }));
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
    const filePath = `${fileName}`; // Store directly in the bucket root

    const { data, error } = await supabase.storage
      .from('tour-images') // *** Changed to the new 'tour-images' bucket ***
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
      .from('tour-images') // *** Changed to the new 'tour-images' bucket ***
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
        id: uuidv4(), // Unique ID for this entry
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

  const handleProviderChange = (index: number, field: 'name' | 'service' | 'cost', value: string) => {
    setFormData((prev) => {
      const newProviders = [...prev.provider_details];
      if (field === 'cost') {
        newProviders[index] = { ...newProviders[index], [field]: parseFloat(value) || 0 };
      } else {
        newProviders[index] = { ...newProviders[index], [field]: value };
      }
      return { ...prev, provider_details: newProviders };
    });
  };

  const addProviderItem = () => {
    setFormData((prev) => ({
      ...prev,
      provider_details: [...prev.provider_details, { name: '', service: '', cost: 0 }],
    }));
  };

  const removeProviderItem = (index: number) => {
    setFormData((prev) => {
      const newProviders = [...prev.provider_details];
      newProviders.splice(index, 1);
      return { ...prev, provider_details: newProviders };
    });
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
    setSelectedBusLayout(selectedBus?.seat_layout_json || null); // Set the layout
  };

  // NEW: Break-even analysis function
  const runBreakevenAnalysis = useCallback(() => {
    const maxPayingCapacity = formData.bus_capacity - formData.courtesies;
    if (expectedClientsForBreakeven <= 0 || expectedClientsForBreakeven > maxPayingCapacity) {
      toast.error(`El número de clientes esperados debe ser mayor que 0 y no exceder la capacidad pagante del autobús (${maxPayingCapacity}).`);
      setBreakevenResult(null);
      return;
    }

    let currentAdjustedTotalBaseCost = formData.bus_cost + formData.provider_details.reduce((sum, p) => sum + p.cost, 0);
    let remainingClientsToAccommodate = expectedClientsForBreakeven;
    let hotelAdjustmentsMessage = '';

    // Deep copy of hotel quotes to simulate adjustments
    const tempHotelQuotes = availableHotelQuotes.map(hq => ({ ...hq }));
    const tourLinkedHotelQuotes = formData.hotel_details.map(td => ({ ...td }));

    // Reset room counts for linked hotels in the simulation
    tourLinkedHotelQuotes.forEach(tourHotelDetail => {
      const hotelQuote = tempHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
      if (hotelQuote) {
        hotelQuote.num_quad_rooms = 0;
        hotelQuote.num_triple_rooms = 0;
        hotelQuote.num_double_rooms = 0;
        hotelQuote.num_courtesy_rooms = 0; // Reset courtesy rooms for simulation
      }
    });

    // Sort linked hotel quotes by potential capacity (descending) to prioritize larger rooms
    tourLinkedHotelQuotes.sort((a, b) => {
      const quoteA = tempHotelQuotes.find(hq => hq.id === a.hotel_quote_id);
      const quoteB = tempHotelQuotes.find(hq => hq.id === b.hotel_quote_id);
      if (!quoteA || !quoteB) return 0;
      const capacityA = (quoteA.capacity_quad * 4) + (quoteA.capacity_triple * 3) + (quoteA.capacity_double * 2);
      const capacityB = (quoteB.capacity_quad * 4) + (quoteB.capacity_triple * 3) + (quoteB.capacity_double * 2);
      return capacityB - capacityA;
    });

    let simulatedDoubleRooms = 0;
    let simulatedTripleRooms = 0;
    let simulatedQuadRooms = 0;

    tourLinkedHotelQuotes.forEach(tourHotelDetail => {
      const hotelQuote = tempHotelQuotes.find(hq => hq.id === tourHotelDetail.hotel_quote_id);
      if (!hotelQuote || remainingClientsToAccommodate <= 0) return;

      // Prioritize quad rooms
      if (remainingClientsToAccommodate >= hotelQuote.capacity_quad && hotelQuote.capacity_quad > 0) {
        const numRooms = Math.floor(remainingClientsToAccommodate / hotelQuote.capacity_quad);
        hotelQuote.num_quad_rooms = numRooms;
        simulatedQuadRooms += numRooms;
        remainingClientsToAccommodate -= numRooms * hotelQuote.capacity_quad;
        if (numRooms > 0) hotelAdjustmentsMessage += ` ${numRooms} hab. cuádruples en ${hotelQuote.name}.`;
      }

      // Then triple rooms
      if (remainingClientsToAccommodate >= hotelQuote.capacity_triple && hotelQuote.capacity_triple > 0) {
        const numRooms = Math.floor(remainingClientsToAccommodate / hotelQuote.capacity_triple);
        hotelQuote.num_triple_rooms = numRooms;
        simulatedTripleRooms += numRooms;
        remainingClientsToAccommodate -= numRooms * hotelQuote.capacity_triple;
        if (numRooms > 0) hotelAdjustmentsMessage += ` ${numRooms} hab. triples en ${hotelQuote.name}.`;
      }

      // Finally, double rooms (use ceil for any remaining clients)
      if (remainingClientsToAccommodate > 0 && hotelQuote.capacity_double > 0) {
        const numRooms = Math.ceil(remainingClientsToAccommodate / hotelQuote.capacity_double);
        hotelQuote.num_double_rooms = numRooms;
        simulatedDoubleRooms += numRooms;
        remainingClientsToAccommodate -= numRooms * hotelQuote.capacity_double;
        if (numRooms > 0) hotelAdjustmentsMessage += ` ${numRooms} hab. dobles en ${hotelQuote.name}.`;
      }
      
      // For simulation, we assume no new courtesies are generated, but existing ones are considered.
      // If the hotel quote already had courtesy rooms, their cost reduction is applied.
      // For this simulation, we're calculating *needed* rooms, not necessarily using existing courtesies.
      // The total hotel cost calculation below will handle the cost reduction.
    });

    // Recalculate hotel cost based on adjusted rooms
    let adjustedHotelCost = 0;
    tempHotelQuotes.forEach(hotelQuote => {
      const costDouble = (hotelQuote.num_double_rooms || 0) * hotelQuote.cost_per_night_double * hotelQuote.num_nights_quoted;
      const costTriple = (hotelQuote.num_triple_rooms || 0) * hotelQuote.cost_per_night_triple * hotelQuote.num_nights_quoted;
      const costQuad = (hotelQuote.num_quad_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
      const totalContractedRoomsCost = costDouble + costTriple + costQuad;

      // Subtract the value of courtesy rooms from the total contracted cost for the simulation
      // Courtesy rooms are always valued at the quad occupancy rate
      const costOfCourtesyRooms = (hotelQuote.num_courtesy_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
      
      adjustedHotelCost += totalContractedRoomsCost - costOfCourtesyRooms;
    });
    currentAdjustedTotalBaseCost += adjustedHotelCost;

    const adjustedCostPerPayingPerson = expectedClientsForBreakeven > 0 ? currentAdjustedTotalBaseCost / expectedClientsForBreakeven : 0;
    
    // The selling price is fixed as per user request (average of the three selling prices)
    const averageSellingPrice = (formData.selling_price_double_occupancy + formData.selling_price_triple_occupancy + formData.selling_price_quad_occupancy) / 3;

    const message = `Análisis para ${expectedClientsForBreakeven} clientes: Para alojar a ${expectedClientsForBreakeven} personas, se necesitarían aproximadamente:${hotelAdjustmentsMessage || ' No se vincularon hoteles.'}`;
    const costCovered = averageSellingPrice >= adjustedCostPerPayingPerson;

    setBreakevenResult({
      adjustedTotalBaseCost: currentAdjustedTotalBaseCost,
      adjustedCostPerPayingPerson: adjustedCostPerPayingPerson,
      suggestedSellingPrice: averageSellingPrice, // Use the current average selling price as fixed
      message: message,
      simulatedDoubleRooms: simulatedDoubleRooms,
      simulatedTripleRooms: simulatedTripleRooms,
      simulatedQuadRooms: simulatedQuadRooms,
      costCovered: costCovered,
    });

  }, [
    expectedClientsForBreakeven,
    formData.bus_capacity,
    formData.courtesies,
    formData.bus_cost,
    formData.provider_details,
    formData.hotel_details,
    formData.selling_price_double_occupancy,
    formData.selling_price_triple_occupancy,
    formData.selling_price_quad_occupancy,
    availableHotelQuotes
  ]);


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
    } else if (!formData.image_url && !tourId) { // Only require image for new tours if not already present
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
      toast.error('El número de cortesías no puede ser igual o mayor que la capacidad del autobús.');
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
      selling_price_per_person: calculatedSellingPricePerPerson, // Add this line
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
        onSave(); // Call onSave to redirect
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
        onSave(); // Call onSave to redirect
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
  const totalSoldRevenue = totalSoldSeats * averageSellingPrice;
  const totalToSell = totalPotentialRevenue - totalSoldRevenue;

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
          <Textarea id="description" value={formData.description} onChange={handleChange} className="md:col-span-3" rows={3} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
          <Label htmlFor="full_content" className="md:text-right pt-2">Contenido Completo</Label>
          <Textarea id="full_content" value={formData.full_content} onChange={handleChange} className="md:col-span-3 min-h-[150px]" placeholder="Descripción detallada del tour. Puedes usar HTML básico." />
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
          <Input id="bus_capacity" type="number" value={formData.bus_capacity} readOnly className="md:col-span-3 bg-gray-100 cursor-not-allowed" title="Derivado del autobús seleccionado" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="bus_cost" className="md:text-right">Costo Autobús</Label>
          <Input id="bus_cost" type="number" value={formData.bus_cost} readOnly className="md:col-span-3 bg-gray-100 cursor-not-allowed" title="Derivado del autobús seleccionado" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="courtesies" className="md:text-right">Cortesías (Asientos Bus)</Label>
          <Input id="courtesies" type="number" value={formData.courtesies} onChange={(e) => handleNumberChange('courtesies', e.target.value)} className="md:col-span-3" required min={0} />
        </div>

        {/* Seat Map for Admin to block courtesies */}
        {tourId && formData.bus_capacity > 0 && (
          <div className="col-span-full mt-6">
            <h3 className="text-xl font-semibold mb-4">Gestión de Asientos (Admin)</h3>
            <TourSeatMap
              tourId={tourId}
              busCapacity={formData.bus_capacity}
              courtesies={formData.courtesies}
              seatLayoutJson={selectedBusLayout} // Pass the selected bus layout
              readOnly={false}
              adminMode={true} // Enable admin mode for blocking seats
            />
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
                ((selectedQuote.num_courtesy_rooms || 0) * selectedQuote.cost_per_night_quad * selectedQuote.num_nights_quoted) // Subtract courtesy cost using quad rate
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
                        {`${quote.name} (${quote.location}) - ${quote.num_nights_quoted} Noches - ${quote.quoted_date ? format(new Date(quote.quoted_date), 'PPP') : 'Fecha N/A'} (Cortesías: ${quote.num_courtesy_rooms})`}
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

        {/* Provider Details */}
        <div className="space-y-2 col-span-full">
          <Label className="text-lg font-semibold">Proveedores</Label>
          {formData.provider_details.map((provider, index) => (
            <div key={index} className="flex flex-col md:flex-row items-center gap-2">
              <Input
                value={provider.name}
                onChange={(e) => handleProviderChange(index, 'name', e.target.value)}
                placeholder="Nombre del Proveedor"
                className="w-full md:w-1/3"
              />
              <Input
                value={provider.service}
                onChange={(e) => handleProviderChange(index, 'service', e.target.value)}
                placeholder="Servicio Contratado"
                className="w-full md:w-1/3"
              />
              <Input
                type="number"
                value={provider.cost}
                onChange={(e) => handleProviderChange(index, 'cost', e.target.value)}
                placeholder="Costo"
                className="w-full md:w-1/3"
                min={0} step="0.01"
              />
              <Button type="button" variant="destructive" size="icon" onClick={() => removeProviderItem(index)}>
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addProviderItem}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Proveedor
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
              type="number"
              value={desiredProfitPercentage}
              onChange={(e) => setDesiredProfitPercentage(parseFloat(e.target.value) || 0)}
              className="md:col-span-3"
              min={0}
              step="0.1"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="suggested_selling_price" className="md:text-right font-bold text-lg">Precio de Venta Sugerido por Persona (Promedio Adulto)</Label>
            <Input id="suggested_selling_price" type="number" value={suggestedSellingPrice.toFixed(2)} readOnly className="md:col-span-3 text-lg font-bold bg-blue-100 cursor-not-allowed" title="Calculado en base al costo por persona pagante y la ganancia deseada" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="selling_price_double_occupancy" className="md:text-right font-bold text-lg">Precio Venta por Persona (Doble)</Label>
            <Input id="selling_price_double_occupancy" type="number" value={formData.selling_price_double_occupancy} onChange={(e) => handleNumberChange('selling_price_double_occupancy', e.target.value)} className="md:col-span-3 text-lg font-bold" required min={0} step="0.01" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="selling_price_triple_occupancy" className="md:text-right font-bold text-lg">Precio Venta por Persona (Triple)</Label>
            <Input id="selling_price_triple_occupancy" type="number" value={formData.selling_price_triple_occupancy} onChange={(e) => handleNumberChange('selling_price_triple_occupancy', e.target.value)} className="md:col-span-3 text-lg font-bold" required min={0} step="0.01" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="selling_price_quad_occupancy" className="md:text-right font-bold text-lg">Precio Venta por Persona (Cuádruple)</Label>
            <Input id="selling_price_quad_occupancy" type="number" value={formData.selling_price_quad_occupancy} onChange={(e) => handleNumberChange('selling_price_quad_occupancy', e.target.value)} className="md:col-span-3 text-lg font-bold" required min={0} step="0.01" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="selling_price_child" className="md:text-right font-bold text-lg">Precio Venta por Menor (-12 años)</Label>
            <Input id="selling_price_child" type="number" value={formData.selling_price_child} onChange={(e) => handleNumberChange('selling_price_child', e.target.value)} className="md:col-span-3 text-lg font-bold" required min={0} step="0.01" />
          </div>
        </div>

        {/* Break-even Analysis Section */}
        <div className="col-span-full mt-4 p-4 bg-yellow-50 rounded-md">
          <h3 className="text-xl font-semibold mb-4 text-yellow-800">Análisis de Punto de Equilibrio (Ajuste de Hoteles)</h3>
          <p className="text-sm text-gray-700 mb-4">
            Usa esta herramienta para calcular un precio de venta por persona y posibles ajustes en las habitaciones de hotel si esperas menos clientes de la capacidad total.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label htmlFor="expected_clients_for_breakeven" className="md:text-right">Clientes Esperados</Label>
            <Input
              id="expected_clients_for_breakeven"
              type="number"
              value={expectedClientsForBreakeven}
              onChange={(e) => setExpectedClientsForBreakeven(parseFloat(e.target.value) || 0)}
              className="md:col-span-3"
              min={1}
              max={formData.bus_capacity - formData.courtesies}
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
                Costo Base Total Ajustado: <span className="font-medium">${breakevenResult.adjustedTotalBaseCost.toFixed(2)}</span>
              </p>
              <p className="text-yellow-800">
                Costo por Persona Pagante Ajustado: <span className="font-medium">${breakevenResult.adjustedCostPerPayingPerson.toFixed(2)}</span>
              </p>
              <p className="text-yellow-800">
                Precio de Venta Fijo Utilizado (Promedio): <span className="font-bold">${breakevenResult.suggestedSellingPrice.toFixed(2)}</span>
              </p>
              <p className="text-yellow-800">
                Habitaciones Dobles Simuladas: <span className="font-medium">{breakevenResult.simulatedDoubleRooms}</span>
              </p>
              <p className="text-yellow-800">
                Habitaciones Triples Simuladas: <span className="font-medium">{breakevenResult.simulatedTripleRooms}</span>
              </p>
              <p className="text-yellow-800">
                Habitaciones Cuádruples Simuladas: <span className="font-medium">{breakevenResult.simulatedQuadRooms}</span>
              </p>
              <p className={`text-lg font-bold mt-4 ${breakevenResult.costCovered ? 'text-green-700' : 'text-red-700'}`}>
                {breakevenResult.costCovered ? '¡Los costos se cubren con el precio de venta actual!' : 'Advertencia: Los costos NO se cubren con el precio de venta actual.'}
              </p>
              <p className="text-sm text-gray-700 mt-2">
                *Este es un cálculo simulado. Las habitaciones de hotel no se ajustan automáticamente.
              </p>
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