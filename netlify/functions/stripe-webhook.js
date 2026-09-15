const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const meta = session.metadata || {};

    try {
      // Parse items from metadata
      let items = [];
      try { items = JSON.parse(meta.items || "[]"); } catch {}

      // Save order to Supabase
      const order = {
        customer_name: meta.customer_name || "Unknown",
        phone: meta.phone || "",
        delivery: meta.delivery || "Pickup",
        brand: meta.brand || "",
        shirt_style: meta.shirt_style || "no-pocket",
        placement: meta.placement || "",
        notes: meta.notes || "",
        using_reward: meta.using_reward === "true",
        shipping_address: meta.shipping_address || "",
        date: new Date().toLocaleDateString(),
        status: "New",
        paid: true,
        payment_method: "Stripe",
        stripe_session_id: session.id,
        amount_paid: session.amount_total / 100,
        items: meta.items || "[]",
      };

      const res = await fetch(
        `${process.env.VITE_SUPABASE_URL}/rest/v1/orders`,
        {
          method: "POST",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(order),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("Supabase insert failed:", err);
        return { statusCode: 500, body: "DB insert failed" };
      }

      // Update loyalty points
      if (meta.phone) {
        const qty = items.reduce((s, i) => s + Number(i.qty || 1), 0);
        const phone = meta.phone.replace(/\D/g, "");

        // Check existing customer
        const custRes = await fetch(
          `${process.env.VITE_SUPABASE_URL}/rest/v1/customers?phone=eq.${phone}`,
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            },
          }
        );
        const existing = await custRes.json();

        if (existing && existing.length > 0) {
          const c = existing[0];
          const newTotal = (c.total_shirts || 0) + qty;
          await fetch(
            `${process.env.VITE_SUPABASE_URL}/rest/v1/customers?id=eq.${c.id}`,
            {
              method: "PATCH",
              headers: {
                apikey: process.env.SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                total_shirts: newTotal,
                earned_rewards: Math.floor(newTotal / 10),
                name: meta.customer_name || c.name,
              }),
            }
          );
        } else {
          await fetch(
            `${process.env.VITE_SUPABASE_URL}/rest/v1/customers`,
            {
              method: "POST",
              headers: {
                apikey: process.env.SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                phone,
                name: meta.customer_name || "Customer",
                total_shirts: qty,
                earned_rewards: Math.floor(qty / 10),
                redeemed_rewards: 0,
                since: new Date().toLocaleDateString(),
              }),
            }
          );
        }
      }

      console.log("Order saved successfully:", session.id);

      // Send email notification directly (avoid HTTP self-call which can fail)
      try {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const NOTIFY_EMAIL   = process.env.NOTIFY_EMAIL;
        if (RESEND_API_KEY && NOTIFY_EMAIL) {
          const items = (() => { try { return JSON.parse(order.items||"[]"); } catch { return []; } })();
          const total = `$${(order.amount_paid||0).toFixed(2)}`;
          const itemRows = items.map(i =>
            `<tr><td style="padding:8px 12px;">${i.design||"—"}</td><td style="padding:8px 12px;">${i.color||"—"}</td><td style="padding:8px 12px;">${i.size||"—"}</td><td style="padding:8px 12px;text-align:center;">${i.qty||1}</td><td style="padding:8px 12px;">${i.brand||order.brand||"—"}</td><td style="padding:8px 12px;">$${i.price||"—"}</td></tr>`
          ).join("");
          const siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://stately-bubblegum-c0df35.netlify.app";
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:'Trebuchet MS',sans-serif;background:#F7F2EA;margin:0;padding:20px}.card{background:#fff;border-radius:16px;max-width:600px;margin:0 auto;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}.header{background:linear-gradient(135deg,#2E5C3E,#4A7C59);padding:24px;text-align:center}.header h1{color:#fff;margin:0;font-size:22px}.body{padding:24px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ede8;font-size:14px}.label{color:#888}.value{font-weight:600;color:#2C2218}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}th{background:#EBF3ED;padding:8px 12px;text-align:left;color:#4A7C59;font-size:11px;text-transform:uppercase;letter-spacing:1px}.total-box{background:linear-gradient(135deg,#2E5C3E,#4A7C59);border-radius:12px;padding:16px;margin:16px 0;color:#fff;display:flex;justify-content:space-between;align-items:center}.btn{display:block;text-align:center;background:linear-gradient(135deg,#2E5C3E,#4A7C59);color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px;margin:20px 0 0}.paid{color:#27AE60;font-weight:700}.footer{text-align:center;padding:16px;color:#aaa;font-size:11px}</style></head><body><div class="card"><div class="header"><h1>🎉 New Order Received!</h1><p>${new Date().toLocaleString()}</p></div><div class="body"><div class="row"><span class="label">Customer</span><span class="value">${order.customer_name||"—"}</span></div><div class="row"><span class="label">Phone</span><span class="value">${order.phone||"—"}</span></div><div class="row"><span class="label">Delivery</span><span class="value">${order.delivery||"Pickup"}</span></div>${order.shipping_address?`<div class="row"><span class="label">Ship To</span><span class="value">${order.shipping_address}</span></div>`:""}<div class="row"><span class="label">Brand</span><span class="value">${order.brand||"—"}</span></div><div class="row"><span class="label">Placement</span><span class="value">${order.placement||"—"}</span></div><div class="row"><span class="label">Payment</span><span class="value paid">✅ Paid via Stripe</span></div>${order.notes?`<div class="row"><span class="label">Notes</span><span class="value">${order.notes}</span></div>`:""}<table><thead><tr><th>Design</th><th>Color</th><th>Size</th><th>Qty</th><th>Brand</th><th>Price</th></tr></thead><tbody>${itemRows}</tbody></table><div class="total-box"><span style="font-size:15px;">Order Total</span><span style="font-size:22px;font-weight:700;">${total}</span></div><a href="${siteUrl}" class="btn">View in Admin Panel →</a></div><div class="footer">To A "T" Boutique · New Market, AL</div></div></body></html>`;
          await fetch("https://api.resend.com/emails", {
            method:"POST",
            headers:{ "Authorization":`Bearer ${RESEND_API_KEY}`, "Content-Type":"application/json" },
            body: JSON.stringify({
              from: "To A T Boutique <orders@resend.dev>",
              to: [NOTIFY_EMAIL],
              subject: `🎉 New Order — ${order.customer_name||"Customer"} · ${total}`,
              html,
            }),
          });
          console.log("Order email sent to", NOTIFY_EMAIL);
        }
      } catch(emailErr) {
        console.warn("Email notification failed (non-fatal):", emailErr.message);
      }

      return { statusCode: 200, body: JSON.stringify({ received: true }) };

    } catch (err) {
      console.error("Order processing error:", err);
      return { statusCode: 500, body: err.message };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
