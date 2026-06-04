// Sends Tiffani a quick email when someone leaves a message via the contact form
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL  = process.env.NOTIFY_EMAIL;

  if (!RESEND_API_KEY || !NOTIFY_EMAIL) {
    return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
  }

  try {
    const msg = JSON.parse(event.body);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: 'Trebuchet MS', sans-serif; background:#F7F2EA; margin:0; padding:20px; }
    .card { background:#fff; border-radius:16px; max-width:500px; margin:0 auto; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
    .header { background:linear-gradient(135deg,#0084FF,#0052CC); padding:20px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:20px; }
    .body { padding:24px; }
    .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0ede8; font-size:14px; }
    .label { color:#888; }
    .value { font-weight:600; color:#2C2218; }
    .message-box { background:#F7F2EA; border-radius:10px; padding:14px; margin:16px 0; font-size:14px; color:#2C2218; line-height:1.6; }
    .btn { display:block; text-align:center; background:linear-gradient(135deg,#2E5C3E,#4A7C59); color:#fff; text-decoration:none; padding:14px 24px; border-radius:12px; font-weight:700; font-size:15px; margin:20px 0 0; }
    .footer { text-align:center; padding:16px; color:#aaa; font-size:11px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>💬 New Message from Website</h1>
    </div>
    <div class="body">
      <div class="row"><span class="label">From</span><span class="value">${msg.name || "—"}</span></div>
      <div class="row"><span class="label">Contact</span><span class="value">${msg.phone || "Not provided"}</span></div>
      <div class="row"><span class="label">Received</span><span class="value">${msg.date || new Date().toLocaleDateString()} at ${msg.time || new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div class="message-box">${msg.message || "—"}</div>
      <a href="${process.env.URL || 'https://stately-bubblegum-c0df35.netlify.app'}" class="btn">
        View in Admin Panel →
      </a>
    </div>
    <div class="footer">To A "T" Boutique · New Market, AL</div>
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
        subject: `💬 New Message from ${msg.name || "Website Visitor"}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return { statusCode: 500, body: JSON.stringify({ error: err }) };
    }

    return { statusCode: 200, body: JSON.stringify({ sent: true }) };

  } catch (err) {
    console.error("Message email error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
