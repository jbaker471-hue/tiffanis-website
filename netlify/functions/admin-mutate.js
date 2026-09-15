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

// Friendly copy for each status — mirrors the STEP_MAP text customers see
// on the "Track Your Order" page, so the email and the site agree.
const STATUS_COPY = {
  "In Progress": "Your order is being made — it's in production!",
  "Ready": "Your order is ready! Time to arrange pickup, or it'll ship soon.",
  "Shipped": "Your order is on its way! 📦",
  "Picked Up": "Order picked up — enjoy your shirts!",
  "Complete": "Order complete! Thanks for shopping with us 💚",
};

async function notifyCustomerOfStatus(order) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const message = STATUS_COPY[order.status];
  if (!RESEND_API_KEY || !order.email || !message) return; // nothing to send, or status isn't a customer-facing milestone

  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://stately-bubblegum-c0df35.netlify.app";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{font-family:'Trebuchet MS',sans-serif;background:#F7F2EA;margin:0;padding:20px}
    .card{background:#fff;border-radius:16px;max-width:480px;margin:0 auto;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
    .header{background:linear-gradient(135deg,#2E5C3E,#4A7C59);padding:24px;text-align:center}
    .header h1{color:#fff;margin:0;font-size:20px}
    .body{padding:24px;text-align:center}
    .status{display:inline-block;background:#EBF3ED;color:#2E5C3E;border-radius:20px;padding:6px 16px;font-weight:700;font-size:13px;margin-bottom:14px}
    .msg{font-size:15px;color:#2C2218;line-height:1.5;margin-bottom:20px}
    .btn{display:inline-block;background:linear-gradient(135deg,#2E5C3E,#4A7C59);color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:700;font-size:14px}
    .footer{text-align:center;padding:16px;color:#aaa;font-size:11px}
  </style></head><body><div class="card">
    <div class="header"><h1>To A "T" Boutique</h1></div>
    <div class="body">
      <div class="status">● ${order.status}</div>
      <div class="msg">Hi ${order.customer_name || "there"}! ${message}</div>
      <a href="${siteUrl}" class="btn">Track Your Order →</a>
    </div>
    <div class="footer">New Market, AL</div>
  </div></body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "To A T Boutique <orders@resend.dev>",
        to: [order.email],
        subject: `Order update: ${order.status} — To A "T" Boutique`,
        html,
      }),
    });
    if (!res.ok) console.error("Status notification email failed:", res.status, await res.text());
  } catch (err) {
    console.error("Status notification email error:", err.message);
  }
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
      if (table === "orders" && changes && changes.status) {
        await notifyCustomerOfStatus(result);
      }
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
