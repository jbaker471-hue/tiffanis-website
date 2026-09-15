// Public, no-password count of unread contact messages — just a number, no
// names/phones/content — so the nav bar can still show a "new message"
// badge before the admin panel is unlocked, without exposing any PII.
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async function handler() {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/messages?read=eq.false&select=id`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: "count=exact",
      },
    });
    if (!res.ok) return { statusCode: 200, body: JSON.stringify({ count: 0 }) };
    const rows = await res.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: Array.isArray(rows) ? rows.length : 0 }),
    };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ count: 0 }) };
  }
};
