-- Crear la tabla client_payments
CREATE TABLE public.client_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (REQUERIDO para seguridad)
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para client_payments
-- Los administradores pueden ver, insertar, actualizar y eliminar todos los pagos
CREATE POLICY "Admins can manage all client payments" ON public.client_payments
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Los clientes pueden ver sus propios pagos
CREATE POLICY "Clients can view their own payments" ON public.client_payments
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_payments.client_id AND user_id = auth.uid()));