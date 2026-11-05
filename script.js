/* SEVER Coffee Room — interactions (vanilla JS, no dependencies). */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileNav = window.matchMedia('(max-width: 1023px)');

  root.classList.add('js');

  /* ---------- Header: solid on scroll, hides while scrolling down ---------- */
  let lastY = window.scrollY;
  let ticking = false;

  const updateHeader = () => {
    const y = window.scrollY;
    const navOpen = body.classList.contains('nav-open');
    header.classList.toggle('is-scrolled', y > 24);

    const hide = !navOpen && y > 480 && y > lastY + 2;
    const show = navOpen || y < lastY - 2 || y <= 480;
    if (hide) header.classList.add('is-hidden');
    else if (show) header.classList.remove('is-hidden');

    body.classList.toggle('header-visible', !header.classList.contains('is-hidden'));
    lastY = y;
    ticking = false;
  };

  if (header) {
    updateHeader();
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
    header.addEventListener('focusin', () => {
      header.classList.remove('is-hidden');
      body.classList.add('header-visible');
    });
  }

  /* ---------- Mobile navigation ---------- */
  if (toggle && nav) {
    const outside = [document.querySelector('main'), document.querySelector('.site-footer')].filter(Boolean);
    const label = toggle.querySelector('.nav-toggle__label');

    const focusables = () => [toggle, ...nav.querySelectorAll('a[href], button:not([disabled])')];

    const setOpen = (open, { returnFocus = false } = {}) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      if (label) label.textContent = open ? 'Закрыть' : 'Меню';
      nav.classList.toggle('is-open', open);
      body.classList.toggle('nav-open', open);
      outside.forEach((el) => { el.inert = open; });
      if (open) {
        header.classList.remove('is-hidden');
        const first = nav.querySelector('a[href]');
        if (first) window.setTimeout(() => first.focus({ preventScroll: true }), reduceMotion.matches ? 0 : 200);
      } else if (returnFocus) {
        toggle.focus();
      }
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a') && body.classList.contains('nav-open')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (!body.classList.contains('nav-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false, { returnFocus: true });
        return;
      }
      if (event.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    const onBreakpoint = () => {
      if (!mobileNav.matches && body.classList.contains('nav-open')) setOpen(false);
    };
    if (mobileNav.addEventListener) mobileNav.addEventListener('change', onBreakpoint);
    else mobileNav.addListener(onBreakpoint);
  }

  /* ---------- Scroll reveal ---------- */
  const revealItems = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    revealItems.forEach((el) => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealItems.forEach((el) => observer.observe(el));
  }

  /* ---------- About: footer links to #credits open the collapsed credits list ---------- */
  const openCreditsFromHash = () => {
    if (window.location.hash !== '#credits') return;
    const details = document.querySelector('#credits details');
    if (details) details.open = true;
  };
  openCreditsFromHash();
  window.addEventListener('hashchange', openCreditsFromHash);

  /* ---------- Menu: expandable items (one open item per category) ---------- */
  const loadImage = (img) => {
    if (!img || img.dataset.loaded) return;
    img.dataset.loaded = 'true';
    const done = () => img.classList.add('is-loaded');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    if (img.complete && img.naturalWidth) done();
  };

  document.querySelectorAll('[data-accordion]').forEach((list) => {
    const triggers = [...list.querySelectorAll('.item__trigger')];

    const setItem = (trigger, open) => {
      const item = trigger.closest('.item');
      trigger.setAttribute('aria-expanded', String(open));
      item.classList.toggle('is-open', open);
      if (open) loadImage(item.querySelector('.item__media img'));
    };

    triggers.forEach((trigger, index) => {
      const preload = () => loadImage(trigger.closest('.item').querySelector('.item__media img'));
      trigger.addEventListener('pointerenter', preload, { once: true });
      trigger.addEventListener('focus', preload, { once: true });

      trigger.addEventListener('click', () => {
        const open = trigger.getAttribute('aria-expanded') !== 'true';
        triggers.forEach((other) => { if (other !== trigger && other.getAttribute('aria-expanded') === 'true') setItem(other, false); });
        setItem(trigger, open);

        // If closing an item above pushed this row out of view, bring it back gently.
        if (open) {
          window.setTimeout(() => {
            const top = trigger.getBoundingClientRect().top;
            const offset = (header ? header.offsetHeight : 0) + 72;
            if (top < offset) {
              window.scrollBy({ top: top - offset, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
            }
          }, reduceMotion.matches ? 0 : 360);
        }
      });

      // Arrow keys, Home and End move between rows of the same category.
      trigger.addEventListener('keydown', (event) => {
        let target = null;
        if (event.key === 'ArrowDown') target = triggers[(index + 1) % triggers.length];
        else if (event.key === 'ArrowUp') target = triggers[(index - 1 + triggers.length) % triggers.length];
        else if (event.key === 'Home') target = triggers[0];
        else if (event.key === 'End') target = triggers[triggers.length - 1];
        if (target) {
          event.preventDefault();
          target.focus();
        }
      });
    });
  });

  /* ---------- Menu: highlight the category in view ---------- */
  const menuLinks = document.querySelectorAll('.menu-nav__link');
  if (menuLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map([...menuLinks].map((link) => [link.hash.slice(1), link]));
    const sections = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    const setActive = (id) => {
      menuLinks.forEach((link) => {
        if (link.hash.slice(1) === id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach((section) => spy.observe(section));
  }
})();
