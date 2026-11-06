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

## GST blog — 3 November 2026

`blog.html` serves the GST blog hub at `/blog` on Cloudflare Pages. Its article
links are ordinary HTML, with client-side search and topic filtering in
`assets/blog.js`. Editorial layout and article styles live in `assets/blog.css`.
The homepage, desktop/mobile navigation and resource footers link to the hub.
The previous mixed-topic collection is retained at `/blog-archive.html`, and all
existing article URLs remain available.

The featured article is `blog/gstr-2b-mismatch-review-checklist.html`. It contains
an operational checklist, an explicitly synthetic example and an official GSTN
reference. Existing articles linked from the collection have not been re-audited
for current tax rules. New articles should include a source, author and actual
publication date; add their card and structured-data entry to `blog.html`.

Run `node tests/blog-smoke.cjs http://127.0.0.1:8046` alongside the existing browser
smoke test against a packaged release. It checks combined search/filter behavior,
empty/reset states, keyboard interaction, article links, mobile navigation,
theme persistence and readable content without JavaScript.

This release is based on production commit `8e4aa7c`, preserving the live demo
submission and consented measurement changes. Previous production deployment:
`a7e1ec63-96ae-4855-ab06-4f9d39e71dd1`.

## RSS subscriptions

The RSS 2.0 feed is published at `https://doaide.com/rss.xml`. The blog provides a
visible subscription link; the homepage, guides hub, blog hub and included
articles advertise the feed through HTML autodiscovery.

`build/release.py` generates the feed with `build/generate_rss.py` on every release.
The hub's `Blog.blogPost` structured data selects articles and titles; each
article's structured data supplies its description and original `datePublished`.
Items use stable clean-URL GUIDs and are sorted newest first. Date-only metadata
uses midnight in India Standard Time. Set `dateModified` when article content
changes. Missing article files, missing required metadata and duplicate URLs
stop the release so it cannot silently publish an incomplete feed.

Add new articles to the hub, include the RSS discovery link in their HTML head,
and publish normally. There is no separate feed-editing step or scheduled task.
Run `python3 -m unittest discover -s tests -p 'test_rss.py'` to check regeneration,
XML escaping, stable identifiers and invalid source handling.

## Product portfolio — 6 November 2026

`/products/` is the broader portfolio, linked from the marketing navigation and
footer. It preserves the GST homepage and its `/#products` workflow anchor.
Edit `build/product-portfolio.json`, then run `python3 build/generate-products.py`.
The generated page contains the full catalog without JavaScript;
`assets/products.js` adds name/description search and category filtering.

Only verified product websites receive a website link. Other entries link to
public source code, with the Suite explicitly marked as local development.
Recheck the actual destination and identity before adding a website link;
repository visibility or HTTP 200 alone does not prove product availability.
Internal tracking, infrastructure, forks and unrelated repositories are omitted.

Run `node tests/portfolio-smoke.cjs <release-url>` for portfolio navigation,
filtering, empty results, responsive layout and the no-JavaScript fallback.
The deployment baseline is production source `d7f1c5b`, including the current
demo form, consented measurement and blog/RSS work. The pre-change production
deployment was `0fc83cc4-d8c6-4453-a38d-2ddfb78ff4ad`.
