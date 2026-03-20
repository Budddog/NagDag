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
    this.renderPayPalButtons();
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
      html += `<div class="order-summary-line" style="color:#2a9d2a;"><span>${lang === 'af' ? '3de 50% af' : '3rd 50% off'}</span><span>-R${discount}</span></div>`;
    }
    html += `<div class="order-summary-total"><span>${lang === 'af' ? 'Totaal' : 'Total'}</span><span>R${Cart.getTotal()}</span></div>`;
    el.innerHTML = html;
  },

  renderPayPalButtons() {
    const container = document.getElementById('paypal-button-container');
    container.innerHTML = '';

    if (typeof paypal === 'undefined') {
      container.innerHTML = '<p style="text-align:center;color:#999;font-size:0.85rem;padding:20px 0;">Payment loading failed. Please reload the page.</p>';
      return;
    }

    const self = this;
    const errorEl = document.getElementById('paypal-error');
    if (errorEl) errorEl.style.display = 'none';

    paypal.Buttons({
      style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'pay', height: 44 },

      createOrder: async () => {
        const items = [];
        ['nag', 'dag'].forEach(key => {
          if (Cart.state[key] > 0) {
            items.push({ name: Cart.PRODUCTS[key].name, quantity: Cart.state[key], unit_amount: Cart.PRODUCTS[key].price.toString() });
          }
        });

        const total = Cart.getTotal();
        const subtotal = Cart.getSubtotal();
        const discount = Cart.getDiscount();

        try {
          const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cart: { ...Cart.state },
              total: total.toString(),
              subtotal: subtotal.toString(),
              discount: discount.toString(),
              items,
              shipping: {
                fullName: self.orderData.fullName,
                address: self.orderData.address,
                city: self.orderData.city,
                postalCode: self.orderData.postalCode,
                province: self.orderData.province
              }
            })
          });

          const data = await res.json();
          if (!res.ok) {
            console.error('Create order failed:', res.status, JSON.stringify(data));
            const msg = data.details ? data.details.map(d => d.description || d.issue).join(', ') : (data.message || data.error || 'Order creation failed');
            self.showError(msg);
            throw new Error(msg);
          }
          return data.id;
        } catch (err) {
          console.error('Create order error:', err);
          self.showError(err.message);
          throw err;
        }
      },

      onApprove: async (data) => {
        try {
          const res = await fetch('/api/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID })
          });

          const result = await res.json();

          if (result.status === 'COMPLETED') {
            localStorage.setItem('nagdag_last_order', JSON.stringify({
              ...self.orderData,
              cart: { ...Cart.state },
              total: Cart.getTotal(),
              discount: Cart.getDiscount(),
              timestamp: new Date().toISOString()
            }));
            localStorage.removeItem('nagdag_cart');
            window.location.href = '/dankie.html';
          } else {
            console.error('Capture result:', JSON.stringify(result));
            self.showError('Payment not completed: ' + (result.status || 'unknown'));
          }
        } catch (err) {
          console.error('Capture error:', err);
          self.showError('Payment capture failed: ' + err.message);
        }
      },

      onError: (err) => {
        console.error('PayPal SDK error:', err);
        self.showError('PayPal error: ' + (err.message || err));
      }
    }).render('#paypal-button-container');
  },

  showError(msg) {
    let el = document.getElementById('paypal-error');
    if (!el) {
      el = document.createElement('p');
      el.id = 'paypal-error';
      el.style.cssText = 'text-align:center;color:#c00;font-size:0.8rem;padding:12px 0;';
      document.getElementById('paypal-button-container').after(el);
    }
    el.textContent = msg;
    el.style.display = '';
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
