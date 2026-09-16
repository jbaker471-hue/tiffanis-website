exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const { messages } = JSON.parse(event.body);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: `You are a friendly customer service helper for To A "T" Boutique — a small custom t-shirt and gift shop run by Tiffani in New Market, AL.

Key facts:
- Custom DTF print shirts, tumblers & gifts made with love
- Pickup in New Market, AL or $8 flat rate shipping anywhere
- Checkout is by credit/debit card only, charged at the time of ordering (Stripe) — there is no Venmo, PayPal, Cash App, or pay-at-pickup option through the site
- Sizes: youth YXS-YXL, adult XS-5XL (varies a little by item)
- Adult Gildan: Short Sleeve $17 (S-XL) / $20 (2XL+), Long Sleeve $20/$25, Sweatshirt $25/$30, Hoodie $30/$35
- Adult Bella+Canvas or Comfort Colors Short Sleeve: $20 (S-XL) / $25 (2XL+)
- Youth Tee (any brand): $13
- DTF Print Only (no shirt, just the print): $10
- Orders typically take 5-7 business days
- Loyalty program: every 10 shirts = 1 free shirt
- For custom or complex orders, customers should message Tiffani directly on Messenger

Keep answers short, warm, and friendly. If you don't know something specific, encourage them to message Tiffani. Never make up prices or policies not listed above.`,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API error:", res.status, errText);
      // Surface the upstream status/type (not the full body) so the cause
      // (bad key, missing model access, rate limit, ...) is visible from the
      // browser Network tab, since Netlify's own log view isn't reliable.
      let upstreamType, upstreamMessage;
      try {
        const parsed = JSON.parse(errText).error || {};
        upstreamType = parsed.type;
        upstreamMessage = parsed.message;
      } catch {}
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API error", upstreamStatus: res.status, upstreamType, upstreamMessage }),
      };
    }

    const data = await res.json();
    const text = data.content?.find(b => b.type === "text")?.text || "Sorry, I had trouble with that. Please message Tiffani on Messenger for help! 💬";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: text }),
    };

  } catch (err) {
    console.error("Chat function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
