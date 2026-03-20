// ========================================
// Nag & Dag – Checkout (PayPal Standard)
// ========================================

const Checkout = {
  orderData: null,
  buttonsRendered: false,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('checkoutForm');
    const closeBtn = document.getElementById('checkoutClose');
    const overlay = document.getElementById('checkoutOverlay');
    const backBtn = document.getElementById('checkoutBack');

    form.addEventListener('submit', (e) => this.handleSubmit(e));
    closeBtn.addEventListener('click', () => this.close());
    overlay.addEventListener('click', () => this.close());
    backBtn.addEventListener('click', () => this.showDeliveryStep());
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
    const summary = document.getElementById('checkoutSummary');
    const lang = document.documentElement.getAttribute('data-lang') || 'af';
    let html = '';

    ['nag', 'dag'].forEach(key => {
      if (Cart.state[key] > 0) {
        const product = Cart.PRODUCTS[key];
        const subtotal = Cart.state[key] * product.price;
        html += `
          <div class="checkout-summary-line">
            <span>${product.name} × ${Cart.state[key]}</span>
            <span>R${subtotal}</span>
          </div>
        `;
      }
    });

    html += `
      <div class="checkout-summary-total">
        <span>${lang === 'af' ? 'Totaal' : 'Total'}</span>
        <span>R${Cart.getTotal()}</span>
      </div>
    `;

    summary.innerHTML = html;
  },

  renderPayPalButtons() {
    const container = document.getElementById('paypal-button-container');

    // Clear previous buttons if re-entering this step
    container.innerHTML = '';
    this.buttonsRendered = false;

    if (typeof paypal === 'undefined') {
      const lang = document.documentElement.getAttribute('data-lang') || 'af';
      container.innerHTML = `<p class="paypal-error">${
        lang === 'af' ? 'Betaling kon nie gelaai word nie. Herlaai asseblief die bladsy.' : 'Payment could not load. Please reload the page.'
      }</p>`;
      return;
    }

    const self = this;

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'black',
        shape: 'rect',
        label: 'pay',
        height: 48
      },

      createOrder: async () => {
        const items = [];
        ['nag', 'dag'].forEach(key => {
          if (Cart.state[key] > 0) {
            items.push({
              name: Cart.PRODUCTS[key].name,
              quantity: Cart.state[key],
              unit_amount: Cart.PRODUCTS[key].price.toString()
            });
          }
        });

        const response = await fetch('/.netlify/functions/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart: { ...Cart.state },
            total: Cart.getTotal().toString(),
            items: items,
            shipping: {
              fullName: self.orderData.fullName,
              address: self.orderData.address,
              city: self.orderData.city,
              postalCode: self.orderData.postalCode,
              province: self.orderData.province
            }
          })
        });

        if (!response.ok) {
          throw new Error('Order creation failed');
        }

        const data = await response.json();
        return data.id;
      },

      onApprove: async (data) => {
        const response = await fetch('/.netlify/functions/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID: data.orderID })
        });

        const result = await response.json();

        if (result.status === 'COMPLETED') {
          // Save order info for thank-you page
          localStorage.setItem('nagdag_last_order', JSON.stringify({
            ...self.orderData,
            cart: { ...Cart.state },
            total: Cart.getTotal(),
            timestamp: new Date().toISOString()
          }));
          localStorage.removeItem('nagdag_cart');
          window.location.href = '/dankie.html';
        } else {
          const lang = document.documentElement.getAttribute('data-lang') || 'af';
          alert(lang === 'af'
            ? 'Betaling kon nie voltooi word nie. Probeer asseblief weer.'
            : 'Payment could not be completed. Please try again.');
        }
      },

      onError: (err) => {
        console.error('PayPal error:', err);
        const lang = document.documentElement.getAttribute('data-lang') || 'af';
        alert(lang === 'af'
          ? 'Jammer, iets het fout gegaan. Probeer asseblief weer.'
          : 'Sorry, something went wrong. Please try again.');
      },

      onCancel: () => {
        // User closed the PayPal popup — stay on payment step
      }
    }).render('#paypal-button-container');

    this.buttonsRendered = true;
  },

  handleSubmit(e) {
    e.preventDefault();

    const form = e.target;

    // Store delivery details
    this.orderData = {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      city: form.city.value.trim(),
      postalCode: form.postalCode.value.trim(),
      province: form.province.value
    };

    // Move to payment step
    this.showPaymentStep();
  }
};

document.addEventListener('DOMContentLoaded', () => Checkout.init());
