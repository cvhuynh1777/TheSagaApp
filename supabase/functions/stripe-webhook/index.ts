import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role — can write any row
);

const SUPER_USER_EMAILS = ['christina.v.huynh1@gmail.com'];

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  // Verify the webhook came from Stripe (not a random POST)
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Bad signature', { status: 400 });
  }

  // Helper: set is_premium on a user by email.
  // UPDATE only — never insert. A profiles row's `id` must reference a real
  // auth.users.id, so there's no valid row we could insert from Stripe data
  // alone. If no account matches, log it clearly instead of crashing: it
  // means this Stripe customer's email isn't tied to any Saga account yet.
  async function setPremium(email: string, value: boolean) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_premium: value })
      .eq('email', email)
      .select('id');
    if (error) {
      console.error('setPremium error:', error);
    } else if (!data || data.length === 0) {
      console.error(`setPremium: no profile found for email "${email}" — subscription changed but isn't linked to any Saga account`);
    }
  }

  // Helper: get email from a Stripe customer id
  async function getEmailFromCustomer(customerId: string): Promise<string | null> {
    const customer = await stripe.customers.retrieve(customerId);
    return (customer as Stripe.Customer).email ?? null;
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const isActive = ['active', 'trialing'].includes(sub.status);
      const email = await getEmailFromCustomer(sub.customer as string);
      if (email && !SUPER_USER_EMAILS.includes(email)) {
        await setPremium(email, isActive);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const email = await getEmailFromCustomer(sub.customer as string);
      if (email) await setPremium(email, false);
      break;
    }
    default:
      // Ignore other event types
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
