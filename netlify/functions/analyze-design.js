// Server-side proxy for the "AI Sort" admin feature.
// The client used to call https://api.anthropic.com/v1/messages directly from
// the browser. That can never work securely: an Anthropic API key placed in
// client JS is visible to anyone who opens dev tools. This function holds the
// key server-side (ANTHROPIC_API_KEY is already set in Netlify env vars) and
// the client calls this endpoint instead.
exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on the server" }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!Array.isArray(payload.messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: "messages array is required" }) };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      // Model and max_tokens are pinned server-side rather than trusted from
      // the client, so a tampered request can't run up costs on other models.
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 500,
        messages: payload.messages,
      }),
    });

    const data = await res.text();
    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json" },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Upstream request to Anthropic failed", detail: err.message }),
    };
  }
};
