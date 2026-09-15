// Password-gated write access for the admin panel (order status changes,
// deleting a message, marking a loyalty reward redeemed, ...). Same
// ADMIN_PASSWORD check as admin-data.js; uses the service key so it works
// with no anon policies on orders/customers/messages at all.
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ALLOWED_TABLES = new Set(["orders", "customers", "messages"]);

const REST_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function updateRow(table, id, changes) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: REST_HEADERS,
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw new Error(`update ${table} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function deleteRow(table, id) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: REST_HEADERS,
  });
  if (!res.ok) throw new Error(`delete ${table} failed: ${res.status} ${await res.text()}`);
  return { ok: true };
}

// Mirrors the old client-side db.upsertCustomer logic (find-by-phone, then
// insert or patch), just running server-side now.
async function upsertCustomer({ phone, name, addShirts = 0, redeem = false }) {
  const clean = String(phone || "").replace(/\D/g, "");
  const res = await fetch(`${SUPA_URL}/rest/v1/customers?phone=eq.${clean}`, { headers: REST_HEADERS });
  const existing = await res.json();

  if (Array.isArray(existing) && existing.length > 0) {
    const c = existing[0];
    const newTotal = (c.total_shirts || 0) + addShirts;
    return updateRow("customers", c.id, {
      name: name || c.name,
      total_shirts: newTotal,
      earned_rewards: Math.floor(newTotal / 10),
      redeemed_rewards: redeem ? (c.redeemed_rewards || 0) + 1 : (c.redeemed_rewards || 0),
    });
  }

  const insRes = await fetch(`${SUPA_URL}/rest/v1/customers`, {
    method: "POST",
    headers: REST_HEADERS,
    body: JSON.stringify({
      phone: clean,
      name: name || "Customer",
      total_shirts: addShirts,
      earned_rewards: Math.floor(addShirts / 10),
      redeemed_rewards: 0,
      since: new Date().toLocaleDateString(),
    }),
  });
  if (!insRes.ok) throw new Error(`insert customers failed: ${insRes.status} ${await insRes.text()}`);
  const data = await insRes.json();
  return Array.isArray(data) ? data[0] : data;
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

  const { table, op, id, changes } = body;
  if (!ALLOWED_TABLES.has(table)) {
    return { statusCode: 400, body: JSON.stringify({ error: `Unknown table "${table}"` }) };
  }

  try {
    let result;
    if (op === "update") {
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: "id is required for update" }) };
      result = await updateRow(table, id, changes || {});
    } else if (op === "delete") {
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: "id is required for delete" }) };
      result = await deleteRow(table, id);
    } else if (op === "upsertCustomer" && table === "customers") {
      result = await upsertCustomer(changes || {});
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: `Unsupported op "${op}" for table "${table}"` }) };
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
