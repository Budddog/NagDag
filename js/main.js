// ========================================
// Nag & Dag – Main JS
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Age verification
  initAgeGate();
  // Mobile menu
  initMobileMenu();
  // Language toggle
  initLanguageToggle();
  // FAQ accordion
  initFAQ();
  // Scroll animations
  initScrollAnimations();
  // Smooth scroll for nav links
  initSmoothScroll();
  // Nav scroll effect
  initNavScroll();
});

// ----------------------------------------
// Age Gate
// ----------------------------------------
function initAgeGate() {
  const overlay = document.getElementById('ageOverlay');
  const confirmBtn = document.getElementById('ageConfirm');

  if (localStorage.getItem('nagdag_age_verified') === 'true') {
    overlay.classList.add('hidden');
    setTimeout(() => overlay.style.display = 'none', 500);
    return;
  }

  document.body.style.overflow = 'hidden';

  confirmBtn.addEventListener('click', () => {
    localStorage.setItem('nagdag_age_verified', 'true');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    setTimeout(() => overlay.style.display = 'none', 500);
  });
}

// ----------------------------------------
// Mobile Menu
// ----------------------------------------
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const links = document.getElementById('navLinks');

  btn.addEventListener('click', () => {
    links.classList.toggle('active');
    btn.classList.toggle('active');
  });

  // Close on link click
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('active');
      btn.classList.remove('active');
    });
  });
}

// ----------------------------------------
// Language Toggle
// ----------------------------------------
function initLanguageToggle() {
  const toggle = document.getElementById('langToggle');
  const html = document.documentElement;

  const savedLang = localStorage.getItem('nagdag_lang') || 'af';
  setLanguage(savedLang);

  toggle.addEventListener('click', () => {
    const current = html.getAttribute('data-lang');
    const next = current === 'af' ? 'en' : 'af';
    setLanguage(next);
    localStorage.setItem('nagdag_lang', next);
  });
}

function setLanguage(lang) {
  const html = document.documentElement;
  html.setAttribute('data-lang', lang);
  const toggle = document.getElementById('langToggle');
  toggle.textContent = lang === 'af' ? 'EN' : 'AF';

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

// ----------------------------------------
// FAQ Accordion
// ----------------------------------------
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

      // Open clicked if it wasn't active
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// ----------------------------------------
// Scroll Animations
// ----------------------------------------
function initScrollAnimations() {
  const elements = document.querySelectorAll(
    '.empathy-card, .product-card, .step, .testimonial, .trust-item, .bundle-card, .share-card'
  );

  elements.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

// ----------------------------------------
// Smooth Scroll
// ----------------------------------------
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ----------------------------------------
// Nav Scroll Effect
// ----------------------------------------
function initNavScroll() {
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 100) {
      nav.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)';
    } else {
      nav.style.boxShadow = 'none';
    }
    lastScroll = currentScroll;
  });
}
