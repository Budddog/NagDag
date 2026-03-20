const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PayPal auth helper
async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const base = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) throw new Error(`PayPal auth failed: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

// Create PayPal order
app.post('/api/create-order', async (req, res) => {
  const base = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';

  try {
    const { cart, total, items, shipping } = req.body;
    const accessToken = await getAccessToken();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'ZAR',
          value: total.toString(),
          breakdown: {
            item_total: { currency_code: 'ZAR', value: total.toString() }
          }
        },
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unit_amount: { currency_code: 'ZAR', value: item.unit_amount.toString() }
        })),
        shipping: {
          name: { full_name: shipping.fullName },
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
      return res.status(response.status).json(data);
    }

    res.json({ id: data.id });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Capture PayPal order
app.post('/api/capture-order', async (req, res) => {
  const base = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';

  try {
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ error: 'Missing orderID' });

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
      return res.status(response.status).json(data);
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    console.log('Order captured:', {
      orderId: data.id,
      status: data.status,
      amount: capture?.amount?.value,
      currency: capture?.amount?.currency_code,
      payer: data.payer?.email_address
    });

    res.json({ status: data.status, id: data.id });
  } catch (error) {
    console.error('Capture order error:', error);
    res.status(500).json({ error: 'Failed to capture order' });
  }
});

// Health check with env var status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    paypal_client_id: process.env.PAYPAL_CLIENT_ID ? 'set' : 'MISSING',
    paypal_client_secret: process.env.PAYPAL_CLIENT_SECRET ? 'set' : 'MISSING',
    paypal_api_base: process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com (default)'
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Nag & Dag running on port ${PORT}`);
});
