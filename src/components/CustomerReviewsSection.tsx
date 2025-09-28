"use client";

import React from 'react';
import CustomerReviewCard from './CustomerReviewCard';

interface CustomerReview {
  id: string;
  name: string;
  reviewText: string;
  rating: number;
}

const customerReviews: CustomerReview[] = [
  {
    id: 'review-1',
    name: 'Ana G.',
    reviewText: '¡Una experiencia increíble! El tour a la Riviera Maya superó todas nuestras expectativas. Los guías fueron muy amables y conocedores. Definitivamente volveremos a viajar con Saura Tours.',
    rating: 5,
  },
  {
    id: 'review-2',
    name: 'Carlos M.',
    reviewText: 'El viaje a la Sierra Madre fue espectacular. Los paisajes eran impresionantes y la organización impecable. Recomiendo esta agencia al 100%.',
    rating: 5,
  },
  {
    id: 'review-3',
    name: 'Sofía P.',
    reviewText: 'Oaxaca es un destino mágico y Saura Tours hizo que nuestra visita fuera inolvidable. La comida, la cultura, todo fue perfecto. ¡Gracias por una experiencia tan enriquecedora!',
    rating: 4,
  },
  {
    id: 'review-4',
    name: 'Roberto L.',
    reviewText: 'Viajamos en familia y los consejos para viajar con niños fueron muy útiles. Disfrutamos mucho de cada actividad. ¡Altamente recomendado para familias!',
    rating: 5,
  },
  {
    id: 'review-5',
    name: 'Elena R.',
    reviewText: 'El servicio al cliente fue excepcional desde el primer contacto. Nos ayudaron a planificar un viaje a medida que se ajustó perfectamente a nuestro presupuesto y deseos.',
    rating: 5,
  },
  {
    id: 'review-6',
    name: 'Miguel S.',
    reviewText: 'Quedé muy satisfecho con mi tour. Todo estuvo bien organizado y los hoteles seleccionados eran de muy buena calidad. Volvería a contratar sus servicios.',
    rating: 4,
  },
];

const CustomerReviewsSection = () => {
  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-10">
          Lo que dicen nuestros clientes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {customerReviews.map((review) => (
            <CustomerReviewCard
              key={review.id}
              name={review.name}
              reviewText={review.reviewText}
              rating={review.rating}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomerReviewsSection;