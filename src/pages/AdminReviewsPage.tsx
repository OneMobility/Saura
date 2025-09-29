"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, PlusCircle, Star } from 'lucide-react';
import ReviewFormDialog from '@/components/admin/reviews/ReviewFormDialog';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';

interface CustomerReview {
  id: string;
  name: string;
  review_text: string;
  rating: number;
  created_at: string;
}

const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<CustomerReview | null>(null);
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchReviews();
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer reviews:', error);
      toast.error('Error al cargar las opiniones de los clientes.');
    } else {
      setReviews(data || []);
    }
    setLoading(false);
  };

  const handleAddReview = () => {
    setSelectedReview(null);
    setIsFormDialogOpen(true);
  };

  const handleEditReview = (review: CustomerReview) => {
    setSelectedReview(review);
    setIsFormDialogOpen(true);
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta opinión?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('customer_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting review:', error);
      toast.error('Error al eliminar la opinión.');
    } else {
      toast.success('Opinión eliminada con éxito.');
      fetchReviews(); // Refresh the list
    }
    setLoading(false);
  };

  const renderStars = (numStars: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i < numStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return <div className="flex">{stars}</div>;
  };

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex flex-col flex-grow items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="mt-4 text-gray-700">Cargando opiniones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Opiniones de Clientes">
          <Button onClick={handleAddReview} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Opinión
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Opiniones Existentes</h2>
            {reviews.length === 0 ? (
              <p className="text-gray-600">No hay opiniones de clientes configuradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Opinión</TableHead>
                      <TableHead>Calificación</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell className="font-medium">{review.name}</TableCell>
                        <TableCell className="line-clamp-2 max-w-[300px]">{review.review_text}</TableCell>
                        <TableCell>{renderStars(review.rating)}</TableCell>
                        <TableCell>{new Date(review.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditReview(review)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteReview(review.id)}
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
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      <ReviewFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSave={fetchReviews}
        initialData={selectedReview}
      />
    </div>
  );
};

export default AdminReviewsPage;