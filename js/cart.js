// ========================================
// Nag & Dag – Cart
// ========================================

const Cart = {
  BUNDLE_PRICE: 549,
  PRODUCTS: {
    nag: { name: 'Nag', nameAf: 'Nag', nameEn: 'Nag', price: 299, icon: 'nag' },
    dag: { name: 'Dag', nameAf: 'Dag', nameEn: 'Dag', price: 299, icon: 'dag' }
  },

  state: { nag: 0, dag: 0 },

  init() {
    this.load();
    this.bindEvents();
    this.render();
  },

  load() {
    try {
      const saved = localStorage.getItem('nagdag_cart');
      if (saved) this.state = JSON.parse(saved);
    } catch (e) { /* use defaults */ }
  },

  save() {
    localStorage.setItem('nagdag_cart', JSON.stringify(this.state));
  },

  getTotal() {
    return (this.state.nag * this.PRODUCTS.nag.price) + (this.state.dag * this.PRODUCTS.dag.price);
  },

  getCount() {
    return this.state.nag + this.state.dag;
  },

  addProduct(product, qty = 1) {
    if (this.state[product] !== undefined) {
      this.state[product] += qty;
      this.save();
      this.render();
      this.animateCartIcon();
    }
  },

  removeProduct(product) {
    if (this.state[product] !== undefined && this.state[product] > 0) {
      this.state[product]--;
      this.save();
      this.render();
    }
  },

  addBundle() {
    this.state.nag += 1;
    this.state.dag += 1;
    this.save();
    this.render();
    this.animateCartIcon();
    this.openDrawer();
  },

  clear() {
    this.state = { nag: 0, dag: 0 };
    this.save();
    this.render();
  },

  // UI
  bindEvents() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = btn.dataset.product;
        this.addProduct(product);

        // Button feedback
        const lang = document.documentElement.getAttribute('data-lang') || 'af';
        const originalText = btn.getAttribute(`data-${lang}`) || btn.textContent;
        btn.textContent = lang === 'af' ? 'Bygevoeg ✓' : 'Added ✓';
        btn.classList.add('btn-added');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('btn-added');
        }, 1500);
      });
    });

    // Bundle button
    const bundleBtn = document.querySelector('.add-bundle');
    if (bundleBtn) {
      bundleBtn.addEventListener('click', () => {
        this.addBundle();
        const lang = document.documentElement.getAttribute('data-lang') || 'af';
        const originalText = bundleBtn.getAttribute(`data-${lang}`) || bundleBtn.textContent;
        bundleBtn.textContent = lang === 'af' ? 'Bygevoeg ✓' : 'Added ✓';
        bundleBtn.classList.add('btn-added');
        setTimeout(() => {
          bundleBtn.textContent = originalText;
          bundleBtn.classList.remove('btn-added');
        }, 1500);
      });
    }

    // Cart open/close
    document.getElementById('cartBtn').addEventListener('click', () => this.openDrawer());
    document.getElementById('cartClose').addEventListener('click', () => this.closeDrawer());
    document.getElementById('cartOverlay').addEventListener('click', () => this.closeDrawer());

    // Checkout button
    document.getElementById('checkoutBtn').addEventListener('click', () => {
      if (this.getCount() > 0) {
        this.closeDrawer();
        Checkout.open();
      }
    });
  },

  openDrawer() {
    document.getElementById('cartDrawer').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeDrawer() {
    document.getElementById('cartDrawer').classList.remove('active');
    document.getElementById('cartOverlay').classList.remove('active');
    document.body.style.overflow = '';
  },

  animateCartIcon() {
    const btn = document.getElementById('cartBtn');
    btn.classList.add('cart-pop');
    setTimeout(() => btn.classList.remove('cart-pop'), 300);
  },

  render() {
    this.renderCount();
    this.renderDrawer();
  },

  renderCount() {
    const count = this.getCount();
    const el = document.getElementById('cartCount');
    el.textContent = count;
    el.classList.toggle('visible', count > 0);
  },

  renderDrawer() {
    const body = document.getElementById('cartBody');
    const total = document.getElementById('cartTotal');
    const lang = document.documentElement.getAttribute('data-lang') || 'af';
    const count = this.getCount();

    if (count === 0) {
      body.innerHTML = `<p class="cart-empty">${lang === 'af' ? 'Jou mandjie is leeg' : 'Your cart is empty'}</p>`;
      total.textContent = 'R0';
      return;
    }

    let html = '';

    ['nag', 'dag'].forEach(key => {
      if (this.state[key] > 0) {
        const product = this.PRODUCTS[key];
        const moonSvg = '<svg width="24" height="24" viewBox="0 0 48 48" fill="none"><path d="M36 28a16 16 0 01-20-20 16 16 0 1020 20z" fill="#c4a8e0"/></svg>';
        const sunSvg = '<svg width="24" height="24" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="8" fill="#d4a843"/><g stroke="#d4a843" stroke-width="2"><line x1="24" y1="4" x2="24" y2="10"/><line x1="24" y1="38" x2="24" y2="44"/><line x1="4" y1="24" x2="10" y2="24"/><line x1="38" y1="24" x2="44" y2="24"/></g></svg>';

        html += `
          <div class="cart-item">
            <div class="cart-item-icon ${key}-icon">
              ${key === 'nag' ? moonSvg : sunSvg}
            </div>
            <div class="cart-item-info">
              <h4>${product.name}</h4>
              <span class="item-price">R${product.price}</span>
              <div class="cart-qty">
                <button onclick="Cart.removeProduct('${key}')" aria-label="Decrease">−</button>
                <span>${this.state[key]}</span>
                <button onclick="Cart.addProduct('${key}')" aria-label="Increase">+</button>
              </div>
            </div>
          </div>
        `;
      }
    });

    body.innerHTML = html;
    total.textContent = `R${this.getTotal()}`;
  }
};

document.addEventListener('DOMContentLoaded', () => Cart.init());
