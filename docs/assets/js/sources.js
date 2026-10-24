/* Video source switcher: pick a video thumbnail to load it and fill in that video's method. */
(() => {
  'use strict';

  const DATA_URL = 'assets/data/techniques.json';
  const mounts = [...document.querySelectorAll('.switcher[data-technique]')];
  if (!mounts.length) return;

  /* ---------- Helpers ---------- */
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  };
  const placeholder = (text) => el('p', { class: 'placeholder' }, text);
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const isVideoId = (id) => typeof id === 'string' && /^[\w-]{11}$/.test(id);
  const safeChannelUrl = (u) => {
    try {
      const x = new URL(u);
      return x.protocol === 'https:' && /(^|\.)youtube\.com$/.test(x.hostname) && /^\/(channel\/|@|c\/|user\/)/.test(x.pathname) ? x.href : null;
    } catch { return null; }
  };
  const thumbUrl = (id, size) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${size}.jpg`;
  // Shorts get YouTube's vertical frame (oar2); other videos the bar-free 16:9 one (hq720).
  // Both fall back to the always-present hqdefault if YouTube doesn't have them.
  const thumbImg = (src, attrs) => {
    const img = el('img', { ...attrs, src: thumbUrl(src.videoId, src.format === 'short' ? 'oar2' : 'hq720'), alt: '', loading: 'lazy' });
    const fallback = () => { if (!img.src.endsWith('/hqdefault.jpg')) img.src = thumbUrl(src.videoId, 'hqdefault'); };
    img.addEventListener('error', fallback, { once: true });
    // A missing size comes back as YouTube's 120px grey placeholder rather than an error.
    img.addEventListener('load', () => { if (img.naturalWidth <= 120) fallback(); });
    if (src.format === 'short') img.classList.add('is-short');
    return img;
  };
  const watchUrl = (id, t = 0) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}${t ? `&t=${t}s` : ''}`;
  const YT_ORIGIN = 'https://www.youtube-nocookie.com';
  // enablejsapi lets the page pause and resume the player with postMessage (see "Pause when leaving a section").
  const embedUrl = (id, t = 0) =>
    `${YT_ORIGIN}/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}${t ? `&start=${Math.floor(t)}` : ''}`;

  /* ---------- Pause when leaving a section, resume when coming back ---------- */
  const playerState = new WeakMap(); // iframe -> last YouTube state (1 playing, 2 paused, 3 buffering…)
  const ytCommand = (iframe, func) =>
    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), YT_ORIGIN);

  window.addEventListener('message', (e) => {
    if (e.origin !== YT_ORIGIN) return; // only trust messages from the YouTube player itself
    const iframe = [...document.querySelectorAll('.player iframe')].find((f) => f.contentWindow === e.source);
    if (!iframe || typeof e.data !== 'string') return;
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.event === 'onStateChange' && Number.isInteger(msg.info)) playerState.set(iframe, msg.info);
    if (msg.event === 'infoDelivery' && Number.isInteger(msg.info?.playerState)) playerState.set(iframe, msg.info.playerState);
  });

  document.addEventListener('pickle:pagechange', ({ detail: { from, to } }) => {
    from?.querySelectorAll('.player iframe').forEach((iframe) => {
      const state = playerState.get(iframe);
      if (state === 1 || state === 3 || state === undefined) { // playing, buffering, or not reported yet
        ytCommand(iframe, 'pauseVideo');
        iframe.dataset.resume = '1';
      }
    });
    to?.querySelectorAll('.player iframe[data-resume]').forEach((iframe) => {
      ytCommand(iframe, 'playVideo');
      delete iframe.dataset.resume;
    });
  });

  /* ---------- Player (click-to-load, so nothing loads from YouTube until you press play) ---------- */
  const loadVideo = (player, src, t = 0) => {
    player.replaceChildren(el('iframe', {
      src: embedUrl(src.videoId, t),
      title: `${src.title} by ${src.creator}`,
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox',
      allowfullscreen: true,
      // YouTube refuses to play embeds that don't send a referrer (Error 153).
      referrerpolicy: 'strict-origin-when-cross-origin',
    }));
    // Ask the player to report its state, so we know whether it was playing when the visitor leaves the section.
    const iframe = player.querySelector('iframe');
    iframe.addEventListener('load', () => {
      iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: src.id, channel: 'widget' }), YT_ORIGIN);
    });
  };

  const renderPlayer = (src) => {
    const player = el('div', { class: src.format === 'short' ? 'player player--short' : 'player' });
    if (!src.videoId) {
      player.append(el('div', { class: 'player__empty' }, 'Video to follow'));
      return player;
    }
    const facade = el('button', { type: 'button', class: 'player__facade', 'aria-label': `Play video: ${src.title}` },
      thumbImg(src, { width: 480, height: 360 }),
      el('span', { class: 'player__play', 'aria-hidden': 'true' }));
    facade.addEventListener('click', () => loadVideo(player, src, src.start || 0)); // 'start' skips a long intro
    player.append(facade);
    return player;
  };

  /* ---------- Panel: everything below the thumbnails ---------- */
  const renderPanel = (src, { play = false, label = '' } = {}) => {
    const player = renderPlayer(src);
    if (play && src.videoId) loadVideo(player, src, src.start || 0); // the click on the thumbnail is the user's choice to play
    const frag = document.createDocumentFragment();

    if (src.intro) frag.append(el('p', { class: 'video-intro' }, src.intro));
    frag.append(player);
    frag.append(el('p', { class: 'credit' },
      'Video by ',
      safeChannelUrl(src.channelUrl) ? el('a', { href: safeChannelUrl(src.channelUrl), rel: 'noopener' }, src.creator) : src.creator,
      src.videoId ? [' · ', el('a', { href: watchUrl(src.videoId), rel: 'noopener' }, 'Watch on YouTube')] : null));

    const glance = () => (src.glance && Object.keys(src.glance).length
      ? el('dl', { class: 'glance' }, Object.entries(src.glance).map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, v))))
      : null);
    const calcButton = () => (Number.isFinite(src.saltPct)
      ? el('button', { type: 'button', class: 'btn-calc', 'data-calc-pct': src.saltPct }, `Calculate salt at ${src.saltPct}%`)
      : null);

    // Steps or key points, each with an optional timestamp button that jumps the video to that moment.
    const stepList = (items, tag, cls) => el(tag, { class: cls }, items.map((step) => {
      const li = el('li', {}, el('span', {}, step.text));
      if (src.videoId && Number.isFinite(step.t) && step.t >= 0) {
        const ts = el('button', { type: 'button', class: 'ts', 'aria-label': `Play from ${fmtTime(step.t)}` },
          `▶ ${fmtTime(step.t)}`);
        ts.addEventListener('click', () => {
          loadVideo(player, src, step.t);
          player.scrollIntoView({ block: 'nearest' });
        });
        li.append(ts);
      }
      return li;
    }));

    if (src.method?.length) {
      // A recipe: present it as a card headed "<cook>'s <label>", e.g. "Andy's quick pickle recipe".
      const cook = src.cook || src.creator;
      const titleId = `recipe-${src.id}`;
      frag.append(el('article', { class: 'recipe', 'aria-labelledby': titleId },
        el('p', { class: 'recipe__eyebrow' }, 'Recipe'),
        el('h3', { class: 'recipe__title', id: titleId }, src.recipeTitle || `${cook}'s ${label || 'recipe'}`),
        src.summary ? el('p', { class: 'recipe__summary' }, src.summary) : null,
        glance(),
        calcButton(),
        el('div', { class: 'recipe__cols' },
          src.ingredients?.length
            ? el('div', { class: 'recipe__col' }, el('h4', {}, "You'll need"),
              el('ul', { class: 'recipe__ingredients' }, src.ingredients.map((i) => el('li', {}, i))))
            : null,
          el('div', { class: 'recipe__col' }, el('h4', {}, 'Method'), stepList(src.method, 'ol', 'recipe__steps'))),
        src.tip ? el('p', { class: 'recipe__tip' }, el('strong', {}, `Tip from ${cook}: `), src.tip) : null));
      const channel = safeChannelUrl(src.channelUrl);
      if (channel) {
        const subUrl = new URL(channel);
        subUrl.searchParams.set('sub_confirmation', '1'); // YouTube shows a "Subscribe?" prompt when this opens
        frag.append(el('p', { class: 'support support--creator' }, `Enjoyed ${cook}'s recipe? `,
          el('a', { class: 'yt-sub', href: subUrl.href, target: '_blank', rel: 'noopener' }, `▶ Subscribe to ${src.creator} on YouTube`)));
      }
      frag.append(el('p', { class: 'support' }, 'Enjoying The Pickle Hub? ',
        el('a', { class: 'coffee', href: 'https://buymeacoffee.com/tamirkarp', target: '_blank', rel: 'noopener' }, '☕ Buy me a coffee')));
    } else {
      if (src.summary) frag.append(el('p', { class: 'summary' }, src.summary));
      const g = glance(); if (g) frag.append(g);
      const c = calcButton(); if (c) frag.append(c);
      if (src.points?.length) frag.append(el('h3', {}, 'Key points'), stepList(src.points, 'ul', 'method'));
      if (src.fromDescription) {
        frag.append(el('p', { class: 'from-desc' }, el('strong', {}, 'From the video description: '), src.fromDescription));
      }
      if (src.context) frag.append(el('p', { class: 'context' }, src.context));
      // Further links (https only), e.g. the original creator's channel or a full episode.
      const links = (src.links || []).filter((l) => { try { return new URL(l.url).protocol === 'https:'; } catch { return false; } });
      if (links.length) {
        frag.append(el('p', { class: 'more-links' },
          links.map((l) => el('a', { class: 'more-link', href: l.url, target: '_blank', rel: 'noopener' }, `${l.text} →`))));
      }
    }

    if (src.science) {
      frag.append(el('details', {}, el('summary', {}, "What's happening"), el('p', {}, src.science)));
    }
    if (src.troubleshooting?.length) {
      frag.append(el('details', {}, el('summary', {}, 'Troubleshooting'),
        el('ul', {}, src.troubleshooting.map((t) => el('li', {}, t)))));
    }
    if (src.compare) {
      frag.append(el('div', { class: 'compare' },
        el('strong', {}, 'How this compares to tested guidance: '), src.compare));
    }
    return frag;
  };

  /* ---------- Switcher ---------- */
  const switchers = new Map(); // technique id -> { mount, tech, tabs, panel }

  const select = (tid, sourceId, { updateHash = false, focus = false, play = false } = {}) => {
    const s = switchers.get(tid);
    if (!s) return false;
    const src = s.tech.sources.find((x) => x.id === sourceId);
    if (!src) return false;
    // A deep link to a video in another category switches the filter to match.
    if (s.setFilter && src.category && src.category !== s.filter) s.setFilter(src.category, { selectFirst: false });

    s.tabs.forEach((tab) => {
      const on = tab.dataset.source === src.id;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) {
        s.panel.setAttribute('aria-labelledby', tab.id);
        if (focus) tab.focus();
      }
    });
    s.panel.replaceChildren(renderPanel(src, { play, label: s.tech.recipeLabel }));
    if (play) s.panel.querySelector('.player')?.scrollIntoView({ block: 'nearest' });
    if (updateHash) history.replaceState(null, '', `#${tid}/${src.id}`);
    return true;
  };

  const build = (mount, tech) => {
    const tid = mount.dataset.technique;
    tech?.sources?.forEach((s) => { if (s.videoId && !isVideoId(s.videoId)) s.videoId = null; });
    if (!tech?.sources?.length) {
      return; // no videos yet: the section's 'coming soon' note covers it
    }

    const panelId = `${tid}-panel`;
    const list = el('div', { class: 'switcher__list', role: 'tablist', 'aria-label': 'Choose a video' });
    const panel = el('div', { class: 'switcher__panel', role: 'tabpanel', id: panelId });

    const tabs = tech.sources.map((src) => {
      const tab = el('button', {
        type: 'button', role: 'tab', class: 'source', id: `${tid}-tab-${src.id}`,
        'aria-controls': panelId, 'aria-selected': 'false', tabindex: '-1', 'data-source': src.id,
      },
      // Only fetch a thumbnail when there's a choice to make (a lone video's tab strip is hidden).
      src.videoId && tech.sources.length > 1
        ? thumbImg(src, { class: 'source__thumb', width: 320, height: 320 })
        : el('span', { class: 'source__thumb source__thumb--empty', 'aria-hidden': 'true' }, '▶'),
      el('span', { class: 'source__title' }, src.title),
      el('span', { class: 'source__meta' }, [src.creator, src.duration].filter(Boolean).join(' · ')));
      tab.addEventListener('click', () => select(tid, src.id, { updateHash: true, play: true }));
      return tab;
    });

    // Arrow keys move between the visible thumbnails (standard tabs pattern).
    list.addEventListener('keydown', (e) => {
      const visible = tabs.filter((t) => !t.hidden);
      const i = visible.indexOf(document.activeElement);
      if (i < 0) return;
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: visible.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      const target = visible[(next + visible.length) % visible.length];
      select(tid, target.dataset.source, { updateHash: true, focus: true });
    });

    list.append(...tabs);
    if (tabs.length === 1) list.hidden = true; // nothing to choose between yet
    const entry = { mount, tech, tabs, panel, filter: null, setFilter: null };
    switchers.set(tid, entry);

    // Optional filter buttons (e.g. Cheong / Kombucha / Soda) narrow the thumbnails to one category.
    const filters = (tech.filters || []).filter((f) => tech.sources.some((src) => src.category === f.id));
    if (filters.length) {
      const buttons = filters.map((f) => {
        const count = tech.sources.filter((src) => src.category === f.id).length;
        const b = el('button', { type: 'button', class: 'filter__btn', 'aria-pressed': 'false', 'data-filter': f.id },
          f.label, el('span', { class: 'filter__count' }, String(count)));
        b.addEventListener('click', () => entry.setFilter(f.id));
        return b;
      });
      entry.setFilter = (cat, { selectFirst = true } = {}) => {
        entry.filter = cat;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === cat)));
        tabs.forEach((t, i) => { t.hidden = tech.sources[i].category !== cat; });
        list.hidden = tabs.filter((t) => !t.hidden).length <= 1;
        const first = tech.sources.find((src) => src.category === cat);
        if (selectFirst && first) select(tid, first.id, { updateHash: true });
      };
      mount.append(el('div', { class: 'filter', role: 'group', 'aria-label': 'Show videos about' }, buttons));
      entry.setFilter(filters[0].id, { selectFirst: false });
    }

    mount.append(list, panel);
    const firstSource = (entry.filter && tech.sources.find((src) => src.category === entry.filter)) || tech.sources[0];
    select(tid, firstSource.id);
  };

  /* ---------- Deep links: #sauerkraut/source-id ---------- */
  const applyHash = () => {
    const m = location.hash.match(/^#([\w-]+)\/([\w-]+)$/);
    if (!m) return;
    if (select(m[1], m[2])) document.getElementById(m[1])?.scrollIntoView();
  };
  window.addEventListener('hashchange', applyHash);

  fetch(DATA_URL)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      mounts.forEach((mount) => build(mount, data[mount.dataset.technique]));
      applyHash();
    })
    .catch(() => mounts.forEach((mount) => mount.append(placeholder("Sorry, the videos couldn't be loaded. Try refreshing the page."))));
})();
