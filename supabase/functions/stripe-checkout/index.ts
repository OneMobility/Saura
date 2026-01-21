import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { clientId, amount, description } = await req.json();

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) throw new Error("Stripe Secret Key no configurada");

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Stripe cobra comisiones pero el cálculo es diferente. 
    // Para simplificar y unificar con MP, aplicaremos una lógica similar si lo deseas, 
    // o simplemente pasar el monto neto. En Stripe, las comisiones suelen restarse del total.
    // Aquí calcularemos un total que cubra la comisión aproximada (3.6% + $3 MXN)
    const commissionRate = 0.036;
    const fixedFee = 3.0;
    const totalToPay = (amount + fixedFee) / (1 - commissionRate);
    const roundedTotal = Math.ceil(totalToPay * 100); // Stripe usa centavos

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: description || "Anticipo de Reserva",
            },
            unit_amount: roundedTotal,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-failure`,
      client_reference_id: clientId,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});