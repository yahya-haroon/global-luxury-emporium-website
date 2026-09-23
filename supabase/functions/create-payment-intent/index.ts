import Stripe from 'npm:stripe@14.19.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.json();
    const {
      productId,
      size,
      selectedOptions = {},
      personalisationText = '',
      requirementsText = '',
      deliveryZoneId,
      customerName,
      email,
      address,
    } = body;

    if (!productId || !customerName || !email || !address?.line1 || !address?.city || !address?.postal_code || !address?.country) {
      return new Response(
        JSON.stringify({ error: 'Missing required order details or delivery address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Server-side product price lookup (never trust client amounts)
    const { data: product, error: productErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productErr || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Server-side settings lookup (fees and delivery zones)
    const { data: settings, error: settingsErr } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (settingsErr || !settings) {
      return new Response(
        JSON.stringify({ error: 'Store settings not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const productPrice = Number(product.price);

    // Evaluate personalisation fee independently
    let personalisationFee = 0;
    const hasPersonalisationText = Boolean(personalisationText && personalisationText.trim().length > 0);
    if (
      settings.personalisation_enabled &&
      settings.personalisation_charge &&
      Number(settings.personalisation_price) > 0 &&
      hasPersonalisationText
    ) {
      personalisationFee = Number(settings.personalisation_price);
    }

    // Evaluate requirements fee independently
    let requirementsFee = 0;
    const hasRequirementsText = Boolean(requirementsText && requirementsText.trim().length > 0);
    if (
      settings.requirements_enabled &&
      settings.requirements_charge &&
      Number(settings.requirements_price) > 0 &&
      hasRequirementsText
    ) {
      requirementsFee = Number(settings.requirements_price);
    }

    // Evaluate delivery zone and price independently
    let deliveryZones = settings.delivery_zones || [];
    if (typeof deliveryZones === 'string') {
      try {
        deliveryZones = JSON.parse(deliveryZones);
      } catch {
        deliveryZones = [];
      }
    }

    const matchedZone = deliveryZones.find(
      (z: any) => z.id === deliveryZoneId || z.name?.toLowerCase() === String(deliveryZoneId).toLowerCase()
    ) || deliveryZones[0] || { name: 'Standard Delivery', price: 0 };

    const deliveryPrice = Number(matchedZone.price || 0);
    const deliveryZoneName = matchedZone.name || 'Standard Delivery';

    // Total amount in GBP
    const totalAmount = Number((productPrice + personalisationFee + requirementsFee + deliveryPrice).toFixed(2));
    const amountInPence = Math.round(totalAmount * 100);

    // 3. Create Stripe PaymentIntent (no Stripe-side shipping/contact collection)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      receipt_email: email,
      description: `Order: ${product.name} (${size})`,
      metadata: {
        product_id: product.id,
        product_name: product.name,
        size: size || 'One size',
        customer_name: customerName,
        delivery_zone: deliveryZoneName,
        total_amount: totalAmount.toFixed(2),
      },
    });

    // 4. Record order in 'orders' table as 'pending'
    const orderRecord = {
      product_id: String(product.id),
      product_name: product.name,
      size: size || 'One size',
      selected_options: selectedOptions,
      personalisation_text: personalisationText ? personalisationText.trim() : '',
      personalisation_fee: personalisationFee,
      requirements_text: requirementsText ? requirementsText.trim() : '',
      requirements_fee: requirementsFee,
      delivery_zone: deliveryZoneName,
      delivery_price: deliveryPrice,
      product_price: productPrice,
      total_amount: totalAmount,
      currency: settings.currency || '£',
      customer_name: customerName.trim(),
      email: email.trim(),
      address: {
        line1: address.line1.trim(),
        city: address.city.trim(),
        postal_code: address.postal_code.trim(),
        country: address.country.trim(),
      },
      status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: orderData, error: orderInsertErr } = await supabase
      .from('orders')
      .insert([orderRecord])
      .select()
      .single();

    if (orderInsertErr) {
      console.error('Error inserting order row:', JSON.stringify(orderInsertErr));
      // Cancel the PaymentIntent so the customer is not charged for an un-tracked order
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
      return new Response(
        JSON.stringify({ error: `Order record could not be saved: ${orderInsertErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        orderId: orderData?.id || paymentIntent.id,
        amount: totalAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error in create-payment-intent:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Payment intent creation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
