// ========================================
// Netlify Serverless Function: Capture PayPal Order
// ========================================

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const base = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'PayPal credentials not configured' })
    };
  }

  const base = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

  try {
    const { orderID } = JSON.parse(event.body);

    if (!orderID) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing orderID' })
      };
    }

    const accessToken = await getAccessToken();

    const response = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal capture error:', data);
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    // Log order details for fulfillment
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    console.log('Order captured:', {
      orderId: data.id,
      status: data.status,
      amount: capture?.amount?.value,
      currency: capture?.amount?.currency_code,
      payer: data.payer?.email_address
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: data.status,
        id: data.id
      })
    };

  } catch (error) {
    console.error('Capture order error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to capture order' })
    };
  }
};
