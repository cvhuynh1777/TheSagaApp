import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const APP_URL = Deno.env.get('APP_URL')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });

  try {
    const { email } = await req.json();
    if (!email) return jsonError('Missing email', 400);

    const existing = await stripe.customers.list({ email, limit: 1 });
    if (!existing.data.length) return jsonError('No customer found', 404);

    const session = await stripe.billingPortal.sessions.create({
      customer: existing.data[0].id,
      return_url: APP_URL,
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
