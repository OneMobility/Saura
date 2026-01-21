"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/button'; // Usamos el sistema de Dialog de Shadcn
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { X, ExternalLink } from 'lucide-react';
import * as DialogPrimitive from "@radix-ui/react-dialog";

const PromotionPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const fetchPopup = async () => {
      // Verificar si ya se mostró en esta sesión
      if (sessionStorage.getItem('popupShown')) return;

      const { data } = await supabase.from('popup_settings').select('*').eq('is_active', true).single();
      
      if (data) {
        setConfig(data);
        // Pequeño delay para no interrumpir la carga inicial
        setTimeout(() => setIsOpen(true), 2000);
      }
    };
    fetchPopup();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('popupShown', 'true');
  };

  if (!config) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl overflow-hidden">
          
          <div className="relative">
            {config.image_url && (
              <img src={config.image_url} alt={config.title} className="w-full h-auto max-h-[60vh] object-cover" />
            )}
            
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="p-6 text-center">
            <h2 className="text-2xl font-bold text-rosa-mexicano mb-2">{config.title}</h2>
            {config.link_url && (
              <Button asChild className="mt-4 bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white w-full py-6 text-lg rounded-xl shadow-lg">
                <a href={config.link_url} target="_blank" rel="noopener noreferrer">
                  Ver Promoción <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            )}
            <button onClick={handleClose} className="mt-4 text-sm text-muted-foreground hover:text-rosa-mexicano underline transition-colors">
              Cerrar y continuar navegando
            </button>
          </div>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default PromotionPopup;