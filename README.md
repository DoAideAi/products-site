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

The form prepares a `mailto:` link on the visitor's device. The visitor sends the
email to `support@doaide.com`; a reply arranges a time. This is not a scheduling
service or a server-side lead database. It never claims a booking is confirmed.
A copy fallback supports webmail, and direct email is available without JavaScript.
Umami receives only fixed funnel event names, never submitted form fields.
A prepared draft or email-app click is **not** a completed lead or booked demo.

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
