import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { clientId, amount, description, contractNumber } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settings } = await supabaseAdmin.from('agency_settings').select('*').single();
    const isTestMode = settings?.payment_mode === 'test';
    
    const MP_ACCESS_TOKEN = isTestMode 
      ? Deno.env.get('MP_TEST_ACCESS_TOKEN') 
      : Deno.env.get('MP_ACCESS_TOKEN');

    if (!MP_ACCESS_TOKEN) throw new Error(`Token de Mercado Pago (${isTestMode ? 'Prueba' : 'Producción'}) no configurado`);

    const percentage = (settings?.mp_commission_percentage || 3.99) / 100;
    const fixed = settings?.mp_fixed_fee || 4.0;
    const taxFactor = 1.16;
    
    const totalToPay = (amount + fixed) / (1 - (percentage * taxFactor));
    const roundedTotal = Math.ceil(totalToPay * 100) / 100;

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{
          title: description || "Anticipo de Reserva",
          unit_price: roundedTotal,
          quantity: 1,
          currency_id: "MXN",
        }],
        external_reference: clientId,
        back_urls: {
          success: `${req.headers.get("origin")}/payment-success?contract=${contractNumber}`,
          failure: `${req.headers.get("origin")}/payment-failure`,
        },
        auto_return: "approved",
      }),
    });

    const preference = await response.json();
    
    return new Response(JSON.stringify({ 
      id: preference.id, 
      init_point: preference.init_point,
      total: roundedTotal
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