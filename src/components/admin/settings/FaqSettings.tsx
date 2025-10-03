"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Trash2, Loader2, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor'; // Import the new RichTextEditor

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order_index: number;
}

const FaqSettings = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editingFaqData, setEditingFaqData] = useState<FaqItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('faq_settings')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching FAQs:', error);
      toast.error('Error al cargar las preguntas frecuentes.');
    } else {
      setFaqs(data || []);
    }
    setLoading(false);
  };

  const handleNewFaqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewFaq((prev) => ({ ...prev, [id]: value }));
  };

  const handleNewFaqRichTextChange = (content: string) => {
    setNewFaq((prev) => ({ ...prev, answer: content }));
  };

  const handleEditingFaqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditingFaqData((prev) => (prev ? { ...prev, [id]: value } : null));
  };

  const handleEditingFaqRichTextChange = (content: string) => {
    setEditingFaqData((prev) => (prev ? { ...prev, answer: content } : null));
  };

  const addFaq = async () => {
    if (!newFaq.question || !newFaq.answer) {
      toast.error('Por favor, rellena la pregunta y la respuesta para la nueva FAQ.');
      return;
    }
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from('faq_settings')
      .insert({
        question: newFaq.question,
        answer: newFaq.answer,
        order_index: faqs.length, // Assign a new order index
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding FAQ:', error);
      toast.error('Error al añadir la pregunta frecuente.');
    } else if (data) {
      setFaqs((prev) => [...prev, data]);
      setNewFaq({ question: '', answer: '' });
      toast.success('Pregunta frecuente añadida con éxito.');
    }
    setIsSubmitting(false);
  };

  const startEditing = (faq: FaqItem) => {
    setEditingFaqId(faq.id);
    setEditingFaqData(faq);
  };

  const cancelEditing = () => {
    setEditingFaqId(null);
    setEditingFaqData(null);
  };

  const saveEditing = async () => {
    if (!editingFaqData || !editingFaqData.question || !editingFaqData.answer) {
      toast.error('Por favor, rellena la pregunta y la respuesta.');
      return;
    }
    setIsSubmitting(true);

    const { error } = await supabase
      .from('faq_settings')
      .update({
        question: editingFaqData.question,
        answer: editingFaqData.answer,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingFaqData.id);

    if (error) {
      console.error('Error updating FAQ:', error);
      toast.error('Error al actualizar la pregunta frecuente.');
    } else {
      toast.success('Pregunta frecuente actualizada con éxito.');
      fetchFaqs(); // Re-fetch to ensure order is correct if it was changed
      cancelEditing();
    }
    setIsSubmitting(false);
  };

  const deleteFaq = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta pregunta frecuente?')) {
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase
      .from('faq_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Error al eliminar la pregunta frecuente.');
    } else {
      toast.success('Pregunta frecuente eliminada con éxito.');
      fetchFaqs(); // Re-fetch to update order_index for remaining items
    }
    setIsSubmitting(false);
  };

  const moveFaq = async (id: string, direction: 'up' | 'down') => {
    setIsSubmitting(true);
    const currentFaqIndex = faqs.findIndex(faq => faq.id === id);
    if (currentFaqIndex === -1) {
      setIsSubmitting(false);
      return;
    }

    const newFaqs = [...faqs];
    const [movedFaq] = newFaqs.splice(currentFaqIndex, 1);
    const newIndex = direction === 'up' ? currentFaqIndex - 1 : currentFaqIndex + 1;

    if (newIndex < 0 || newIndex >= newFaqs.length + 1) {
      setIsSubmitting(false);
      return; // Cannot move further
    }

    newFaqs.splice(newIndex, 0, movedFaq);

    // Update order_index for all affected FAQs
    const updates = newFaqs.map((faq, index) => ({
      id: faq.id,
      order_index: index,
    }));

    const { error } = await supabase
      .from('faq_settings')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('Error reordering FAQs:', error);
      toast.error('Error al reordenar las preguntas frecuentes.');
    } else {
      toast.success('Orden de preguntas frecuentes actualizado.');
      setFaqs(newFaqs); // Update local state immediately for better UX
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <CardTitle className="mb-4">Configuración de Preguntas Frecuentes</CardTitle>
        <CardDescription>Cargando preguntas frecuentes...</CardDescription>
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano mt-4" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Configuración de Preguntas Frecuentes</CardTitle>
        <CardDescription>Gestiona las preguntas y respuestas que aparecen en la sección de FAQ.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Añadir Nueva Pregunta Frecuente</h3>
          <div className="space-y-2">
            <Label htmlFor="question">Pregunta</Label>
            <Input
              id="question"
              value={newFaq.question}
              onChange={handleNewFaqChange}
              placeholder="Ej: ¿Cómo puedo reservar un boleto?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="answer">Respuesta</Label>
            <RichTextEditor
              value={newFaq.answer}
              onChange={handleNewFaqRichTextChange}
              placeholder="Ej: Puedes reservar tus boletos directamente en nuestra página..."
              className="min-h-[150px]"
            />
          </div>
          <Button onClick={addFaq} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Añadir FAQ
          </Button>
        </div>

        <div className="space-y-4 mt-8">
          <h3 className="text-xl font-semibold">Preguntas Frecuentes Existentes</h3>
          {faqs.length === 0 ? (
            <p className="text-gray-600">No hay preguntas frecuentes configuradas.</p>
          ) : (
            <div className="grid gap-4">
              {faqs.map((faq, index) => (
                <Card key={faq.id} className="p-4">
                  {editingFaqId === faq.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="edit_question">Pregunta</Label>
                        <Input
                          id="question"
                          value={editingFaqData?.question || ''}
                          onChange={handleEditingFaqChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_answer">Respuesta</Label>
                        <RichTextEditor
                          value={editingFaqData?.answer || ''}
                          onChange={handleEditingFaqRichTextChange}
                          placeholder="Escribe aquí la respuesta."
                          className="min-h-[150px]"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={cancelEditing} disabled={isSubmitting}>
                          Cancelar
                        </Button>
                        <Button onClick={saveEditing} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Guardar Cambios
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-4">
                      <div className="flex flex-col space-y-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveFaq(faq.id, 'up')}
                          disabled={isSubmitting || index === 0}
                          className="h-8 w-8"
                        >
                          <ChevronUp className="h-4 w-4" />
                          <span className="sr-only">Mover arriba</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveFaq(faq.id, 'down')}
                          disabled={isSubmitting || index === faqs.length - 1}
                          className="h-8 w-8"
                        >
                          <ChevronDown className="h-4 w-4" />
                          <span className="sr-only">Mover abajo</span>
                        </Button>
                      </div>
                      <div className="flex-grow">
                        <p className="font-semibold text-lg">{faq.question}</p>
                        <div className="text-sm text-gray-700 mt-1" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={() => startEditing(faq)} disabled={isSubmitting}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => deleteFaq(faq.id)} disabled={isSubmitting}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FaqSettings;