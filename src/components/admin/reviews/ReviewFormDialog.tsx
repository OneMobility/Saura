"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Star } from 'lucide-react';

interface CustomerReview {
  id?: string;
  name: string;
  review_text: string;
  rating: number;
}

interface ReviewFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh review list
  initialData?: CustomerReview | null;
}

const ReviewFormDialog: React.FC<ReviewFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<CustomerReview>({
    name: '',
    review_text: '',
    rating: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        review_text: '',
        rating: 5,
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.review_text || formData.rating < 1 || formData.rating > 5) {
      toast.error('Por favor, rellena todos los campos y asegúrate de que la calificación sea entre 1 y 5.');
      setIsSubmitting(false);
      return;
    }

    if (initialData?.id) {
      // Update existing review
      const { error } = await supabase
        .from('customer_reviews')
        .update({
          name: formData.name,
          review_text: formData.review_text,
          rating: formData.rating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', initialData.id);

      if (error) {
        console.error('Error updating review:', error);
        toast.error('Error al actualizar la opinión.');
      } else {
        toast.success('Opinión actualizada con éxito.');
        onSave();
        onClose();
      }
    } else {
      // Insert new review
      const { error } = await supabase
        .from('customer_reviews')
        .insert({
          name: formData.name,
          review_text: formData.review_text,
          rating: formData.rating,
        });

      if (error) {
        console.error('Error creating review:', error);
        toast.error('Error al crear la opinión.');
      } else {
        toast.success('Opinión creada con éxito.');
        onSave();
        onClose();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Opinión de Cliente' : 'Añadir Nueva Opinión'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los detalles de la opinión.' : 'Rellena los campos para añadir una nueva opinión.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="review_text" className="text-right pt-2">
              Opinión
            </Label>
            <Textarea
              id="review_text"
              value={formData.review_text}
              onChange={handleChange}
              className="col-span-3 min-h-[100px]"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rating" className="text-right">
              Calificación
            </Label>
            <div className="col-span-3 flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-6 w-6 cursor-pointer ${star <= formData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  onClick={() => handleRatingChange(star)}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {initialData ? 'Guardar Cambios' : 'Añadir Opinión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewFormDialog;