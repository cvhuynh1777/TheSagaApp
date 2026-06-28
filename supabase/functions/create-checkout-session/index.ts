import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!;
const APP_URL  = Deno.env.get('APP_URL')!; // e.g. https://yoursaga.vercel.app

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const { email } = await req.json();
    if (!email) return jsonError('Missing email', 400);

    // Reuse existing Stripe customer or create one
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0]
      ?? await stripe.customers.create({ email });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}?upgraded=1`,
      cancel_url:  `${APP_URL}?upgraded=0`,
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return jsonError(e.message);
  }
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
}

function jsonError(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}
