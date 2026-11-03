(() => {
  const root = document.documentElement;
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('doaide-theme', next); } catch (_) {}
  });
  const burger = document.getElementById('burger'), menu = document.getElementById('mobile-nav');
  burger.addEventListener('click', () => burger.setAttribute('aria-expanded', String(menu.classList.toggle('is-open'))));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
  });
  document.getElementById('year').textContent = new Date().getFullYear();
  const form = document.getElementById('demo-form');
  if (!form) return;
  const button = form.querySelector('button[type=submit]');
  button.disabled = false;
  const result = document.getElementById('request-result');
  const status = document.getElementById('request-status');
  let busy = false;
  let submitted = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || submitted || !form.reportValidity()) return;
    busy = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    const values = new FormData(form);
    const payload = Object.fromEntries(['name', 'firm', 'email', 'volume', 'workflow', 'website'].map(key => [key, String(values.get(key) || '').trim()]));
    try {
      const response = await fetch('https://gst.doaide.com/api/v1/feedback/demo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'omit', body: JSON.stringify(payload), signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests. Please email support@doaide.com to arrange your demo.' : 'We could not confirm your request. Please try again or email support@doaide.com.');
      const saved = await response.json();
      if (!/^DEMO-\d+$/.test(saved.reference || '')) throw new Error('We could not confirm your request. Please email support@doaide.com.');
      submitted = true;
      result.hidden = false;
      document.getElementById('request-reference').textContent = saved.reference;
      status.textContent = 'Request received. We’ll reply by email to arrange a time. Your appointment is confirmed when we agree a time with you.';
      result.focus();
      button.textContent = 'Request received';
      // Only a committed request counts. No form fields reach analytics.
      try { window.umami?.track('demo_request_submitted'); } catch (_) {}
      try { window.doaideAds?.conversion('demo_request_submitted', { transaction_id: saved.reference }); } catch (_) {}
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' || error.name === 'TypeError'
        ? 'We could not confirm delivery. Please email support@doaide.com, or try again when your connection is working.' : error.message;
      button.textContent = 'Send demo request';
    } finally {
      busy = false;
      button.disabled = submitted;
    }
  });
})();
