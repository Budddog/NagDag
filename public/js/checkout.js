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
      container.innerHTML = '<p style="text-align:center;color:#ccc;font-size:0.85rem;padding:20px 0;">Payment unavailable. Reload page.</p>';
      return;
    }

    const self = this;

    paypal.Buttons({
      style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'pay', height: 44 },

      createOrder: async () => {
        const items = [];
        ['nag', 'dag'].forEach(key => {
          if (Cart.state[key] > 0) {
            items.push({ name: Cart.PRODUCTS[key].name, quantity: Cart.state[key], unit_amount: Cart.PRODUCTS[key].price.toString() });
          }
        });

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
          console.error('Create order failed:', res.status, data);
          throw new Error(data.message || data.error || 'Order creation failed');
        }
        return data.id;
      },

      onApprove: async (data) => {
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
          alert('Payment could not be completed. Please try again.');
        }
      },

      onError: (err) => {
        console.error('PayPal error:', err);
        alert('Something went wrong. Please try again.');
      }
    }).render('#paypal-button-container');
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
