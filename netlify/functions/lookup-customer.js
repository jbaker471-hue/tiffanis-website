// Public, phone-scoped read used by "Track Your Order", "Loyalty Rewards",
// and the checkout form's live reward preview. Takes a phone number and
// returns only that phone's own customer record and orders — never the
// whole table. Uses the service key server-side so this works with no
// public read access to the orders/customers tables at all.
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const phone = String(body.phone || "").replace(/\D/g, "");
  if (phone.length < 10) {
    return { statusCode: 400, body: JSON.stringify({ error: "Valid phone number required" }) };
  }

  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const [custRes, ordersRes] = await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/customers?phone=eq.${phone}`, { headers }),
      fetch(`${SUPA_URL}/rest/v1/orders?phone=eq.${phone}&order=created_at.desc`, { headers }),
    ]);
    const custRows = await custRes.json();
    const orders = await ordersRes.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: Array.isArray(custRows) && custRows.length > 0 ? custRows[0] : null,
        orders: Array.isArray(orders) ? orders : [],
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
