(() => {
  'use strict';

  // Clickjacking guard: GitHub Pages can't send a frame-ancestors header, so refuse to render when framed.
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
    return;
  }

  /* ---------- Progress bar & back-to-top ---------- */
  const bar = document.querySelector('.progress__bar');
  const toTop = document.getElementById('to-top');

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
    toTop.classList.toggle('is-visible', window.scrollY > 600);
  };
  toTop.addEventListener('click', () => window.scrollTo({ top: 0 }));

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Mobile contents sheet ---------- */
  const toc = document.getElementById('toc');
  const toggle = document.getElementById('toc-toggle');
  const scrim = document.getElementById('toc-scrim');

  const setOpen = (open) => {
    toc.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    scrim.hidden = !open;
    document.documentElement.classList.toggle('sheet-open', open); // stop the page behind from scrolling
    // Keep keyboard focus inside the open menu: the page behind can't be tabbed to.
    document.querySelectorAll('#main, .footer').forEach((el) => { el.inert = open; });
    if (open) (toc.querySelector('a[aria-current="true"]') || toc.querySelector('a'))?.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', () => setOpen(!toc.classList.contains('is-open')));
  scrim.addEventListener('click', () => setOpen(false));
  toc.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toc.classList.contains('is-open')) { setOpen(false); toggle.focus({ preventScroll: true }); }
  });

  /* ---------- Brine calculator ---------- */
  const form = document.getElementById('calc-form');
  if (!form) return;

  const pctInput = document.getElementById('calc-pct');
  const weightInput = document.getElementById('calc-weight');
  const unitSelect = document.getElementById('calc-unit');
  const saltOut = document.getElementById('calc-salt');
  const subOut = document.getElementById('calc-sub');
  const warnOut = document.getElementById('calc-warn');
  const chips = [...form.querySelectorAll('.chip')];

  const TO_GRAMS = { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237 };
  const GRAMS_PER_TSP = 6; // fine sea salt / table salt, level teaspoon
  const fmt = (n, dp = 1) => n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  // Text boxes rather than number inputs, so "1,5" isn't silently read as 15. A comma is a decimal point,
  // unless it's clearly a thousands separator ("1,000" or "1,250.5").
  const parse = (el) => {
    let v = el.value.trim().replace(/\s/g, '');
    if (!v || v.length > 32) return NaN;
    v = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v) ? v.replace(/,/g, '') : v.replace(',', '.');
    return /^(?:\d+(?:\.\d*)?|\.\d+)(?:e\d+)?$/i.test(v) ? Number(v) : NaN;
  };
  const MAX_PCT = 30;

  const calculate = () => {
    const pct = parse(pctInput);
    const weight = parse(weightInput);
    const unit = unitSelect.value;

    chips.forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.pct) === pct)));

    warnOut.hidden = true;
    if (Number.isFinite(pct) && pct > 0 && pct < 2) {
      warnOut.textContent = 'Below 2% salt, ferments are more likely to go soft or grow mould. Most vegetable ferments use 2% or more.';
      warnOut.hidden = false;
    } else if (Number.isFinite(pct) && pct > 10 && pct <= MAX_PCT) {
      warnOut.textContent = 'Over 10% is unusually salty. Double-check your recipe.';
      warnOut.hidden = false;
    }

    if (!Number.isFinite(pct) || pct <= 0 || pct > MAX_PCT || !Number.isFinite(weight) || weight <= 0) {
      saltOut.textContent = '0 g';
      subOut.textContent = !Number.isFinite(pct) || pct <= 0 ? 'Enter a brine strength above 0%.'
        : pct > MAX_PCT ? `Enter a brine strength of ${MAX_PCT}% or less.`
        : 'Enter a weight to see how much salt you need.';
      return;
    }

    const grams = weight * (TO_GRAMS[unit] || NaN) * (pct / 100);
    if (!Number.isFinite(grams)) {
      saltOut.textContent = '0 g';
      subOut.textContent = 'That number is too large to work with.';
      return;
    }
    saltOut.textContent = `${fmt(grams)} g`;

    const tsp = grams / GRAMS_PER_TSP;
    const parts = [`${fmt(weight, weight % 1 ? 2 : 0)} ${unit} at ${pct.toLocaleString('en-GB', { maximumFractionDigits: 2 })}%`];
    if (unit === 'oz' || unit === 'lb') parts.push(`${fmt(grams / TO_GRAMS.oz, 2)} oz salt`);
    parts.push(`roughly ${fmt(tsp, 1)} level tsp of fine salt (weigh it if you can: flaky and kosher salts vary a lot)`);
    subOut.textContent = parts.join(' · ');
  };

  form.addEventListener('input', calculate);
  form.addEventListener('submit', (e) => e.preventDefault());
  chips.forEach((chip) => chip.addEventListener('click', () => {
    pctInput.value = chip.dataset.pct;
    calculate();
  }));

  // "Calculate salt at X%" buttons in technique sections (delegated: they're rendered dynamically)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-calc-pct]');
    if (!btn) return;
    pctInput.value = btn.dataset.calcPct;
    calculate();
    // router.js shows the calculator on hashchange; focus the weight box once it has.
    // Select any old weight so typing replaces it rather than adding to it.
    const focusWeight = () => { weightInput.focus({ preventScroll: true }); weightInput.select(); };
    if (location.hash === '#calculator') {
      focusWeight();
    } else {
      window.addEventListener('hashchange', focusWeight, { once: true });
      location.hash = '#calculator';
    }
    form.classList.remove('calc--flash');
    void form.offsetWidth; // restart the animation
    form.classList.add('calc--flash');
  });

  calculate();
})();
