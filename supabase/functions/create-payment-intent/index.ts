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
      items, // optional CartItem[] for multi-product checkout
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

    const hasMultiItems = Array.isArray(items) && items.length > 0;

    if (!hasMultiItems && !productId) {
      return new Response(
        JSON.stringify({ error: 'Missing product or cart items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customerName || !email || !address?.line1 || !address?.city || !address?.postal_code || !address?.country) {
      return new Response(
        JSON.stringify({ error: 'Missing required customer name, email, or delivery address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch store settings (fees, currency, and delivery zones)
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

    // Flat delivery price charged ONCE for the entire order
    const deliveryPrice = Number(matchedZone.price || 0);
    const deliveryZoneName = matchedZone.name || 'Standard Delivery';

    let totalAmount = 0;
    let orderRecord: any = null;
    let description = '';

    if (hasMultiItems) {
      // 2a. Multi-product cart checkout
      const productIds = Array.from(new Set(items.map((i: any) => String(i.productId))));
      const { data: dbProducts, error: dbProdErr } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (dbProdErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to look up cart products' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const productMap = new Map((dbProducts || []).map((p: any) => [String(p.id), p]));

      let itemsSubtotal = 0;
      let totalPersonalisationFee = 0;
      let totalRequirementsFee = 0;

      const processedItems = items.map((item: any) => {
        const dbProd = productMap.get(String(item.productId));
        const unitPrice = dbProd ? Number(dbProd.price) : Number(item.price || 0);
        const quantity = Math.max(1, Number(item.quantity || 1));

        let pFee = 0;
        const hasP = Boolean(item.personalisationText && item.personalisationText.trim().length > 0);
        if (settings.personalisation_enabled && settings.personalisation_charge && Number(settings.personalisation_price) > 0 && hasP) {
          pFee = Number(settings.personalisation_price);
        }

        let rFee = 0;
        const hasR = Boolean(item.requirementsText && item.requirementsText.trim().length > 0);
        if (settings.requirements_enabled && settings.requirements_charge && Number(settings.requirements_price) > 0 && hasR) {
          rFee = Number(settings.requirements_price);
        }

        itemsSubtotal += unitPrice * quantity;
        totalPersonalisationFee += pFee * quantity;
        totalRequirementsFee += rFee * quantity;

        return {
          productId: String(item.productId),
          productName: dbProd?.name || item.productName || 'Bespoke Leather Jacket',
          price: unitPrice,
          image: item.image || (dbProd?.images?.[0] || ''),
          size: item.size || 'One size',
          selectedOptions: item.selectedOptions || {},
          personalisationText: item.personalisationText ? item.personalisationText.trim() : '',
          personalisationFee: pFee,
          requirementsText: item.requirementsText ? item.requirementsText.trim() : '',
          requirementsFee: rFee,
          quantity,
        };
      });

      // Delivery is flat — charged ONCE regardless of item count
      totalAmount = Number((itemsSubtotal + totalPersonalisationFee + totalRequirementsFee + deliveryPrice).toFixed(2));

      const firstItem = processedItems[0];
      const summaryName = processedItems.length === 1
        ? `${firstItem.productName} (x${firstItem.quantity})`
        : `${processedItems.reduce((acc: number, i: any) => acc + i.quantity, 0)} items (${processedItems.map((i: any) => i.productName).slice(0, 2).join(', ')}${processedItems.length > 2 ? '...' : ''})`;

      description = `Order: ${summaryName}`;

      orderRecord = {
        product_id: firstItem.productId,
        product_name: summaryName,
        size: processedItems.map((i: any) => `${i.size} (x${i.quantity})`).join(', '),
        selected_options: firstItem.selectedOptions,
        personalisation_text: processedItems.map((i: any) => i.personalisationText).filter(Boolean).join(' | '),
        personalisation_fee: totalPersonalisationFee,
        requirements_text: processedItems.map((i: any) => i.requirementsText).filter(Boolean).join(' | '),
        requirements_fee: totalRequirementsFee,
        delivery_zone: deliveryZoneName,
        delivery_price: deliveryPrice,
        product_price: itemsSubtotal,
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
        items: processedItems,
        status: 'pending',
      };
    } else {
      // 2b. Legacy single-product checkout
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

      const productPrice = Number(product.price);

      let personalisationFee = 0;
      const hasPersonalisationText = Boolean(personalisationText && personalisationText.trim().length > 0);
      if (settings.personalisation_enabled && settings.personalisation_charge && Number(settings.personalisation_price) > 0 && hasPersonalisationText) {
        personalisationFee = Number(settings.personalisation_price);
      }

      let requirementsFee = 0;
      const hasRequirementsText = Boolean(requirementsText && requirementsText.trim().length > 0);
      if (settings.requirements_enabled && settings.requirements_charge && Number(settings.requirements_price) > 0 && hasRequirementsText) {
        requirementsFee = Number(settings.requirements_price);
      }

      totalAmount = Number((productPrice + personalisationFee + requirementsFee + deliveryPrice).toFixed(2));
      description = `Order: ${product.name} (${size})`;

      const singleCartItem = {
        productId: String(product.id),
        productName: product.name,
        price: productPrice,
        image: product.images?.[0] || '',
        size: size || 'One size',
        selectedOptions,
        personalisationText: personalisationText ? personalisationText.trim() : '',
        personalisationFee,
        requirementsText: requirementsText ? requirementsText.trim() : '',
        requirementsFee,
        quantity: 1,
      };

      orderRecord = {
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
        items: [singleCartItem],
        status: 'pending',
      };
    }

    const amountInPence = Math.round(totalAmount * 100);

    // 3. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      receipt_email: email,
      description,
      metadata: {
        customer_name: customerName,
        delivery_zone: deliveryZoneName,
        total_amount: totalAmount.toFixed(2),
      },
    });

    // 4. Record order in 'orders' table as 'pending'
    orderRecord.stripe_payment_intent_id = paymentIntent.id;
    orderRecord.created_at = new Date().toISOString();
    orderRecord.updated_at = new Date().toISOString();

    const { data: orderData, error: orderInsertErr } = await supabase
      .from('orders')
      .insert([orderRecord])
      .select()
      .single();

    if (orderInsertErr) {
      console.error('Error inserting order row:', JSON.stringify(orderInsertErr));
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
