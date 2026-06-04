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
- Payment required upfront via Venmo, PayPal, Cash App, or cash at pickup
- Sizes YXS through 4XL (youth and adult)
- Shirt brands: Gildan ($17 S-XL, $20 2XL+), Comfort Colors ($20 S-XL, $25 2XL+), Bella+Canvas ($20 S-XL, $25 2XL+)
- Orders typically take 5-7 business days
- Loyalty program: every 10 shirts = 1 free shirt
- For custom or complex orders, customers should message Tiffani directly on Messenger

Keep answers short, warm, and friendly. If you don't know something specific, encourage them to message Tiffani. Never make up prices or policies not listed above.`,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Claude API error:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API error" }),
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
