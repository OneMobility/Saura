"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface CustomerReviewCardProps {
  name: string;
  reviewText: string;
  rating: number;
}

const CustomerReviewCard: React.FC<CustomerReviewCardProps> = ({ name, reviewText, rating }) => {
  const renderStars = (numStars: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-5 w-5 ${i < numStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  };

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">{name}</CardTitle>
          <div className="flex">{renderStars(rating)}</div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-gray-700 text-base line-clamp-4">
          "{reviewText}"
        </p>
      </CardContent>
    </Card>
  );
};

export default CustomerReviewCard;