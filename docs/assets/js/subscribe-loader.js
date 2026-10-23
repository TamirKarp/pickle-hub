/* Load the EmailOctopus form (and with it Google reCAPTCHA) only when the visitor asks for it. */
(() => {
  'use strict';

  const btn = document.getElementById('load-form');
  const slot = document.getElementById('form-slot');
  const status = document.getElementById('form-status');
  if (!btn || !slot) return;

  btn.addEventListener('click', () => {
    const id = '031d1a9e-cf00-11f1-b92e-657c95aab55c';
    const script = document.createElement('script');
    script.src = `https://eomail5.com/form/${id}.js`;
    script.dataset.form = id; // EmailOctopus finds its mount point via script[data-form]
    script.async = true;
    script.addEventListener('load', () => { if (status) status.textContent = ''; });
    script.addEventListener('error', () => {
      if (status) status.textContent = "Sorry, the sign-up form couldn't be loaded. Please try again later.";
    });
    slot.append(script);
    btn.remove();
    if (status) status.textContent = 'Loading the sign-up form…';
  });
})();
