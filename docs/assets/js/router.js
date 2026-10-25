/* Section router: show one section at a time, chosen by the URL hash (#science, #sauerkraut/demo-b…).
   Without JavaScript every section stays visible, so the page still works as one long scroll. */
(() => {
  'use strict';

  if (window.top !== window.self) return; // main.js hides the page when framed

  // Every link marked data-page (header, topics row, phone menu) points at a section.
  const tocLinks = [...document.querySelectorAll('a[data-page]')];
  const pages = [...new Set(tocLinks.map((a) => a.getAttribute('href').slice(1)))]
    .map((id) => document.getElementById(id))
    .filter((el) => el && el.classList.contains('section'));
  if (!pages.length) return;

  document.documentElement.classList.add('is-paged');
  // A section's full name: the first link's data-title, or failing that the longest link text for it.
  const titles = new Map();
  tocLinks.forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    const name = a.dataset.title || a.textContent.trim();
    if (a.dataset.title || name.length > (titles.get(id) || '').length) titles.set(id, name);
  });
  tocLinks.filter((a) => a.dataset.title).forEach((a) => titles.set(a.getAttribute('href').slice(1), a.dataset.title));
  const hero = document.querySelector('.hero');
  const topbarTitle = document.getElementById('topbar-title');
  const home = pages[0];
  let current = null;

  /* ---------- Previous / Next links at the end of each section ---------- */
  pages.forEach((page, i) => {
    const pager = document.createElement('nav');
    pager.className = 'pager';
    pager.setAttribute('aria-label', 'Previous and next sections');
    const link = (target, dir) => {
      const a = document.createElement('a');
      a.href = `#${target.id}`;
      a.className = `pager__link pager__link--${dir}`;
      const label = document.createElement('span');
      label.className = 'pager__label';
      label.textContent = dir === 'prev' ? '← Previous' : 'Next →';
      const name = document.createElement('span');
      name.className = 'pager__name';
      name.textContent = titles.get(target.id);
      a.append(label, name);
      return a;
    };
    if (pages[i - 1]) pager.append(link(pages[i - 1], 'prev'));
    if (pages[i + 1]) pager.append(link(pages[i + 1], 'next'));
    page.append(pager);
    page.querySelector('h2')?.setAttribute('tabindex', '-1'); // focus target for screen readers
  });

  /* ---------- Show a section ---------- */
  const show = (page, { focus = false, scrollTo = null } = {}) => {
    if (page !== current) {
      pages.forEach((p) => { p.hidden = p !== page; });
      if (hero) hero.hidden = page !== home;
      tocLinks.forEach((a) => {
        if (a.getAttribute('href') === `#${page.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      if (topbarTitle) topbarTitle.textContent = titles.get(page.id) || 'The Pickle Hub';
      document.title = page === home ? 'The Pickle Hub' : `${titles.get(page.id)} · The Pickle Hub`;
      // Let other scripts react to the switch (sources.js pauses and resumes videos).
      document.dispatchEvent(new CustomEvent('pickle:pagechange', { detail: { from: current, to: page } }));
      current = page;
    }
    if (scrollTo) scrollTo.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
    if (focus) page.querySelector('h2')?.focus({ preventScroll: true });
  };

  /* ---------- Work out what the hash points at ---------- */
  const route = ({ focus = false } = {}) => {
    let raw = location.hash.slice(1);
    try { raw = decodeURIComponent(raw); } catch { raw = ''; } // e.g. a lone % in a crafted link
    const id = raw.split('/')[0];
    const target = id && document.getElementById(id);

    if (!target) { show(current || home); return; }

    const page = pages.find((p) => p === target || p.contains(target));
    if (!page && hero?.contains(target)) {
      // The home page's own parts (#top, #explore): go home first, then scroll to them.
      show(home, { scrollTo: target === hero ? null : target });
    } else if (page) {
      // A whole section, or something inside one (e.g. #season): show its section, then scroll to it.
      show(page, { focus: focus && page === target, scrollTo: page === target ? null : target });
    } else {
      // Something outside the sections (e.g. #subscribe): keep the current section and scroll down to it.
      show(current || home, { scrollTo: target });
    }
  };

  window.addEventListener('hashchange', () => route({ focus: true }));
  // Clicking a link to where you already are doesn't change the hash, so handle it here (back to the top of the section).
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href') === location.hash) route({ focus: true });
  });
  route();
})();
