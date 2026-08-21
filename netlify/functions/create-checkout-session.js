// Netlify Function: create-checkout-session
// Creates a real Stripe Checkout Session and returns its URL for redirect.
// Uses Stripe's plain REST API via fetch — no SDK/npm dependency required,
// which keeps deployment simple for a GitHub-upload based workflow.
//
// Requires an environment variable STRIPE_SECRET_KEY to be set in Netlify's
// Project configuration → Environment variables. NEVER commit this key to
// GitHub or hardcode it here.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Stripe secret key is not configured on the server.' }),
    };
  }

  let items;
  try {
    const body = JSON.parse(event.body);
    items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Cart is empty.');
    }
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  // Basic server-side validation of each cart item before trusting it.
  for (const item of items) {
    if (
      typeof item.name !== 'string' ||
      typeof item.price !== 'number' ||
      item.price <= 0 ||
      typeof item.qty !== 'number' ||
      item.qty <= 0
    ) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid item in cart.' }) };
    }
  }

  const origin = event.headers.origin || `https://${event.headers.host}`;

  // Build the form-encoded body Stripe's REST API expects.
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${origin}/cart.html`);

  items.forEach((item, i) => {
    params.append(`line_items[${i}][quantity]`, String(item.qty));
    params.append(`line_items[${i}][price_data][currency]`, 'myr');
    params.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(item.price * 100)));
    params.append(`line_items[${i}][price_data][product_data][name]`, item.name);
  });

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return {
        statusCode: stripeRes.status,
        body: JSON.stringify({ error: session.error ? session.error.message : 'Stripe request failed.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error creating checkout session.' }) };
  }
};
