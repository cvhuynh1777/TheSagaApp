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
