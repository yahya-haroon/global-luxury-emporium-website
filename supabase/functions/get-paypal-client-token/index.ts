import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      console.warn('PayPal credentials missing on server');
      return new Response(
        JSON.stringify({ error: 'PayPal credentials are not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiBase = getPayPalApiBase();
    const accessToken = await getPayPalAccessToken(clientId, clientSecret, apiBase);

    const tokenRes = await fetch(`${apiBase}/v1/identity/generate-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept-Language': 'en_US',
        'Content-Type': 'application/json',
      },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.warn('PayPal generate-token response:', tokenRes.status, errText);
      return new Response(
        JSON.stringify({ error: `PayPal client token generation failed (${tokenRes.status})`, details: errText }),
        { status: tokenRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenRes.json();
    return new Response(
      JSON.stringify({
        clientToken: tokenData.client_token,
        expiresIn: tokenData.expires_in,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error generating PayPal client token:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Client token generation error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
