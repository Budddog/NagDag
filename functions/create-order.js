// ========================================
// Netlify Serverless Function: Create PayPal Order
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
    const { cart, total, items, shipping } = JSON.parse(event.body);

    const accessToken = await getAccessToken();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'ZAR',
          value: total.toString(),
          breakdown: {
            item_total: {
              currency_code: 'ZAR',
              value: total.toString()
            }
          }
        },
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unit_amount: {
            currency_code: 'ZAR',
            value: item.unit_amount.toString()
          }
        })),
        shipping: {
          name: {
            full_name: shipping.fullName
          },
          address: {
            address_line_1: shipping.address,
            admin_area_2: shipping.city,
            postal_code: shipping.postalCode,
            admin_area_1: shipping.province,
            country_code: 'ZA'
          }
        }
      }]
    };

    const response = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal create order error:', data);
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.id })
    };

  } catch (error) {
    console.error('Create order error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create order' })
    };
  }
};
