"use client";

import React, { useEffect, useState } from 'react';
import CustomerReviewCard from './CustomerReviewCard';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface CustomerReview {
  id: string;
  name: string;
  review_text: string; // Changed to review_text to match Supabase column name
  rating: number;
}

const CustomerReviewsSection = () => {
  const [customerReviews, setCustomerReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerReviews = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('customer_reviews')
        .select('*')
        .order('created_at', { ascending: false }) // Order by creation date, newest first
        .limit(6); // Limit to 6 reviews for the home section

      if (error) {
        console.error('Error fetching customer reviews:', error);
        setError('Error al cargar las opiniones de los clientes.');
        setCustomerReviews([]);
      } else {
        setCustomerReviews(data || []);
      }
      setLoading(false);
    };

    fetchCustomerReviews();
  }, []);

  if (loading) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-white flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700 text-xl">Cargando opiniones de clientes...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-white text-center text-red-600">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-10">
          Lo que dicen nuestros clientes
        </h2>
        <p className="text-xl">{error}</p>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-10">
          Lo que dicen nuestros clientes
        </h2>
        {customerReviews.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No hay opiniones de clientes disponibles en este momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {customerReviews.map((review) => (
              <CustomerReviewCard
                key={review.id}
                name={review.name}
                reviewText={review.review_text}
                rating={review.rating}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CustomerReviewsSection;