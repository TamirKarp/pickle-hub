/* Google Analytics, only with the visitor's OK. Until they say yes on the cookie message, nothing loads from
   Google and no cookies are set. The choice is remembered in this browser and can be changed from the footer. */
(() => {
  'use strict';

  if (window.top !== window.self) return; // main.js hides the page when framed

  const GA_ID = 'G-KGB3SPX7LC';
  const GA_URL = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  const KEY = 'pickle-analytics-consent'; // 'granted' or 'denied'
  const banner = document.getElementById('consent');
  if (!banner) return;

  const readChoice = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const saveChoice = (v) => { try { localStorage.setItem(KEY, v); } catch { /* private mode: ask again next visit */ } };

  /* ---------- Loading Google's script ---------- */
  // The page only lets scripts be added through a named Trusted Types policy, and this one allows exactly one URL.
  const policy = window.trustedTypes?.createPolicy('pickle-analytics', {
    createScriptURL: (url) => {
      if (url !== GA_URL) throw new TypeError('Blocked script URL');
      return url;
    },
  });

  let loaded = false;
  const sendView = () => window.gtag?.('event', 'page_view', { page_location: location.href, page_title: document.title });

  const load = () => {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', GA_ID, {
      send_page_view: false, // sent by hand below, because sections change with the # in the address
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 60 * 60 * 24 * 395, // 13 months rather than Google's default 2 years
    });
    sendView();
    const s = document.createElement('script');
    s.async = true;
    s.src = policy ? policy.createScriptURL(GA_URL) : GA_URL;
    document.head.append(s);
  };

  // Each section counts as a page view (router.js announces section changes).
  document.addEventListener('pickle:pagechange', () => { if (loaded) sendView(); });

  /* ---------- Withdrawing consent: clear Google's cookies and reload without the script ---------- */
  const clearGaCookies = () => {
    const host = location.hostname;
    document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^_ga(_|$)/.test(n)).forEach((name) => {
      [host, `.${host}`, ''].forEach((domain) => {
        document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
      });
    });
  };

  /* ---------- The cookie message ---------- */
  const show = ({ focus = false } = {}) => {
    banner.hidden = false;
    if (focus) banner.querySelector('button')?.focus({ preventScroll: true });
  };

  banner.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-consent]')?.dataset.consent;
    if (choice !== 'granted' && choice !== 'denied') return;
    const before = readChoice();
    saveChoice(choice);
    banner.hidden = true;
    if (choice === 'granted') load();
    else if (loaded || before === 'granted') { clearGaCookies(); location.reload(); }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-consent-open]')) show({ focus: true });
  });

  const choice = readChoice();
  if (choice === 'granted') load();
  else if (choice !== 'denied') show();
})();
