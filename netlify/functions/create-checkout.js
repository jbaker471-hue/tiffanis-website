const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

    // Build line items from order
    const lineItems = items.map(item => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${item.brand || "Custom"} Shirt — ${item.design}`,
          description: `Color: ${item.color} | Size: ${item.size} | Placement: ${item.placement || "Front Full"}${item.shirt_style === "pocket" ? " | Pocket" : ""}`,
        },
        unit_amount: Math.round(item.price * 100), // Stripe uses cents
      },
      quantity: Number(item.qty) || 1,
    }));

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
    let discounts;
    const discountCents = Math.round(Number(rewardDiscount || 0) * 100);
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
