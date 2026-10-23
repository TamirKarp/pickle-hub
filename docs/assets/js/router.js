/* Section router: show one section at a time, chosen by the URL hash (#science, #sauerkraut/demo-b…).
   Without JavaScript every section stays visible, so the page still works as one long scroll. */
(() => {
  'use strict';

  if (window.top !== window.self) return; // main.js hides the page when framed

  const tocLinks = [...document.querySelectorAll('.toc__list a')];
  const pages = tocLinks
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter((el) => el && el.classList.contains('section'));
  if (!pages.length) return;

  document.documentElement.classList.add('is-paged');
  const titles = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a.textContent.trim()]));
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
      current = page;
    }
    if (scrollTo) scrollTo.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
    if (focus) page.querySelector('h2')?.focus({ preventScroll: true });
  };

  /* ---------- Work out what the hash points at ---------- */
  const route = ({ focus = false } = {}) => {
    const id = decodeURIComponent(location.hash.slice(1)).split('/')[0];
    const target = id && document.getElementById(id);

    if (!target) { show(current || home); return; }

    const page = pages.find((p) => p === target || p.contains(target));
    if (page) {
      // A whole section, or something inside one (e.g. #season): show its section, then scroll to it.
      show(page, { focus: focus && page === target, scrollTo: page === target ? null : target });
    } else {
      // Something outside the sections (e.g. #subscribe): keep the current section and scroll down to it.
      show(current || home, { scrollTo: target });
    }
  };

  window.addEventListener('hashchange', () => route({ focus: true }));
  route();
})();
