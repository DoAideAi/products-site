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
  form.querySelector('button[type=submit]').disabled = false;
  const result = document.getElementById('request-result');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const body = ['Hello DoAide,', '', 'I would like a demo of DoAide GST.', '',
      'Name: ' + values.get('name').trim(), 'Firm: ' + values.get('firm').trim(),
      'Reply email: ' + values.get('email').trim(), 'Client GSTINs: ' + values.get('volume'),
      'Workflow / preferred time: ' + (values.get('workflow').trim() || 'To discuss'), '',
      'Please reply to arrange a time.'].join('\n');
    document.getElementById('request-preview').textContent = body;
    document.getElementById('send-request').href = 'mailto:support@doaide.com?subject=' + encodeURIComponent('DoAide GST demo request') + '&body=' + encodeURIComponent(body);
    result.hidden = false;
    document.getElementById('request-status').textContent = 'Your email draft is ready. Open your email app and send it to request a demo. Your appointment is not booked yet.';
    result.focus();
    // Event names only: never send names, emails or workflow notes to analytics.
    try { if (typeof window.umami?.track === 'function') window.umami.track('demo-email-prepared'); } catch (_) {}
  });
  form.addEventListener('input', () => { result.hidden = true; });
  document.getElementById('copy-request').addEventListener('click', async () => {
    const status = document.getElementById('request-status');
    try {
      await navigator.clipboard.writeText(document.getElementById('request-preview').textContent);
      status.textContent = 'Copied. Paste this into an email to support@doaide.com and send it to request a demo.';
    } catch (_) { status.textContent = 'Copy is unavailable here. Select the draft below and paste it into an email to support@doaide.com.'; }
  });
})();
