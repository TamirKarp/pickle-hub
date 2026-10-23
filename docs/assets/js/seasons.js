/* UK seasonal calendar: pick a month to see what's worth fermenting or pickling. */
(() => {
  'use strict';

  const root = document.getElementById('season');
  if (!root) return;

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const tabsEl = root.querySelector('.season__months');
  const title = document.getElementById('season-title');
  const list = document.getElementById('season-list');
  const panel = document.getElementById('season-panel');

  fetch('assets/data/seasons.json')
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(({ months }) => {
      const tabs = MONTHS.map((name, i) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'season__month';
        tab.id = `season-tab-${i}`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panel.id);
        tab.setAttribute('aria-label', name);
        tab.textContent = name.slice(0, 3);
        tab.addEventListener('click', () => show(i));
        tabsEl.append(tab);
        return tab;
      });

      const show = (i, focus = false) => {
        tabs.forEach((t, j) => {
          t.setAttribute('aria-selected', String(i === j));
          t.tabIndex = i === j ? 0 : -1;
        });
        if (focus) tabs[i].focus();
        panel.setAttribute('aria-labelledby', tabs[i].id);
        title.textContent = `In season in ${MONTHS[i]}`;
        list.replaceChildren(...months[i].map((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          return li;
        }));
      };

      // Arrow keys move between months (standard tabs pattern).
      tabsEl.addEventListener('keydown', (e) => {
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: 11 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        show((next + 12) % 12, true);
      });

      show(new Date().getMonth());
    })
    .catch(() => {
      title.textContent = "Sorry, the calendar couldn't be loaded.";
    });
})();
