/* ============================================================
   Josiah Legg - Portfolio
   The sidebar is set up once and persists for the life of the tab.
   Page navigations swap only <main> in place (a small fetch-based
   router) so the sidebar never reloads and the content blurs out/in.
   ============================================================ */

// ---- Persistent sidebar elements (never replaced) ----
const nav = document.querySelector('.site-nav');
const navDot = document.querySelector('.nav-dot');
const hamburger = document.querySelector('.hamburger');
const themeToggle = document.querySelector('.theme-toggle');

// Live reference to the current main; reassigned only if it's ever replaced.
let main = document.querySelector('.main-content');

/* ---------- Path helpers ---------- */
// Normalise so "/projects/", "/projects", and "/projects/index.html" compare equal.
function normalizePath(pathname) {
  let p = pathname.replace(/index\.html$/, '');
  if (!p.endsWith('/')) p += '/';
  return p;
}

const samePath = (a, b) => normalizePath(a) === normalizePath(b);

/* ---------- Mobile nav ---------- */
function closeNav() {
  nav.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}

hamburger.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

/* ---------- Theme toggle ----------
   (Initial theme is set by the inline <head> script to avoid a flash.) */
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

/* ---------- Active nav state ----------
   Mark the nav link (and the logo, for the home page) matching the current
   path. Skips external links so the YouTube/Resume link is never "current". */
function syncActiveNav() {
  const here = location.pathname;

  nav.querySelectorAll('.nav-link').forEach(link => {
    const external = link.target === '_blank' ||
      new URL(link.href, location.href).origin !== location.origin;
    const active = !external && samePath(new URL(link.href).pathname, here);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const logo = document.querySelector('.logo');
  if (logo) {
    if (samePath(new URL(logo.href).pathname, here)) logo.setAttribute('aria-current', 'page');
    else logo.removeAttribute('aria-current');
  }
}

/* ---------- Nav dot ----------
   Rests on the active item, and while the cursor is over the menu it follows
   along — snapping to the nearest item and leaning toward the cursor with a
   springy wiggle until the cursor crosses to the next item. */
const navDotController = (function () {
  if (!navDot) return { refresh() {} };

  const links = () => [...nav.querySelectorAll('.nav-link')];
  const canHover = window.matchMedia('(hover: hover)');

  let current = null;   // animated top (px), null until first placed
  let target = 0;       // where the dot wants to be (px)
  let velocity = 0;
  let hovering = false;
  let raf = null;
  let leaveTimer = null;

  const dotHalf = () => navDot.offsetHeight / 2;
  const activeLink = () => nav.querySelector('.nav-link[aria-current="page"]');

  function centerOf(link) {
    const r = link.getBoundingClientRect();
    const navR = nav.getBoundingClientRect();
    return r.top - navR.top + r.height / 2;
  }

  const restCenter = () => {
    const a = activeLink();
    return a ? centerOf(a) : null;
  };

  function tick() {
    velocity += (target - current) * 0.56;
    velocity *= 0.46;
    current += velocity;
    navDot.style.top = current + 'px';

    if (Math.abs(velocity) > 0.04 || Math.abs(target - current) > 0.04) {
      raf = requestAnimationFrame(tick);
    } else {
      current = target;
      navDot.style.top = current + 'px';
      raf = null;
    }
  }

  const start = () => { if (raf == null) raf = requestAnimationFrame(tick); };

  function snapTo(top) {
    current = target = top;
    velocity = 0;
    navDot.style.top = current + 'px';
  }

  nav.addEventListener('mousemove', e => {
    if (!canHover.matches) return;
    clearTimeout(leaveTimer);
    hovering = true;
    nav.classList.add('has-active'); // show the dot even on pages with no active item

    const cursorY = e.clientY - nav.getBoundingClientRect().top;

    // Snap to the nearest item by center...
    let nearest = null;
    let best = Infinity;
    for (const link of links()) {
      const d = Math.abs(centerOf(link) - cursorY);
      if (d < best) { best = d; nearest = link; }
    }
    if (!nearest) return;

    // ...then lean a little toward the cursor — but only a damped fraction of
    // the cursor's offset, so the dot subtly responds rather than tracking it.
    const center = centerOf(nearest);
    const lean = Math.max(-4, Math.min(4, (cursorY - center) * 0.16));

    if (current == null) snapTo(center - dotHalf());
    target = center + lean - dotHalf();
    start();
  });

  // Brief delay so darting across the small gaps between items doesn't snap back.
  nav.addEventListener('mouseleave', () => {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      hovering = false;
      refresh();
    }, 60);
  });

  // Re-rest on the active item (called on load and after each page swap).
  function refresh() {
    const rest = restCenter();
    if (rest == null) {
      if (!hovering) nav.classList.remove('has-active');
      return;
    }
    nav.classList.add('has-active');
    const top = rest - dotHalf();
    if (current == null) snapTo(top);
    else if (!hovering) { target = top; start(); }
  }

  window.addEventListener('resize', () => { if (!hovering) refresh(); });

  refresh();
  return { refresh };
})();

/* ============================================================
   Per-page setup / teardown
   Everything tied to the current main's content lives here so it can be
   cleanly torn down before the next page is swapped in.
   ============================================================ */
function setupPage() {
  const ac = new AbortController();
  const cleanups = [() => ac.abort()];

  // Reveal: blur/fade in on the next frame.
  requestAnimationFrame(() => main.classList.add('is-visible'));

  initSectionScrolling(ac.signal, cleanups);

  return () => cleanups.forEach(fn => fn());
}

// ---- Controlled section scrolling (one screen at a time on desktop) ----
function initSectionScrolling(signal, cleanups) {
  if (!window.matchMedia('(min-width: 768px)').matches) return;
  // Don't hijack the wheel for users who prefer reduced motion — let them
  // scroll the sections natively.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const sections = [...main.querySelectorAll('.hero, .page-section')];
  if (sections.length < 2) return;

  let currentIndex = 0;
  let isAnimating = false;

  // Build the dots indicator.
  const dotsNav = document.createElement('nav');
  dotsNav.className = 'section-dots';
  dotsNav.setAttribute('aria-label', 'Page sections');
  const dots = sections.map((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'section-dot' + (i === 0 ? ' active' : '');
    btn.setAttribute('aria-label', `Go to section ${i + 1}`);
    btn.addEventListener('click', () => scrollToSection(i), { signal });
    dotsNav.appendChild(btn);
    return btn;
  });
  document.body.appendChild(dotsNav);
  cleanups.push(() => dotsNav.remove());

  const updateDots = () =>
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));

  const easeInOutCubic = t =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function scrollToSection(index) {
    if (index < 0 || index >= sections.length || isAnimating) return;
    currentIndex = index;
    isAnimating = true;
    updateDots();

    const target = sections[index].getBoundingClientRect().top + window.scrollY;
    const start = window.scrollY;
    const distance = target - start;
    const duration = 900;

    if (distance === 0) {
      window.scrollTo(0, target);
      isAnimating = false;
      return;
    }

    const startTime = performance.now();
    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, start + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
      else { window.scrollTo(0, target); isAnimating = false; }
    }
    requestAnimationFrame(step);
  }

  // When a section is taller than the viewport, scroll natively to its edge
  // before snapping to the next section.
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
    if (isAnimating) { e.preventDefault(); return; }
    const dir = e.deltaY > 0 ? 1 : -1;
    if (canScrollWithin(currentIndex, dir)) return;
    if (dir > 0 && currentIndex < sections.length - 1) {
      e.preventDefault();
      scrollToSection(currentIndex + 1);
    } else if (dir < 0 && currentIndex > 0) {
      e.preventDefault();
      scrollToSection(currentIndex - 1);
    }
  }, { passive: false, signal });

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
  }, { signal });

  let touchStartY = 0;
  window.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true, signal });

  window.addEventListener('touchend', e => {
    if (isAnimating) return;
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 30) return;
    const dir = delta > 0 ? 1 : -1;
    if (canScrollWithin(currentIndex, dir)) return;
    if (dir > 0 && currentIndex < sections.length - 1) scrollToSection(currentIndex + 1);
    else if (dir < 0 && currentIndex > 0) scrollToSection(currentIndex - 1);
  }, { passive: true, signal });
}

/* ============================================================
   Router — swap <main> in place, keep the sidebar untouched.
   ============================================================ */
let disposePage = setupPage();

function waitForBlurOut() {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      main.removeEventListener('transitionend', onEnd);
      resolve();
    };
    const onEnd = e => {
      if (e.target === main && e.propertyName === 'opacity') finish();
    };
    main.addEventListener('transitionend', onEnd);
    setTimeout(finish, 500); // fallback if transitionend doesn't fire
  });
}

async function navigate(href, { push = true } = {}) {
  const url = new URL(href, location.href);

  let html;
  try {
    const res = await fetch(url.href, { headers: { 'X-Requested-With': 'fetch' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch {
    window.location.href = url.href; // graceful fallback to a full navigation
    return;
  }

  closeNav();

  // Blur the current content out, then wait for it to finish.
  main.classList.remove('is-visible');
  await waitForBlurOut();

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const incoming = doc.querySelector('.main-content');
  if (!incoming) { window.location.href = url.href; return; }

  // Tear down the old page, swap content in place (same element → transitions
  // keep working), and update everything that depends on the new page.
  disposePage();
  main.innerHTML = incoming.innerHTML;
  main.className = incoming.className; // resets to "main-content" → starts blurred
  document.title = doc.title || document.title;

  if (push) history.pushState({}, '', url.href);
  window.scrollTo(0, 0);

  syncActiveNav();
  navDotController.refresh();

  // Move focus to the new content for keyboard / screen-reader users.
  main.setAttribute('tabindex', '-1');
  main.focus({ preventScroll: true });

  disposePage = setupPage();
}

// Intercept same-origin link clicks.
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || link.target === '_blank' || link.hasAttribute('download')) return;

  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return;       // external
  if (url.hash && samePath(url.pathname, location.pathname)) return; // in-page anchor

  e.preventDefault();
  if (samePath(url.pathname, location.pathname)) return; // already here
  navigate(url.href);
});

window.addEventListener('popstate', () => navigate(location.href, { push: false }));

/* ---------- Copy to clipboard ----------
   Elements with [data-copy] (e.g. the email on /contact/) copy their value
   instead of navigating, and flash a "Copied" confirmation. The mailto href
   stays as a no-JS fallback. Delegated so it survives page swaps. */
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-copy]');
  if (!el) return;
  e.preventDefault();

  const text = el.getAttribute('data-copy');
  const flash = () => {
    el.classList.add('copied');
    clearTimeout(el._copyTimer);
    el._copyTimer = setTimeout(() => el.classList.remove('copied'), 1600);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(flash, () => { if (fallbackCopy(text)) flash(); });
  } else if (fallbackCopy(text)) {
    flash();
  }
});

// Keep the active state correct on first load.
syncActiveNav();
navDotController.refresh();
