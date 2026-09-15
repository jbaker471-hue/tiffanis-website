// Password-gated read of the full orders/customers/messages tables for the
// admin panel. The anon key has no access to these tables at all (see the
// RLS migration in supabase-setup.sql) — this function uses the service key
// and only returns data once ADMIN_PASSWORD has been verified server-side.
// Set ADMIN_PASSWORD in Netlify env vars (Site settings -> Environment
// variables). It replaces the password that used to be hardcoded in the
// client bundle, where anyone could read it straight out of the JS.
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function fetchAll(table) {
  const pageSize = 1000;
  let from = 0;
  let all = [];
  while (true) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?order=created_at.desc`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: `${from}-${from + pageSize - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!res.ok) {
      console.error(`admin-data: fetch ${table} failed`, res.status, await res.text());
      break;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return { statusCode: 500, body: JSON.stringify({ error: "ADMIN_PASSWORD is not configured on the server" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (body.password !== adminPassword) {
    return { statusCode: 401, body: JSON.stringify({ error: "Incorrect password" }) };
  }

  try {
    const [orders, customers, messages] = await Promise.all([
      fetchAll("orders"),
      fetchAll("customers"),
      fetchAll("messages"),
    ]);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders, customers, messages }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
