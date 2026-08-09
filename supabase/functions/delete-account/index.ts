import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});

// A subscription is still billable in any of these states.
const LIVE_SUB_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'paused'];

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization') ?? '';

    // Get caller's user ID
    const meRes = await fetch(`${url}/auth/v1/user`, {
      headers: { 'Authorization': auth, 'apikey': key },
    });
    if (!meRes.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors() });
    const me = await meRes.json();
    const userId = me.id;
    if (!userId) return new Response(JSON.stringify({ error: 'No user id' }), { status: 401, headers: cors() });

    // Cancel any live Stripe subscription BEFORE touching the account.
    // Order matters: deleting first would strand a paying customer — no login,
    // no billing-portal access, and no record on our side — while Stripe kept
    // charging them every month. If cancellation fails we abort the whole
    // deletion rather than risk that; the user can retry or contact support.
    // Cancels immediately (not at period end) because the account is going
    // away right now, so they can't use what they'd be paying for.
    const email = me.email;
    if (email && !email.endsWith('@deleted.invalid')) {
      try {
        const customers = await stripe.customers.list({ email, limit: 10 });
        for (const customer of customers.data) {
          const subs = await stripe.subscriptions.list({
            customer: customer.id, status: 'all', limit: 100,
          });
          for (const sub of subs.data) {
            if (LIVE_SUB_STATUSES.includes(sub.status)) {
              await stripe.subscriptions.cancel(sub.id);
            }
          }
        }
      } catch (e) {
        console.error('delete-account: Stripe cancellation failed, aborting deletion', e);
        return new Response(JSON.stringify({
          error: 'Could not cancel your subscription, so nothing was deleted. Please try again, or email christina.v.huynh1@gmail.com for help.',
        }), { status: 502, headers: { ...cors(), 'Content-Type': 'application/json' } });
      }
    }

    // Delete all user data
    await fetch(`${url}/rest/v1/saves?user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${key}`, 'apikey': key },
    });
    await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${key}`, 'apikey': key },
    });

    // Anonymize the auth record so the email is freed up
    const ghost = `deleted_${userId}@deleted.invalid`;
    await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${key}`, 'apikey': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ghost, ban_duration: 'none' }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors(), 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500,
      headers: { ...cors(), 'Content-Type': 'application/json' },
    });
  }
});
