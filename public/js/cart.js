const Cart = {
  PRODUCTS: {
    nag: { name: 'Nag', price: 299 },
    dag: { name: 'Dag', price: 299 }
  },
  BUNDLE_PRICE: 499,
  state: { nag: 0, dag: 0 },

  init() {
    this.load();
    this.bindEvents();
    this.render();
  },

  load() {
    try {
      const s = localStorage.getItem('nagdag_cart');
      if (s) this.state = JSON.parse(s);
    } catch (e) {}
  },

  save() { localStorage.setItem('nagdag_cart', JSON.stringify(this.state)); },

  getCount() { return this.state.nag + this.state.dag; },

  getSubtotal() { return (this.state.nag * 299) + (this.state.dag * 299); },

  getDiscount() {
    // Bundle discount: for each pair of (1 nag + 1 dag), save R99 (598 -> 499)
    const bundles = Math.min(this.state.nag, this.state.dag);
    return bundles * (299 + 299 - this.BUNDLE_PRICE);
  },

  getTotal() { return this.getSubtotal() - this.getDiscount(); },

  addProduct(p, qty = 1) {
    if (this.state[p] !== undefined) {
      this.state[p] += qty;
      this.save();
      this.render();
      this.pop();
    }
  },

  removeProduct(p) {
    if (this.state[p] > 0) {
      this.state[p]--;
      this.save();
      this.render();
    }
  },

  addBundle() {
    this.state.nag++;
    this.state.dag++;
    this.save();
    this.render();
    this.pop();
    this.openDrawer();
  },

  bindEvents() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.product;
        this.addProduct(p);
        this.openDrawer();
        const lang = document.documentElement.getAttribute('data-lang') || 'af';
        const orig = btn.getAttribute(`data-${lang}`) || btn.textContent;
        btn.textContent = '✓';
        btn.classList.add('btn-added');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('btn-added'); }, 1200);
      });
    });

    document.querySelector('.add-bundle')?.addEventListener('click', function() {
      Cart.addBundle();
      const lang = document.documentElement.getAttribute('data-lang') || 'af';
      const orig = this.getAttribute(`data-${lang}`) || this.textContent;
      this.textContent = '✓';
      this.classList.add('btn-added');
      setTimeout(() => { this.textContent = orig; this.classList.remove('btn-added'); }, 1200);
    });

    document.getElementById('cartBtn').addEventListener('click', () => this.openDrawer());
    document.getElementById('cartClose').addEventListener('click', () => this.closeDrawer());
    document.getElementById('cartOverlay').addEventListener('click', () => this.closeDrawer());
    document.getElementById('checkoutBtn').addEventListener('click', () => {
      if (this.getCount() > 0) { this.closeDrawer(); Checkout.open(); }
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

  pop() {
    const btn = document.getElementById('cartBtn');
    btn.style.transform = 'scale(1.15)';
    setTimeout(() => btn.style.transform = '', 200);
  },

  render() {
    const count = this.getCount();
    const el = document.getElementById('cartCount');
    el.textContent = count;
    el.classList.toggle('visible', count > 0);
    document.getElementById('cartTotal').textContent = `R${this.getTotal()}`;

    const discountEl = document.getElementById('cartDiscount');
    const discount = this.getDiscount();
    if (discountEl) {
      if (discount > 0) {
        const lang = document.documentElement.getAttribute('data-lang') || 'af';
        discountEl.innerHTML = `<span>${lang === 'af' ? 'Bundel afslag' : 'Bundle discount'}</span><span>-R${discount}</span>`;
        discountEl.style.display = '';
      } else {
        discountEl.style.display = 'none';
      }
    }

    this.renderDrawer();
  },

  renderDrawer() {
    const body = document.getElementById('cartBody');
    const lang = document.documentElement.getAttribute('data-lang') || 'af';

    if (this.getCount() === 0) {
      body.innerHTML = `<p class="cart-empty">${lang === 'af' ? 'Leeg' : 'Empty'}</p>`;
      return;
    }

    let html = '';
    ['nag', 'dag'].forEach(key => {
      if (this.state[key] > 0) {
        html += `
          <div class="cart-item">
            <div class="cart-item-icon ${key}-icon">${this.PRODUCTS[key].name.charAt(0)}</div>
            <div class="cart-item-info">
              <h4>${this.PRODUCTS[key].name}</h4>
              <span class="item-price">R${this.PRODUCTS[key].price}</span>
              <div class="cart-qty">
                <button onclick="Cart.removeProduct('${key}')">−</button>
                <span>${this.state[key]}</span>
                <button onclick="Cart.addProduct('${key}')">+</button>
              </div>
            </div>
          </div>`;
      }
    });
    body.innerHTML = html;
  }
};

document.addEventListener('DOMContentLoaded', () => Cart.init());
