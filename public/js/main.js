document.addEventListener('DOMContentLoaded', () => {
  initAgeGate();
  initLanguageToggle();
  initFAQ();
});

function initAgeGate() {
  const overlay = document.getElementById('ageOverlay');
  const btn = document.getElementById('ageConfirm');

  if (localStorage.getItem('nagdag_age') === '1') {
    overlay.classList.add('hidden');
    setTimeout(() => overlay.style.display = 'none', 400);
    return;
  }

  document.body.style.overflow = 'hidden';

  btn.addEventListener('click', () => {
    localStorage.setItem('nagdag_age', '1');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    setTimeout(() => overlay.style.display = 'none', 400);
  });
}

function initLanguageToggle() {
  const toggle = document.getElementById('langToggle');
  const html = document.documentElement;
  const saved = localStorage.getItem('nagdag_lang') || 'af';
  setLanguage(saved);

  toggle.addEventListener('click', () => {
    const next = html.getAttribute('data-lang') === 'af' ? 'en' : 'af';
    setLanguage(next);
    localStorage.setItem('nagdag_lang', next);
    if (typeof Cart !== 'undefined') Cart.render();
  });
}

function setLanguage(lang) {
  document.documentElement.setAttribute('data-lang', lang);
  document.getElementById('langToggle').textContent = lang === 'af' ? 'EN' : 'AF';

  document.querySelectorAll('[data-af]').forEach(el => {
    const text = el.getAttribute(`data-${lang}`);
    if (text) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.innerHTML = text;
      }
    }
  });
}

function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });
}
