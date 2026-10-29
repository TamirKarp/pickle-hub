/* Instagram profile embed in the About section, click-to-load like the videos: nothing loads from Instagram (Meta)
   until the visitor chooses to show it. It's a sandboxed iframe, so Meta's script never runs on this page. */
(() => {
  'use strict';

  if (window.top !== window.self) return; // main.js hides the page when framed

  const mount = document.querySelector('.insta[data-profile]');
  if (!mount) return;
  const user = mount.dataset.profile;
  if (!/^[\w.]{1,30}$/.test(user)) return;
  const IG_ORIGIN = 'https://www.instagram.com';

  const button = mount.querySelector('.insta__load');
  button?.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.className = 'insta__frame';
    iframe.title = `Latest Instagram posts from @${user}`;
    iframe.src = `${IG_ORIGIN}/${encodeURIComponent(user)}/embed/`;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('loading', 'lazy');
    mount.replaceChildren(iframe);

    // Instagram's embed reports its height; size the frame to fit so there's no inner scrollbar.
    window.addEventListener('message', (e) => {
      if (e.origin !== IG_ORIGIN || e.source !== iframe.contentWindow || typeof e.data !== 'string') return;
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      const h = msg?.type === 'MEASURE' ? Number(msg.details?.height) : NaN;
      if (Number.isFinite(h) && h > 100 && h < 5000) iframe.style.height = `${Math.ceil(h)}px`;
    });
  });
})();
