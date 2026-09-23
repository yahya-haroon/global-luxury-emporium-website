import Stripe from 'npm:stripe@14.19.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const OWNER_EMAIL = 'globalluxuryemporium@gmail.com';

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!stripeKey || !webhookSecret) {
    return new Response('Stripe webhook secrets not configured', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const paymentIntentId = paymentIntent.id;

    console.log(`PaymentIntent succeeded: ${paymentIntentId}`);

    // 1. Update order status to 'paid'
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntentId)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error('Error updating order to paid:', updateErr);
    }

    const order = updatedOrder || {
      product_name: paymentIntent.metadata?.product_name || 'Bespoke Leather Jacket',
      size: paymentIntent.metadata?.size || 'Standard',
      product_price: paymentIntent.metadata?.total_amount || (paymentIntent.amount / 100),
      total_amount: (paymentIntent.amount / 100),
      currency: '£',
      customer_name: paymentIntent.metadata?.customer_name || 'Valued Customer',
      email: paymentIntent.receipt_email || '',
      delivery_zone: paymentIntent.metadata?.delivery_zone || 'Standard',
      delivery_price: 0,
      personalisation_text: '',
      personalisation_fee: 0,
      requirements_text: '',
      requirements_fee: 0,
      address: { line1: '', city: '', postal_code: '', country: '' },
    };

    // 2. Send itemised confirmation and notification emails via Resend
    if (resendApiKey) {
      const emailHtml = generateItemisedEmailHtml(order);

      // Customer confirmation
      if (order.email) {
        await sendResendEmail({
          apiKey: resendApiKey,
          to: order.email,
          subject: `Order Confirmation — Global Luxury Emporium Ltd`,
          html: emailHtml,
        });
      }

      // Owner notification
      await sendResendEmail({
        apiKey: resendApiKey,
        to: OWNER_EMAIL,
        subject: `New Paid Order: ${order.product_name} (£${Number(order.total_amount).toFixed(2)})`,
        html: emailHtml,
      });
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`PaymentIntent failed: ${paymentIntent.id}`);

    await supabase
      .from('orders')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

function generateItemisedEmailHtml(order: any): string {
  const currency = order.currency || '£';
  const address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});

  let breakdownRows = `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #DDD5C4;"><strong>${order.product_name} (${order.size})</strong></td>
      <td style="padding: 10px 0; border-bottom: 1px solid #DDD5C4; text-align: right;">${currency}${Number(order.product_price).toFixed(2)}</td>
    </tr>
  `;

  if (order.personalisation_text && (Number(order.personalisation_fee) > 0 || order.personalisation_text.trim())) {
    breakdownRows += `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #DDD5C4;">Personalisation: "${order.personalisation_text}"</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #DDD5C4; text-align: right;">${Number(order.personalisation_fee) > 0 ? `${currency}${Number(order.personalisation_fee).toFixed(2)}` : 'Included'}</td>
      </tr>
    `;
  }

  if (order.requirements_text && (Number(order.requirements_fee) > 0 || order.requirements_text.trim())) {
    breakdownRows += `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #DDD5C4;">Additional requirements: "${order.requirements_text}"</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #DDD5C4; text-align: right;">${Number(order.requirements_fee) > 0 ? `${currency}${Number(order.requirements_fee).toFixed(2)}` : 'Included'}</td>
      </tr>
    `;
  }

  breakdownRows += `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #DDD5C4;">Delivery (${order.delivery_zone})</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #DDD5C4; text-align: right;">${Number(order.delivery_price) > 0 ? `${currency}${Number(order.delivery_price).toFixed(2)}` : 'Free'}</td>
    </tr>
    <tr>
      <td style="padding: 14px 0; font-size: 18px; font-weight: bold; color: #141210;">Total Paid</td>
      <td style="padding: 14px 0; font-size: 18px; font-weight: bold; color: #9A7628; text-align: right;">${currency}${Number(order.total_amount).toFixed(2)}</td>
    </tr>
  `;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F7F3EA; padding: 36px; border: 1px solid #DDD5C4;">
      <h1 style="font-family: Georgia, serif; font-size: 26px; color: #141210; margin-top: 0;">Global Luxury Emporium Ltd</h1>
      <p style="color: #6D6558; font-size: 14px; margin-bottom: 24px;">Thank you for your order, ${order.customer_name}. Your jacket has been received and scheduled for handcrafted finishing in our dedicated factory.</p>

      <div style="background: #ffffff; padding: 24px; border: 1px solid #DDD5C4; margin-bottom: 24px;">
        <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.14em; color: #9A7628;">Itemised Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #141210;">
          <tbody>
            ${breakdownRows}
          </tbody>
        </table>
      </div>

      <div style="background: #ffffff; padding: 24px; border: 1px solid #DDD5C4; font-size: 14px; color: #141210;">
        <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.14em; color: #9A7628;">Delivery Address</h3>
        <p style="margin: 4px 0;"><strong>${order.customer_name}</strong></p>
        <p style="margin: 4px 0;">${address.line1 || ''}</p>
        <p style="margin: 4px 0;">${address.city || ''} ${address.postal_code || ''}</p>
        <p style="margin: 4px 0;">${address.country || ''}</p>
      </div>

      <p style="font-size: 12px; color: #6D6558; margin-top: 32px; text-align: center;">
        Global Luxury Emporium Ltd &bull; London, United Kingdom &bull; Worldwide Delivery
      </p>
    </div>
  `;
}

async function sendResendEmail({
  apiKey,
  to,
  subject,
  html,
}: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Global Luxury Emporium <orders@globalluxuryemporium.com>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Resend email error to ${to}:`, errText);
    }
  } catch (err) {
    console.error('Failed to dispatch email via Resend:', err);
  }
}
