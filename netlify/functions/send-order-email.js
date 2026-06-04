// Send order notification email to Tiffani via Resend (resend.com - free tier)
// Set RESEND_API_KEY and NOTIFY_EMAIL in Netlify environment variables to activate

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL  = process.env.NOTIFY_EMAIL;

  // Silently skip if not configured yet
  if (!RESEND_API_KEY || !NOTIFY_EMAIL) {
    console.log("Email notification skipped — RESEND_API_KEY or NOTIFY_EMAIL not set");
    return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
  }

  try {
    const order = JSON.parse(event.body);
    const items = (() => {
      try { return typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []); }
      catch { return []; }
    })();

    const itemRows = items.map(i =>
      `<tr style="border-bottom:1px solid #f0ede8;">
        <td style="padding:8px 12px;">${i.design || "—"}</td>
        <td style="padding:8px 12px;">${i.color || "—"}</td>
        <td style="padding:8px 12px;">${i.size || "—"}</td>
        <td style="padding:8px 12px;text-align:center;">${i.qty || 1}</td>
        <td style="padding:8px 12px;">${i.brand || order.brand || "—"}</td>
        <td style="padding:8px 12px;">$${i.price || "—"}</td>
      </tr>`
    ).join("");

    const total = order.amount_paid
      ? `$${Number(order.amount_paid).toFixed(2)}`
      : items.reduce((s,i)=>s+(Number(i.price||0)*Number(i.qty||1)),0) + (order.delivery==="Ship"?8:0) + " (est.)";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: 'Trebuchet MS', sans-serif; background:#F7F2EA; margin:0; padding:20px; }
    .card { background:#fff; border-radius:16px; max-width:600px; margin:0 auto; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
    .header { background:linear-gradient(135deg,#2E5C3E,#4A7C59); padding:24px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:22px; }
    .header p { color:rgba(255,255,255,0.8); margin:4px 0 0; font-size:13px; }
    .body { padding:24px; }
    .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0ede8; font-size:14px; }
    .row .label { color:#888; }
    .row .value { font-weight:600; color:#2C2218; }
    table { width:100%; border-collapse:collapse; margin:16px 0; font-size:13px; }
    th { background:#EBF3ED; padding:8px 12px; text-align:left; color:#4A7C59; font-size:11px; text-transform:uppercase; letter-spacing:1px; }
    .total-box { background:linear-gradient(135deg,#2E5C3E,#4A7C59); border-radius:12px; padding:16px; margin:16px 0; color:#fff; display:flex; justify-content:space-between; align-items:center; }
    .btn { display:block; text-align:center; background:linear-gradient(135deg,#2E5C3E,#4A7C59); color:#fff; text-decoration:none; padding:14px 24px; border-radius:12px; font-weight:700; font-size:15px; margin:20px 0 0; }
    .paid { color:#27AE60; font-weight:700; }
    .footer { text-align:center; padding:16px; color:#aaa; font-size:11px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🎉 New Order Received!</h1>
      <p>${new Date().toLocaleString("en-US", {dateStyle:"full", timeStyle:"short"})}</p>
    </div>
    <div class="body">
      <div class="row"><span class="label">Customer</span><span class="value">${order.customer_name || "—"}</span></div>
      <div class="row"><span class="label">Phone</span><span class="value">${order.phone || "—"}</span></div>
      <div class="row"><span class="label">Delivery</span><span class="value">${order.delivery || "Pickup"}</span></div>
      ${order.shipping_address ? `<div class="row"><span class="label">Ship To</span><span class="value">${order.shipping_address}</span></div>` : ""}
      <div class="row"><span class="label">Brand</span><span class="value">${order.brand || "—"}</span></div>
      <div class="row"><span class="label">Shirt Style</span><span class="value">${order.shirt_style === "pocket" ? "With Pocket" : "No Pocket"}</span></div>
      <div class="row"><span class="label">Placement</span><span class="value">${order.placement || "—"}</span></div>
      <div class="row"><span class="label">Payment</span><span class="value ${order.paid ? "paid" : ""}">${order.paid ? "✅ Paid via Stripe" : "⏳ " + (order.payment_method || "Pending")}</span></div>
      ${order.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${order.notes}</span></div>` : ""}

      <table>
        <thead>
          <tr>
            <th>Design</th><th>Color</th><th>Size</th><th>Qty</th><th>Brand</th><th>Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="total-box">
        <span style="font-size:15px;">Order Total</span>
        <span style="font-size:22px;font-weight:700;">${total}</span>
      </div>

      <a href="${process.env.URL || 'https://stately-bubblegum-c0df35.netlify.app'}" class="btn">
        View in Admin Panel →
      </a>
    </div>
    <div class="footer">To A "T" Boutique · New Market, AL · Powered by your custom order system</div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "To A T Boutique <orders@resend.dev>",
        to: [NOTIFY_EMAIL],
        subject: `🎉 New Order — ${order.customer_name || "Customer"} · ${total}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return { statusCode: 500, body: JSON.stringify({ error: err }) };
    }

    console.log("Order notification sent to", NOTIFY_EMAIL);
    return { statusCode: 200, body: JSON.stringify({ sent: true }) };

  } catch (err) {
    console.error("Email function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
