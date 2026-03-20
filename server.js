const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;
const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1';
const SITE_URL = process.env.SITE_URL || 'https://nagdag.fun';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create NOWPayments invoice
app.post('/api/create-order', async (req, res) => {
  try {
    const { cart, total, subtotal, discount, items, shipping } = req.body;

    const orderId = 'ND-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const invoicePayload = {
      price_amount: parseFloat(total),
      price_currency: 'zar',
      order_id: orderId,
      order_description: items.map(i => `${i.name} x${i.quantity}`).join(', '),
      ipn_callback_url: `${SITE_URL}/api/nowpayments/ipn`,
      success_url: `${SITE_URL}/dankie.html`,
      cancel_url: SITE_URL,
      is_fixed_rate: false
    };

    const response = await fetch(`${NOWPAYMENTS_API_BASE}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoicePayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('NOWPayments create invoice error:', data);
      return res.status(response.status).json({ error: data.message || 'Failed to create invoice' });
    }

    console.log('Invoice created:', {
      orderId,
      invoiceId: data.id,
      amount: total,
      items: invoicePayload.order_description
    });

    res.json({ invoice_url: data.invoice_url, id: data.id, order_id: orderId });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// NOWPayments IPN webhook
app.post('/api/nowpayments/ipn', (req, res) => {
  try {
    const receivedSig = req.headers['x-nowpayments-sig'];

    if (!receivedSig || !NOWPAYMENTS_IPN_SECRET) {
      console.error('IPN: Missing signature or secret');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify HMAC-SHA512 signature
    const sortedBody = JSON.stringify(req.body, Object.keys(req.body).sort());
    const hmac = crypto.createHmac('sha512', NOWPAYMENTS_IPN_SECRET);
    hmac.update(sortedBody);
    const computedSig = hmac.digest('hex');

    if (computedSig !== receivedSig) {
      console.error('IPN: Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { payment_status, order_id, pay_amount, pay_currency, price_amount, price_currency, payment_id } = req.body;

    console.log('IPN received:', {
      payment_id,
      order_id,
      status: payment_status,
      paid: `${pay_amount} ${pay_currency}`,
      price: `${price_amount} ${price_currency}`
    });

    if (payment_status === 'finished') {
      console.log('Payment COMPLETED for order:', order_id);
    } else if (payment_status === 'partially_paid') {
      console.log('Partial payment for order:', order_id);
    } else if (payment_status === 'failed' || payment_status === 'expired') {
      console.log('Payment failed/expired for order:', order_id);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('IPN error:', error);
    res.status(500).json({ error: 'IPN processing failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    nowpayments_api_key: NOWPAYMENTS_API_KEY ? 'set' : 'MISSING',
    nowpayments_ipn_secret: NOWPAYMENTS_IPN_SECRET ? 'set' : 'MISSING',
    site_url: SITE_URL
  });
});

// Test NOWPayments connection
app.get('/api/test-payment', async (req, res) => {
  try {
    const statusRes = await fetch(`${NOWPAYMENTS_API_BASE}/status`, {
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY }
    });
    const statusData = await statusRes.json();

    const currRes = await fetch(`${NOWPAYMENTS_API_BASE}/merchant/coins`, {
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY }
    });
    const currData = await currRes.json();

    res.json({
      api_status: statusData,
      supported_coins: currData.selectedCurrencies ? currData.selectedCurrencies.slice(0, 10) : 'none configured',
      total_coins: currData.selectedCurrencies ? currData.selectedCurrencies.length : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Nag & Dag running on port ${PORT}`);
});
