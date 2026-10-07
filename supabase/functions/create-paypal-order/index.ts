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
      console.error('PayPal secrets missing in environment');
      return new Response(
        JSON.stringify({ error: 'PayPal credentials are not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    const {
      items,
      productId,
      size,
      selectedOptions = {},
      personalisationText = '',
      requirementsText = '',
      deliveryZoneId,
      customerName,
      email,
      address,
      fundingSource = 'paypal', // 'paypal', 'paylater', or 'paypal_card'
    } = body;

    const hasMultiItems = Array.isArray(items) && items.length > 0;
    if (!hasMultiItems && !productId) {
      return new Response(
        JSON.stringify({ error: 'Missing product or cart items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customerName || !email || !address?.line1 || !address?.city || !address?.country) {
      return new Response(
        JSON.stringify({ error: 'Missing customer details or delivery address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch store settings
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

    // Evaluate delivery zones
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

    // Check returning / repeat customer status to grant complimentary delivery
    let isRepeatCustomer = false;
    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      const { count: priorOrdersCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .ilike('email', cleanEmail)
        .in('status', ['paid', 'processing', 'shipped', 'delivered', 'completed']);

      if ((priorOrdersCount || 0) > 0) {
        isRepeatCustomer = true;
      }
    }

    const baseDeliveryPrice = Number(matchedZone.price || 0);
    const deliveryPrice = isRepeatCustomer ? 0 : baseDeliveryPrice;
    const deliveryZoneName = isRepeatCustomer && baseDeliveryPrice > 0
      ? `${matchedZone.name || 'Standard Delivery'} (Repeat Customer Free Delivery)`
      : (matchedZone.name || 'Standard Delivery');

    // 2. Fetch active sales for server-side discount calculation
    const nowIso = new Date().toISOString();
    const { data: dbSales } = await supabase
      .from('sales')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', nowIso)
      .gte('ends_at', nowIso);

    const activeSales = dbSales || [];

    const resolveSalePrice = (product: any): { salePrice: number; discount: number; saleName?: string } => {
      if (!product || !activeSales.length) {
        return { salePrice: Number(product?.price || 0), discount: 0 };
      }
      const prodId = String(product.id);
      const prodCat = (product.category || '').trim().toLowerCase();

      const eligible = activeSales.filter((s: any) => {
        if (s.scope === 'all') return true;
        if (s.scope === 'category') {
          const sCat = (s.category || '').trim().toLowerCase();
          if (sCat === prodCat) return true;
          if (sCat === 'men' && prodCat.includes('men') && !prodCat.includes('women')) return true;
          if (sCat === 'women' && (prodCat.includes('women') || prodCat.includes('ladies'))) return true;
          return false;
        }
        if (s.scope === 'products') {
          return Array.isArray(s.product_ids) && s.product_ids.some((id: any) => String(id).trim() === prodId);
        }
        return false;
      });

      if (!eligible.length) {
        return { salePrice: Number(product.price || 0), discount: 0 };
      }

      eligible.sort((a: any, b: any) => Number(b.discount_percentage) - Number(a.discount_percentage));
      const best = eligible[0];
      const discount = Number(best.discount_percentage);
      const orig = Number(product.price || 0);
      const rawSale = orig * (1 - discount / 100);
      const salePrice = Math.round(rawSale * 100) / 100;
      return { salePrice, discount, saleName: best.name };
    };

    let totalAmount = 0;
    let itemsSubtotal = 0;
    let totalPersonalisationFee = 0;
    let totalRequirementsFee = 0;
    let processedItems: any[] = [];
    let summaryName = '';

    if (hasMultiItems) {
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

      processedItems = items.map((item: any) => {
        const dbProd = productMap.get(String(item.productId));
        const { salePrice, discount, saleName } = resolveSalePrice(dbProd);
        const unitPrice = dbProd ? salePrice : Number(item.price || 0);
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
          productName: dbProd?.name || item.productName || 'Bespoke Leather Piece',
          price: unitPrice,
          originalPrice: dbProd ? Number(dbProd.price) : unitPrice,
          discountPercentage: discount,
          saleName,
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

      totalAmount = Number((itemsSubtotal + totalPersonalisationFee + totalRequirementsFee + deliveryPrice).toFixed(2));
      const firstItem = processedItems[0];
      summaryName = processedItems.length === 1
        ? `${firstItem.productName} (x${firstItem.quantity})`
        : `${processedItems.reduce((acc: number, i: any) => acc + i.quantity, 0)} items (${processedItems.map((i: any) => i.productName).slice(0, 2).join(', ')}${processedItems.length > 2 ? '...' : ''})`;
    } else {
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

      const { salePrice, discount, saleName } = resolveSalePrice(product);
      const unitPrice = salePrice;

      let pFee = 0;
      const hasP = Boolean(personalisationText && personalisationText.trim().length > 0);
      if (settings.personalisation_enabled && settings.personalisation_charge && Number(settings.personalisation_price) > 0 && hasP) {
        pFee = Number(settings.personalisation_price);
      }

      let rFee = 0;
      const hasR = Boolean(requirementsText && requirementsText.trim().length > 0);
      if (settings.requirements_enabled && settings.requirements_charge && Number(settings.requirements_price) > 0 && hasR) {
        rFee = Number(settings.requirements_price);
      }

      itemsSubtotal = unitPrice;
      totalPersonalisationFee = pFee;
      totalRequirementsFee = rFee;
      totalAmount = Number((unitPrice + pFee + rFee + deliveryPrice).toFixed(2));

      processedItems = [
        {
          productId: String(product.id),
          productName: product.name,
          price: unitPrice,
          originalPrice: Number(product.price),
          discountPercentage: discount,
          saleName,
          image: product.images?.[0] || '',
          size: size || 'One size',
          selectedOptions,
          personalisationText: personalisationText ? personalisationText.trim() : '',
          personalisationFee: pFee,
          requirementsText: requirementsText ? requirementsText.trim() : '',
          requirementsFee: rFee,
          quantity: 1,
        },
      ];
      summaryName = `${product.name} (${size || 'Standard'})`;
    }

    const orderId = crypto.randomUUID();
    const orderRef = orderId.slice(0, 8).toUpperCase();
    const apiBase = getPayPalApiBase();
    const accessToken = await getPayPalAccessToken(clientId, clientSecret, apiBase);

    // 3. Construct PayPal Order payload
    const countryCode = (address.country === 'United Kingdom' || address.country === 'UK')
      ? 'GB'
      : (address.country === 'United States' || address.country === 'USA')
      ? 'US'
      : 'GB';

    // Item line breakdown for PayPal
    const paypalItems = processedItems.map((item: any) => ({
      name: (item.productName || 'Bespoke Item').slice(0, 127),
      quantity: String(item.quantity || 1),
      unit_amount: {
        currency_code: 'GBP',
        value: Number(item.price + (item.personalisationFee || 0) + (item.requirementsFee || 0)).toFixed(2),
      },
      category: 'PHYSICAL_GOODS',
    }));

    const computedItemsSum = paypalItems.reduce(
      (sum: number, it: any) => sum + Number(it.unit_amount.value) * Number(it.quantity),
      0
    );

    const paypalOrderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orderId,
          custom_id: `#${orderRef}`,
          invoice_id: `GLE-${orderRef}`,
          description: `Global Luxury Emporium Order #${orderRef}: ${summaryName}`.slice(0, 127),
          amount: {
            currency_code: 'GBP',
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'GBP',
                value: computedItemsSum.toFixed(2),
              },
              shipping: {
                currency_code: 'GBP',
                value: deliveryPrice.toFixed(2),
              },
            },
          },
          items: paypalItems,
          shipping: {
            name: {
              full_name: customerName.trim().slice(0, 300),
            },
            address: {
              address_line_1: (address.line1 || '').trim().slice(0, 300),
              admin_area_2: (address.city || '').trim().slice(0, 120),
              postal_code: (address.postal_code || '').trim().slice(0, 60),
              country_code: countryCode,
            },
          },
        },
      ],
      application_context: {
        brand_name: 'Global Luxury Emporium',
        locale: 'en-GB',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'SET_PROVIDED_ADDRESS',
        user_action: 'PAY_NOW',
      },
    };

    // For PayPal Advanced Card Payments, configure payment_source with SCA_WHEN_REQUIRED
    const isCardFunding = fundingSource === 'paypal_card' || fundingSource === 'card';
    if (isCardFunding) {
      delete (paypalOrderPayload as any).application_context;
      (paypalOrderPayload as any).payment_source = {
        card: {
          attributes: {
            verification: {
              method: 'SCA_WHEN_REQUIRED',
            },
          },
          experience_context: {
            brand_name: 'Global Luxury Emporium',
            locale: 'en-GB',
            shipping_preference: 'SET_PROVIDED_ADDRESS',
            user_action: 'PAY_NOW',
          },
        },
      };
    }

    const ppRes = await fetch(`${apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': orderId,
      },
      body: JSON.stringify(paypalOrderPayload),
    });

    if (!ppRes.ok) {
      const ppErrorText = await ppRes.text();
      console.error('PayPal Order Creation Failed:', ppRes.status, ppErrorText);
      throw new Error(`PayPal order creation rejected (${ppRes.status}): ${ppErrorText}`);
    }

    const paypalOrder = await ppRes.json();
    if (!paypalOrder.id) {
      throw new Error('PayPal did not return an order ID');
    }

    // 4. Record pending order in Supabase
    const firstItem = processedItems[0];
    const orderRecord = {
      id: orderId,
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
      currency: '£',
      customer_name: customerName.trim(),
      email: email.trim(),
      address: {
        line1: address.line1.trim(),
        city: address.city.trim(),
        postal_code: (address.postal_code || 'N/A').trim(),
        country: address.country.trim(),
      },
      items: processedItems,
      status: 'pending',
      payment_method: fundingSource === 'paypal_card' || fundingSource === 'card'
        ? 'paypal_card'
        : fundingSource === 'paylater'
        ? 'paylater'
        : 'paypal',
      payment_status: 'pending',
      paypal_order_id: paypalOrder.id,
      stripe_payment_intent_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase.from('orders').insert([orderRecord]);
    if (insertErr) {
      console.error('Supabase order insert error:', insertErr);
    }

    return new Response(
      JSON.stringify({
        paypalOrderId: paypalOrder.id,
        orderId,
        amount: totalAmount,
        currency: 'GBP',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error in create-paypal-order:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'PayPal order creation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
