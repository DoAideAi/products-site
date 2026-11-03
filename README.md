# DoAide GST marketing website

The main site is **https://doaide.com/**, hosted by the existing Cloudflare Pages
project `doaide-landing`. Source repository: `DoAideAi/products-site`.
The canonical checkout is `/Users/dev/projects/doaide/doaide`.

The main sales page focuses on GST reconciliation for accounting firms.
`/guides/` links to existing GST resources; `/company/` holds the wider company
context. The application, pricing, sign-in and free tools remain on
`https://gst.doaide.com/` (separate GSTBot repository and Hetzner deployment).

## Edit and check

Edit `index.html`, `guides/index.html`, `company/index.html`, `demo/index.html`
and shared `assets/marketing.css` / `assets/marketing.js`. Root tool pages and
`blog/` remain published at their existing URLs. The packager regenerates the
sitemap and checks local files and anchors.

```sh
python3 build/release.py /tmp/doaide-release
python3 -m http.server 8042 --bind 127.0.0.1 --directory /tmp/doaide-release
node tests/browser-smoke.cjs http://127.0.0.1:8042
```

The browser check requires Playwright and Chrome (an installed Playwright can
also be supplied through `NODE_PATH`). It exercises desktop/mobile pages, theme,
menu, FAQ, demo email preparation and the retained calculators/formatting tools.

Do **not** run `build/generate.js`: it is the legacy multi-product generator and
would overwrite the GST pages. Do **not** use root `deploy.sh`: it targets the
older Hetzner showcase, not doaide.com.

## Demo requests

The form posts to `https://gst.doaide.com/api/v1/feedback/demo`. A successful
response means the request has been committed to the GST database. Operators
read and reply from the [admin inbox](https://gst.doaide.com/admin/feedback),
using the approved admin Google account. These are requests, not booked appointments.
SMTP notifications are not configured; check the inbox for new requests.
Direct email remains available when JavaScript or the connection is unavailable.

Only `demo_request_submitted` after a successful response counts as a lead.
Google Ads measurement is optional and disabled until the visitor accepts it;
consent is shared across doaide.com and gst.doaide.com. Event labels in
`assets/ads.js` belong to account 952-322-4323, tag AW-18552515324. Keep this file
identical to `frontend/public/ads.js` in GSTBot. No form contents are sent to Google.
Successful signup, pilot, product-use and paid conversion hooks live in the app.
Google reporting may lag; validate dispatch separately from attributed conversions.

Tests: `NODE_PATH=<directory containing jsdom> node --test tests/ads.test.cjs`
and the browser smoke command above. Browser tests intercept form submissions;
they do not create real leads or send conversion requests to Google.

## Publish and roll back

```sh
# Use the account's existing Wrangler OAuth login, or an API token in CI.
bash build/deploy-pages.sh preview-gst  # preview branch
bash build/deploy-pages.sh main         # production
```

Pages direct asset uploads use Wrangler; the cf CLI exposes deployment metadata
and manifests but does not assemble/upload the local static directory for this
project. Do not create a different project or change DNS for this release.
Before publishing, record the current production deployment ID with
`npx wrangler pages deployment list --project-name doaide-landing`.
Rollback uses that retained deployment in Cloudflare Pages (or the inspected
`cf pages projects deployments rollback` command).

The 2 November 2026 change preserves the existing tool/guide paths and the legacy
homepage anchors `products`, `principles`, `pricing`, `free-tools`, `faq`, `company`.
No new domain is required.

## Introductory pilot — 2 November 2026

The homepage now links to the app's 60-day free SMB/CA pilot. The first cohort
has 20 SMB places (one registration) and 10 CA places (five registrations,
including the firm's own). The app is authoritative for current availability,
500-upload monthly allowances, daily AI limits, enrollment and expiry.
Published regular prices remain ₹499/month and ₹2,999/month; there is no
automatic charge. Deploy the app's pilot API before publishing this homepage.
The demo form still only prepares an email; it does not reserve a pilot place.
