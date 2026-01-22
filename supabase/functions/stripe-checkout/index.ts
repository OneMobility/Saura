import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("[stripe-checkout] Función invocada");

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { clientId, amount, description } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('agency_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      throw new Error("No se pudo cargar la configuración de la agencia.");
    }

    const isTestMode = settings.payment_mode === 'test';
    
    // Buscar la llave secreta
    const STRIPE_SECRET_KEY = isTestMode
      ? (Deno.env.get('STRIPE_TEST_SECRET_KEY') || Deno.env.get('stripe'))
      : (Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('stripe'));

    if (!STRIPE_SECRET_KEY) {
      throw new Error(`Configuración incompleta: No se encontró la llave de Stripe en los secretos de Supabase.`);
    }

    // VALIDACIÓN CRÍTICA: Verificar si la llave es pública en lugar de secreta
    if (STRIPE_SECRET_KEY.startsWith('pk_')) {
      throw new Error(`Error de Configuración: Estás usando una 'Publishable Key' (pk_...) en los secretos de Supabase. Para pagos desde el servidor, DEBES usar una 'Secret Key' (sk_...). Por favor, cámbiala en el panel de Supabase.`);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const percentage = (settings.stripe_commission_percentage || 4.0) / 100;
    const fixed = settings.stripe_fixed_fee || 5.0;
    const taxFactor = 1.16; 
    
    const totalToPay = (amount + fixed) / (1 - (percentage * taxFactor));
    const roundedTotalCentavos = Math.ceil(totalToPay * 100);

    if (roundedTotalCentavos < 1000) {
      throw new Error("El monto es demasiado bajo para procesar con tarjeta. Debe ser mayor a $10.00 MXN.");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: { 
            name: description || "Anticipo de Reserva",
          },
          unit_amount: roundedTotalCentavos,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.get("origin")}/bus-tickets/confirmation/SUCCESS`,
      cancel_url: `${req.headers.get("origin")}/payment-failure`,
      client_reference_id: clientId,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("[stripe-checkout] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});