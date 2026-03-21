const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;
const YOCO_WEBHOOK_SECRET = process.env.YOCO_WEBHOOK_SECRET;
const SITE_URL = process.env.SITE_URL || 'https://nagdag.fun';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create Yoco checkout
app.post('/api/create-order', async (req, res) => {
  try {
    const { cart, total, subtotal, discount, items, shipping } = req.body;

    const orderId = 'ND-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const amountInCents = Math.round(parseFloat(total) * 100);

    const lineItems = items.map(i => ({
      displayName: i.name,
      quantity: parseInt(i.quantity),
      pricingDetails: {
        price: parseInt(i.unit_amount) * 100
      }
    }));

    const checkoutPayload = {
      amount: amountInCents,
      currency: 'ZAR',
      successUrl: `${SITE_URL}/dankie.html?order=${orderId}`,
      cancelUrl: SITE_URL,
      failureUrl: `${SITE_URL}?payment=failed`,
      externalId: orderId,
      metadata: {
        orderId,
        customerName: shipping.fullName,
        customerEmail: shipping.email || '',
        customerPhone: shipping.phone || '',
        address: shipping.address,
        city: shipping.city,
        postalCode: shipping.postalCode,
        province: shipping.province,
        items: items.map(i => `${i.name} x${i.quantity}`).join(', '),
        subtotal: subtotal,
        discount: discount
      },
      totalDiscount: discount ? Math.round(parseFloat(discount) * 100) : 0,
      lineItems
    };

    console.log('Creating Yoco checkout:', { orderId, amount: amountInCents, items: checkoutPayload.metadata.items });

    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Yoco checkout error:', data);
      return res.status(response.status).json({ error: data.message || data.displayMessage || 'Failed to create checkout' });
    }

    console.log('Checkout created:', { orderId, checkoutId: data.id, redirectUrl: data.redirectUrl });

    res.json({ redirect_url: data.redirectUrl, id: data.id, order_id: orderId });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Yoco webhook
app.post('/api/yoco/webhook', (req, res) => {
  try {
    // Verify webhook signature if secret is set
    if (YOCO_WEBHOOK_SECRET) {
      const sig = req.headers['webhook-signature'];
      const webhookId = req.headers['webhook-id'];
      const timestamp = req.headers['webhook-timestamp'];

      if (sig && webhookId && timestamp) {
        const payload = `${webhookId}.${timestamp}.${JSON.stringify(req.body)}`;
        const secret = Buffer.from(YOCO_WEBHOOK_SECRET.replace('whsec_', ''), 'base64');
        const computed = crypto.createHmac('sha256', secret).update(payload).digest('base64');

        const signatures = sig.split(' ');
        const verified = signatures.some(s => {
          const val = s.split(',')[1] || s;
          return val === computed;
        });

        if (!verified) {
          console.error('Webhook signature verification failed');
          return res.status(400).json({ error: 'Invalid signature' });
        }
      }
    }

    const event = req.body;

    console.log('Yoco webhook:', {
      type: event.type,
      id: event.id,
      payload: event.payload
    });

    if (event.type === 'payment.succeeded') {
      console.log('Payment COMPLETED:', event.payload);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    yoco_secret_key: YOCO_SECRET_KEY ? 'set' : 'MISSING',
    yoco_webhook_secret: YOCO_WEBHOOK_SECRET ? 'set' : 'MISSING',
    site_url: SITE_URL
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Nag & Dag running on port ${PORT}`);
});
