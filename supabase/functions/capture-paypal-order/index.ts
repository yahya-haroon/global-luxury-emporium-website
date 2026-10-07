import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OWNER_EMAIL = 'globalluxuryemporium@gmail.com';

function getPayPalApiBase(): string {
  const env = (Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox').trim().toLowerCase();
  return env === 'production' || env === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken(clientId: string, clientSecret: string, apiBase: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('PayPal OAuth error:', res.status, errorText);
    throw new Error(`Failed to authenticate with PayPal (${res.status})`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('No access_token returned by PayPal');
  }

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'PayPal credentials are not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { orderId, paypalOrderId, fundingSource = 'paypal' } = body;

    if (!paypalOrderId) {
      return new Response(
        JSON.stringify({ error: 'Missing paypalOrderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiBase = getPayPalApiBase();
    const accessToken = await getPayPalAccessToken(clientId, clientSecret, apiBase);

    // Call PayPal capture API
    const captureRes = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureRes.json();

    if (!captureRes.ok) {
      // Check if already captured
      if (captureData?.name === 'ORDER_ALREADY_CAPTURED' || captureData?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
        console.log('Order was already captured, verifying existing record:', paypalOrderId);
      } else {
        console.error('PayPal capture error response:', captureRes.status, captureData);
        throw new Error(captureData.message || captureData?.details?.[0]?.description || 'PayPal capture failed');
      }
    }

    const status = captureData.status || 'COMPLETED';
    const isCompleted = status === 'COMPLETED' || captureData?.name === 'ORDER_ALREADY_CAPTURED';

    if (!isCompleted) {
      throw new Error(`Unexpected PayPal order status: ${status}`);
    }

    // Extract capture details
    const captureObj = captureData?.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = captureObj?.id || `CAP_${paypalOrderId}`;
    const payerEmail = captureData?.payer?.email_address;
    const payerGivenName = captureData?.payer?.name?.given_name || '';
    const payerSurname = captureData?.payer?.name?.surname || '';
    const payerName = `${payerGivenName} ${payerSurname}`.trim();

    // Update order status in Supabase
    const isCardFunding = fundingSource === 'paypal_card' || fundingSource === 'card';
    const effectivePaymentMethod = isCardFunding
      ? 'paypal_card'
      : fundingSource === 'paylater'
      ? 'paylater'
      : 'paypal';

    const updatePayload: Record<string, any> = {
      status: 'paid',
      payment_status: 'completed',
      payment_method: effectivePaymentMethod,
      paypal_capture_id: captureId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Extract non-sensitive card metadata if provided by PayPal capture response
    const cardInfo =
      captureData?.payment_source?.card ||
      captureObj?.payment_source?.card ||
      captureData?.payment_source?.credit_card;

    if (cardInfo) {
      if (cardInfo.brand) {
        updatePayload.card_brand = String(cardInfo.brand).toLowerCase();
      }
      if (cardInfo.last_digits) {
        updatePayload.card_last4 = String(cardInfo.last_digits);
      }
    }

    if (payerName) {
      updatePayload.customer_name = payerName;
    }

    let query = supabase.from('orders').update(updatePayload);
    if (orderId) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('paypal_order_id', paypalOrderId);
    }

    const { data: updatedOrder, error: updateErr } = await query.select().maybeSingle();

    if (updateErr) {
      console.warn('Supabase order update note:', updateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: updatedOrder?.id || orderId,
        captureId,
        status: 'paid',
        payer: {
          email: payerEmail,
          name: payerName,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error in capture-paypal-order:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'PayPal capture failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
