const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Mirrors the CATALOG/getPrice logic in src/App.jsx. The client computes and
// sends item.price for display, but a request body is fully attacker
// controlled — without this, someone could hand-craft a checkout request
// with price set to $0.01. Every item's price is recomputed here from this
// table and the client-supplied price is never trusted for the actual charge.
// Keep this in sync with the CATALOG in src/App.jsx if prices ever change.
const BIG_SIZES = ["2XL", "3XL", "4XL", "5XL"];
const PRICE_TABLE = {
  "Gildan Short Sleeve":          { base: 17, big: 20 },
  "Gildan Long Sleeve":           { base: 20, big: 25 },
  "Gildan Sweatshirt":            { base: 25, big: 30 },
  "Gildan Hoodie":                { base: 30, big: 35 },
  "Bella+Canvas Short Sleeve":    { base: 20, big: 25 },
  "Comfort Colors Short Sleeve":  { base: 20, big: 25 },
  "Bella+Canvas Youth Tee":       { base: 13, big: 13 },
  "Rabbit Skins Youth Tee":       { base: 13, big: 13 },
  "Gildan Youth Tee":             { base: 13, big: 13 },
  "Comfort Colors Youth Tee":     { base: 13, big: 13 },
  "DTF Print Only":               { base: 10, big: 10 },
};

function realPriceFor(item) {
  const entry = PRICE_TABLE[item.brand];
  if (!entry) return null; // unknown product name — reject rather than guess
  return BIG_SIZES.includes(item.size) ? entry.big : entry.base;
}

// Exported for test/price-consistency.test.js, which checks this table
// against src/pricing.js so the two can't silently drift apart.
module.exports.PRICE_TABLE = PRICE_TABLE;
module.exports.BIG_SIZES = BIG_SIZES;
module.exports.realPriceFor = realPriceFor;

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
    const { items, delivery, shippingAddress, orderData, rewardDiscount } = JSON.parse(event.body);

    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "No items in order" }) };
    }

    // Build line items from order, pricing each one from the server-side
    // table rather than trusting item.price from the client.
    const lineItems = items.map(item => {
      const price = realPriceFor(item);
      if (price == null) {
        throw new Error(`Unrecognized product "${item.brand}" — refusing to price it from client input`);
      }
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${item.brand || "Custom"} Shirt — ${item.design}`,
            description: `Color: ${item.color} | Size: ${item.size} | Placement: ${item.placement || "Front Full"}${item.shirt_style === "pocket" ? " | Pocket" : ""}`,
          },
          unit_amount: Math.round(price * 100), // Stripe uses cents
        },
        quantity: Number(item.qty) || 1,
      };
    });

    // Add shipping if applicable
    if (delivery === "Ship") {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping",
            description: `Flat rate shipping to ${shippingAddress || "your address"}`,
          },
          unit_amount: 800, // $8.00
        },
        quantity: 1,
      });
    }

    // Loyalty reward: apply as a one-time Stripe coupon for the free-shirt value.
    // (Stripe doesn't allow negative line items, so a coupon is the correct way.)
    // The discount is never taken from the client as-is: it's capped to the
    // price of the single most expensive item actually in this order (the
    // real "free shirt" value), and only honored if the phone on file has an
    // unredeemed reward.
    let discounts;
    let discountCents = 0;
    if (orderData && orderData.usingReward && orderData.phone) {
      const maxItemPrice = Math.max(...items.map(realPriceFor).filter(p => p != null));
      let hasUnredeemedReward = false;
      try {
        const phoneDigits = String(orderData.phone).replace(/\D/g, "");
        const custRes = await fetch(
          `${process.env.VITE_SUPABASE_URL}/rest/v1/customers?phone=eq.${phoneDigits}&select=earned_rewards,redeemed_rewards`,
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            },
          }
        );
        const rows = await custRes.json();
        const c = Array.isArray(rows) ? rows[0] : null;
        hasUnredeemedReward = !!c && (c.earned_rewards || 0) > (c.redeemed_rewards || 0);
      } catch (err) {
        console.warn("Reward eligibility check failed, denying discount:", err.message);
      }
      if (hasUnredeemedReward) {
        discountCents = Math.round(maxItemPrice * 100);
      }
    }
    if (discountCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: discountCents,
        currency: "usd",
        duration: "once",
        name: "Loyalty Free Shirt",
      });
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      discounts: discounts,
      success_url: `${process.env.URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}?payment=cancelled`,
      customer_email: orderData.email || undefined,
      metadata: {
        customer_name: orderData.customerName || "",
        phone: orderData.phone || "",
        email: orderData.email || "",
        delivery: delivery || "Pickup",
        shipping_address: shippingAddress || "",
        notes: orderData.notes || "",
        brand: orderData.brand || "",
        shirt_style: orderData.shirt_style || "",
        placement: orderData.placement || "",
        items: JSON.stringify(items),
        using_reward: orderData.usingReward ? "true" : "false",
        reward_discount: discountCents > 0 ? String(rewardDiscount) : "0",
      },
      billing_address_collection: "auto",
      shipping_address_collection: delivery === "Ship" ? {
        allowed_countries: ["US"],
      } : undefined,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
