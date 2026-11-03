const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('assets/ads.js', 'utf8');
function browser(path = '/', consent) {
  const dom = new JSDOM('<!doctype html><head></head><body></body>', { url: 'https://gst.doaide.com' + path, runScripts: 'outside-only' });
  const w = dom.window;
  if (consent) w.document.cookie = 'doaide_ad_measurement=' + consent + '; Path=/; Domain=doaide.com';
  vm.runInContext(source, dom.getInternalVMContext());
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return w;
}
function conversions(w) { return (w.dataLayer || []).filter(args => args[0] === 'event').map(args => args[2]); }
function choose(w, text) { [...w.document.querySelectorAll('button')].find(e => e.textContent === text).click(); }

test('declining makes no Google request or conversion and leaves the choice editable', () => {
  const w = browser();
  assert.equal(w.document.querySelectorAll('script').length, 0);
  w.doaideAds.conversion('signup_complete');
  assert.equal(w.dataLayer, undefined);
  choose(w, 'Decline');
  assert.match(w.document.cookie, /doaide_ad_measurement=no/);
  choose(w, 'Ad measurement');
  assert(w.document.getElementById('doaide-measurement-panel'));
  w.close();
});
test('only named completed conversions are sent, with bounded values and no form contents', () => {
  const w = browser('/invoices/42?email=private@example.com#secret', 'yes');
  w.doaideAds.conversion('pricing_view', { email: 'private@example.com' });
  assert.equal(conversions(w).length, 0);
  w.doaideAds.conversion('demo_request_submitted', { transaction_id: 'DEMO-12', email: 'private@example.com', value: 100 });
  w.doaideAds.conversion('subscribe_success', { transaction_id: 'order_12', value: 2999, gstin: 'secret' });
  const events = conversions(w);
  assert.equal(events.length, 2);
  assert.equal(events[0].value, 0);
  assert.equal(events[1].value, 2999);
  assert.equal(events[1].currency, 'INR');
  assert.equal(events[1].page_location, 'https://gst.doaide.com/');
  assert(!JSON.stringify(events).includes('private'));
  events.forEach(e => e.event_callback());
  assert.equal(w.sessionStorage.getItem('doaide_pending_conversions'), '[]');
  w.close();
});
test('OAuth completion queues the outcome without loading tags on the token-bearing callback', () => {
  const w = browser('/auth/callback#token=secret', 'yes');
  w.doaideAds.conversion('signup_complete');
  assert.equal(w.document.querySelectorAll('script').length, 0);
  assert.equal(JSON.parse(w.sessionStorage.getItem('doaide_pending_conversions')).length, 1);
  w.history.replaceState({}, '', '/pricing');
  w.doaideAds.conversion('pilot_started');
  assert.equal(conversions(w).length, 2);
  assert.equal(w.document.querySelectorAll('script').length, 1);
  assert(!JSON.stringify(w.dataLayer).includes('secret'));
  w.close();
});
test('revoking consent prevents further conversions and can be reversed', () => {
  const w = browser('/', 'yes');
  choose(w, 'Ad measurement'); choose(w, 'Decline');
  w.doaideAds.conversion('signup_complete');
  assert.equal(conversions(w).length, 0);
  choose(w, 'Ad measurement'); choose(w, 'Allow ad measurement');
  w.doaideAds.conversion('signup_complete');
  assert.equal(conversions(w).length, 1);
  assert((w.dataLayer || []).some(a => a[0] === 'consent' && a[1] === 'update' && a[2].ad_storage === 'granted'));
  w.close();
});

test('Google click IDs survive sanitization while private query parameters do not', () => {
  const w = browser('/demo/?gclid=google_click-123&email=private@example.com&token=secret', 'yes');
  w.doaideAds.conversion('demo_request_submitted');
  assert.equal(conversions(w)[0].page_location, 'https://gst.doaide.com/?gclid=google_click-123');
  assert(!JSON.stringify(w.dataLayer).includes('private@example.com'));
  w.close();
});
