"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import { stripHtmlTags } from '@/utils/html'; // Import stripHtmlTags

interface BlogCardProps {
  imageUrl: string;
  title: string;
  description: string;
  blogId: string; // Changed 'link' to 'blogId' to construct the URL
}

const BlogCard: React.FC<BlogCardProps> = ({ imageUrl, title, description, blogId }) => {
  const cleanDescription = stripHtmlTags(description);
  
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl hover:ring-2 hover:ring-rosa-mexicano hover:ring-offset-2 transition-all duration-300 group bg-white flex flex-col">
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="text-gray-600 text-base line-clamp-3">
          {cleanDescription}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to={`/blog/${blogId}`}> {/* Use Link to navigate to the blog post page */}
            Leer Más
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BlogCard;