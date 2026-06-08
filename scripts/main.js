const hamburger = document.querySelector('.hamburger');
const nav = document.querySelector('.site-nav');
const main = document.querySelector('.main-content');
const navDot = document.querySelector('.nav-dot');
const themeToggle = document.querySelector('.theme-toggle');

hamburger.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

// Theme toggle (initial theme is set by the inline script in <head> to avoid a flash)
if (themeToggle) {
  const syncPressed = () =>
    themeToggle.setAttribute(
      'aria-pressed',
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
  syncPressed();

  themeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncPressed();
  });
}

nav.addEventListener('click', e => {
  if (e.target.closest('a')) {
    nav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
});

// Fade in on load (defer guarantees DOM is ready)
requestAnimationFrame(() => main.classList.add('is-visible'));

// Active nav dot positioning
(function () {
  const activeLink = nav.querySelector('.nav-link[aria-current="page"]');
  if (!activeLink || !navDot) return;
  nav.classList.add('has-active');

  function positionDot() {
    const linkRect = activeLink.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const top = linkRect.top - navRect.top + (linkRect.height / 2) - (navDot.offsetHeight / 2);
    navDot.style.top = top + 'px';
  }

  positionDot();
  window.addEventListener('resize', positionDot);
})();

// Carry blur state across page transitions so nav doesn't snap to unblurred
if (sessionStorage.getItem('nav-blur')) {
  sessionStorage.removeItem('nav-blur');
  nav.classList.add('blur-enter');
  requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.remove('blur-enter')));
}

// ---- Controlled section scrolling ----
(function () {
  if (!window.matchMedia('(min-width: 768px)').matches) return;

  const sections = [...document.querySelectorAll('.hero, .page-section')];
  if (sections.length < 2) return;

  let currentIndex = 0;
  let isAnimating = false;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build dots indicator
  const dotsNav = document.createElement('nav');
  dotsNav.className = 'section-dots';
  dotsNav.setAttribute('aria-label', 'Page sections');
  const dots = sections.map((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'section-dot' + (i === 0 ? ' active' : '');
    btn.setAttribute('aria-label', `Go to section ${i + 1}`);
    btn.addEventListener('click', () => scrollToSection(i));
    dotsNav.appendChild(btn);
    return btn;
  });
  document.body.appendChild(dotsNav);

  function updateDots() {
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function scrollToSection(index) {
    if (index < 0 || index >= sections.length || isAnimating) return;
    currentIndex = index;
    isAnimating = true;
    updateDots();

    const target = sections[index].getBoundingClientRect().top + window.scrollY;
    const start = window.scrollY;
    const distance = target - start;
    const duration = 900;

    if (prefersReducedMotion || distance === 0) {
      window.scrollTo(0, target);
      isAnimating = false;
      return;
    }

    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start + distance * easeInOutCubic(progress));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        window.scrollTo(0, target);
        isAnimating = false;
      }
    }

    requestAnimationFrame(step);
  }

  // When a section is taller than the viewport, let it scroll natively
  // until its edge is reached before snapping to the next section.
  function canScrollWithin(index, dir) {
    const vh = window.innerHeight;
    const rect = sections[index].getBoundingClientRect();
    if (rect.height <= vh + 1) return false;
    const top = rect.top + window.scrollY;
    const bottom = top + rect.height;
    return dir > 0
      ? window.scrollY + vh < bottom - 1
      : window.scrollY > top + 1;
  }

  window.addEventListener('wheel', e => {
    if (isAnimating) {
      e.preventDefault();
      return;
    }
    const dir = e.deltaY > 0 ? 1 : -1;
    if (canScrollWithin(currentIndex, dir)) return; // allow native scroll inside tall section
    if (dir > 0 && currentIndex < sections.length - 1) {
      e.preventDefault();
      scrollToSection(currentIndex + 1);
    } else if (dir < 0 && currentIndex > 0) {
      e.preventDefault();
      scrollToSection(currentIndex - 1);
    }
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      if (canScrollWithin(currentIndex, 1)) return;
      if (currentIndex < sections.length - 1) {
        e.preventDefault();
        if (!isAnimating) scrollToSection(currentIndex + 1);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      if (canScrollWithin(currentIndex, -1)) return;
      if (currentIndex > 0) {
        e.preventDefault();
        if (!isAnimating) scrollToSection(currentIndex - 1);
      }
    }
  });

  let touchStartY = 0;
  window.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', e => {
    if (isAnimating) return;
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 30) return;
    const dir = delta > 0 ? 1 : -1;
    if (canScrollWithin(currentIndex, dir)) return; // allow native scroll inside tall section
    if (dir > 0 && currentIndex < sections.length - 1) {
      scrollToSection(currentIndex + 1);
    } else if (dir < 0 && currentIndex > 0) {
      scrollToSection(currentIndex - 1);
    }
  }, { passive: true });
})();

function navigateTo(href) {
  let navigated = false;

  function go() {
    if (navigated) return;
    navigated = true;
    sessionStorage.setItem('nav-blur', '1');
    window.location.href = href;
  }

  main.classList.remove('is-visible');
  main.addEventListener('transitionend', e => {
    if (e.propertyName === 'opacity') go();
  }, { once: true });

  // Fallback if transitionend doesn't fire (e.g. prefers-reduced-motion)
  setTimeout(go, 350);
}

document.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || link.target) return;

  e.preventDefault();
  navigateTo(href);
});
