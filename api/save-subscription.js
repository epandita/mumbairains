import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, p256dh, auth, username } = req.body;

  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'Missing subscription data' });
  }

  try {
    // Upsert — update if exists, insert if new
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint, p256dh, auth, username }, { onConflict: 'endpoint' });

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
