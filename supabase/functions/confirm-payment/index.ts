import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { contractNumber, method, amount } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar al cliente
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, total_amount, total_paid, advance_payment')
      .ilike('contract_number', contractNumber)
      .single();

    if (clientError || !client) throw new Error('Contrato no encontrado');

    // 2. Determinar el monto exacto a abonar
    let amountToCredit = parseFloat(amount);

    if (isNaN(amountToCredit) || amountToCredit <= 0) {
      amountToCredit = client.total_paid === 0 ? (client.advance_payment || 0) : 0;
    }

    if (amountToCredit <= 0) {
      return new Response(JSON.stringify({ message: 'No se especificó un monto válido para abonar.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Registrar el pago en el historial
    const { error: paymentError } = await supabaseAdmin
      .from('client_payments')
      .insert({
        client_id: client.id,
        amount: amountToCredit,
        payment_method: method || 'online',
        payment_date: new Date().toISOString().split('T')[0]
      });

    if (paymentError) throw paymentError;

    // 4. Actualizar el total pagado y cambiar estado a 'confirmed'
    const newTotalPaid = (client.total_paid || 0) + amountToCredit;
    const newStatus = newTotalPaid > 0 ? 'confirmed' : 'pending';

    const { error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ 
        total_paid: newTotalPaid, 
        status: newStatus,
        updated_at: new Date().toISOString() 
      })
      .eq('id', client.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Abono registrado correctamente',
      credited: amountToCredit 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});