const Checkout = {
  orderData: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('checkoutForm').addEventListener('submit', (e) => this.handleSubmit(e));
    document.getElementById('checkoutClose').addEventListener('click', () => this.close());
    document.getElementById('checkoutOverlay').addEventListener('click', () => this.close());
    document.getElementById('checkoutBack').addEventListener('click', () => this.showDeliveryStep());
    document.getElementById('payBtn').addEventListener('click', () => this.processPayment());
  },

  open() {
    this.showDeliveryStep();
    document.getElementById('checkoutModal').classList.add('active');
    document.getElementById('checkoutOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('checkoutOverlay').classList.remove('active');
    document.body.style.overflow = '';
  },

  showDeliveryStep() {
    document.getElementById('checkoutStepDelivery').style.display = '';
    document.getElementById('checkoutStepPayment').style.display = 'none';
    document.getElementById('stepDot1').classList.add('active');
    document.getElementById('stepDot2').classList.remove('active');
  },

  showPaymentStep() {
    document.getElementById('checkoutStepDelivery').style.display = 'none';
    document.getElementById('checkoutStepPayment').style.display = '';
    document.getElementById('stepDot1').classList.remove('active');
    document.getElementById('stepDot2').classList.add('active');
    this.renderSummary();
    this.hideError();
  },

  renderSummary() {
    const el = document.getElementById('checkoutSummary');
    const lang = document.documentElement.getAttribute('data-lang') || 'af';
    let html = '';

    ['nag', 'dag'].forEach(key => {
      if (Cart.state[key] > 0) {
        html += `<div class="order-summary-line"><span>${Cart.PRODUCTS[key].name} x ${Cart.state[key]}</span><span>R${Cart.state[key] * Cart.PRODUCTS[key].price}</span></div>`;
      }
    });

    const discount = Cart.getDiscount();
    if (discount > 0) {
      html += `<div class="order-summary-line" style="color:#2a9d2a;"><span>${lang === 'af' ? 'Afslag' : 'Discount'}</span><span>-R${discount}</span></div>`;
    }
    html += `<div class="order-summary-total"><span>${lang === 'af' ? 'Totaal' : 'Total'}</span><span>R${Cart.getTotal()}</span></div>`;
    el.innerHTML = html;
  },

  async processPayment() {
    const btn = document.getElementById('payBtn');
    const lang = document.documentElement.getAttribute('data-lang') || 'af';
    btn.disabled = true;
    btn.textContent = lang === 'af' ? 'Besig...' : 'Processing...';
    this.hideError();

    const items = [];
    ['nag', 'dag'].forEach(key => {
      if (Cart.state[key] > 0) {
        items.push({ name: Cart.PRODUCTS[key].name, quantity: Cart.state[key], unit_amount: Cart.PRODUCTS[key].price.toString() });
      }
    });

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: { ...Cart.state },
          total: Cart.getTotal().toString(),
          subtotal: Cart.getSubtotal().toString(),
          discount: Cart.getDiscount().toString(),
          items,
          shipping: {
            fullName: this.orderData.fullName,
            address: this.orderData.address,
            city: this.orderData.city,
            postalCode: this.orderData.postalCode,
            province: this.orderData.province
          }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Save order data before redirect
      localStorage.setItem('nagdag_last_order', JSON.stringify({
        ...this.orderData,
        cart: { ...Cart.state },
        total: Cart.getTotal(),
        discount: Cart.getDiscount(),
        orderId: data.order_id,
        timestamp: new Date().toISOString()
      }));

      // Redirect to NOWPayments checkout
      window.location.href = data.invoice_url;

    } catch (err) {
      console.error('Payment error:', err);
      this.showError(err.message);
      btn.disabled = false;
      btn.textContent = lang === 'af' ? 'Betaal met Crypto' : 'Pay with Crypto';
    }
  },

  showError(msg) {
    let el = document.getElementById('payment-error');
    if (!el) {
      el = document.createElement('p');
      el.id = 'payment-error';
      el.style.cssText = 'text-align:center;color:#c00;font-size:0.8rem;padding:12px 0;';
      document.getElementById('payBtn').after(el);
    }
    el.textContent = msg;
    el.style.display = '';
  },

  hideError() {
    const el = document.getElementById('payment-error');
    if (el) el.style.display = 'none';
  },

  handleSubmit(e) {
    e.preventDefault();
    const f = e.target;
    this.orderData = {
      fullName: f.fullName.value.trim(),
      email: f.email.value.trim(),
      phone: f.phone.value.trim(),
      address: f.address.value.trim(),
      city: f.city.value.trim(),
      postalCode: f.postalCode.value.trim(),
      province: f.province.value
    };
    this.showPaymentStep();
  }
};

document.addEventListener('DOMContentLoaded', () => Checkout.init());
