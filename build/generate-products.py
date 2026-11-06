"""Generate the product portfolio using the site's existing marketing shell.

Edit product-portfolio.json for catalog changes. Website links are curated;
do not infer a live service from a repository name or an HTTP success alone.
"""
from pathlib import Path
from html import escape
import json
import re

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'build/product-portfolio.json').read_text())
products = data['products']
categories = {
    'ai': 'AI & agents',
    'business': 'Business operations',
    'tax': 'Tax & finance',
    'career': 'Documents & career',
    'creative': 'Creative & developer tools',
}
template = (ROOT / 'company/index.html').read_text()
prefix = template.split('<main id="main">')[0]
footer = template.split('</main>', 1)[1]
title = 'DoAide Products — AI, Business Software & Developer Tools'
description = 'Explore the DoAide product portfolio: AI agents, business applications, finance tools and creative utilities. Find product websites and public source code.'
prefix = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', prefix)
prefix = re.sub(r'(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*', lambda m: m[1] + description, prefix)
prefix = re.sub(r'(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*', lambda m: m[1] + title, prefix)
prefix = prefix.replace('https://doaide.com/company/', 'https://doaide.com/products/')
prefix = prefix.replace('content="DoAide GST"', 'content="DoAide"')
# The existing GST share image describes a different product; use a text card.
prefix = re.sub(r'<meta (?:property="og:image[^\"]*"|name="twitter:image") [^>]*>\n', '', prefix)
prefix = prefix.replace('content="summary_large_image"', 'content="summary"')
schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    'name': 'DoAide product portfolio', 'url': 'https://doaide.com/products/',
    'description': description,
    'mainEntity': {'@type': 'ItemList', 'numberOfItems': len(products), 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': p['name'],
         'url': 'https://doaide.com/products/#' + p['id']} for i, p in enumerate(products)
    ]},
}
prefix = re.sub(r'<script type="application/ld\+json">.*?</script>', '<script type="application/ld+json">' + json.dumps(schema) + '</script>', prefix, flags=re.S)
prefix = prefix.replace('</head>', '<link rel="stylesheet" href="/assets/products.css">\n<script defer src="/assets/products.js"></script>\n</head>')
prefix = prefix.replace('aria-label="DoAide GST home"', 'aria-label="DoAide home"')
prefix = prefix.replace(' DoAide <span style="color:var(--accent-text)">GST</span>', ' DoAide')
prefix = prefix.replace('<a href="/products/">Products</a>', '<a href="/products/" aria-current="page">Products</a>')
footer = footer.replace('</svg> DoAide GST</a>', '</svg> DoAide</a>')
footer = footer.replace('Invoice review, GSTR-2B reconciliation and return preparation for Indian accounting firms.', 'AI platforms, business applications and useful tools from DoAide.')

def card(p):
    name, desc, repo = (escape(p[k], quote=True) for k in ('name', 'description', 'repository'))
    site = p.get('website')
    website = f'<a class="text-link" href="{escape(site, quote=True)}" aria-label="Visit {name} website">Visit website <span aria-hidden="true">↗</span></a>' if site else ''
    return f'''<article class="catalog-card" id="{p['id']}" data-category="{p['category']}">
<div class="catalog-card__meta"><span>{categories[p['category']]}</span><span class="catalog-status">{escape(p['status'])}</span></div>
<h3>{name}</h3><p>{desc}</p>
<div class="catalog-card__links">{website}<a class="text-link" href="{repo}" aria-label="View {name} source code">Source code <span aria-hidden="true">↗</span></a></div>
</article>'''

featured_copy = {
    'GSTBot': ('Invoice-to-return workflows', 'Invoice review, reconciliation and filing preparation for Indian accounting firms.'),
    'aiknol/knol': ('Memory for AI agents', 'A retrieval platform combining vector search, knowledge graphs and temporal context.'),
    'fastcoder': ('From user story to code', 'A development agent with model orchestration, durable workflows and human approval gates.'),
}
featured = []
for p in products:
    key = p['repository'].removeprefix('https://github.com/').removeprefix('DoAideAi/')
    if key in featured_copy:
        label, text = featured_copy[key]
        featured.append(f'<a class="portfolio-feature" href="#{p["id"]}"><span class="kicker">{escape(p["name"])}</span><h3>{label}</h3><p>{text}</p><span class="text-link">Explore project <span aria-hidden="true">↓</span></span></a>')

options = ''.join(f'<option value="{key}">{label}</option>' for key, label in categories.items())
body = f'''<main id="main">
<section class="hero portfolio-hero"><div class="wrap">
<span class="eyebrow"><span class="eyebrow__tag">DoAide</span> Product portfolio</span>
<h1>Explore the DoAide<br><span class="accent">product portfolio.</span></h1>
<p class="hero__lede">Explore AI agents, business applications and everyday tools. Find the product for your workflow, or look inside the engineering.</p>
<div class="hero__cta"><a class="btn btn--primary" href="#catalog">Browse all {len(products)} projects ↓</a><a class="btn btn--ghost" href="https://github.com/orgs/DoAideAi/repositories">Explore GitHub ↗</a></div>
<p class="hero__meta">Product websites, public source code and work in development — together in one portfolio.</p>
</div></section>
<section class="section portfolio-featured" aria-labelledby="featured-heading"><div class="wrap">
<div class="section__head"><div class="kicker">A closer look</div><h2 id="featured-heading">Selected engineering projects.</h2></div>
<div class="portfolio-features">{''.join(featured)}</div>
</div></section>
<section class="section section--subtle portfolio-catalog" id="catalog" aria-labelledby="catalog-heading"><div class="wrap">
<div class="section__head"><div class="kicker">The collection</div><h2 id="catalog-heading">Find your next tool.</h2><p class="section__sub">Browse by workflow, search by name, or explore the public code.</p></div>
<form class="catalog-filters" id="catalog-filters" role="search" aria-label="Search the product portfolio" hidden>
<div><label for="product-search">Search products</label><input id="product-search" type="search" placeholder="Try agents, invoices or documents" autocomplete="off"></div>
<div><label for="product-category">Category</label><select id="product-category"><option value="all">All categories</option>{options}</select></div>
<button class="btn btn--ghost" type="reset">Clear filters</button>
</form>
<p class="catalog-count" id="catalog-count" role="status" aria-live="polite">{len(products)} projects</p>
<div class="catalog-grid">{''.join(card(p) for p in products)}</div>
<div class="catalog-empty" id="catalog-empty" hidden><h3>No matching products</h3><p>Try a different search or clear the filters to see the full collection.</p><button class="btn btn--ghost" type="button" id="empty-reset">Clear filters</button></div>
<p class="catalog-note">“Website available” links to a product website checked on 6 November 2026. Source-only entries link to public code; they may require local setup. Features and access vary by product.</p>
</div></section>
<section class="section"><div class="wrap portfolio-contact"><div><div class="kicker">Built at DoAide</div><h2>Explore the work behind the products.</h2><p class="section__sub">Browse repositories, read the documentation, or talk to us about a workflow.</p></div><div class="hero__cta"><a class="btn btn--primary" href="https://github.com/orgs/DoAideAi/repositories">View repositories ↗</a><a class="btn btn--ghost" href="mailto:support@doaide.com">Contact DoAide</a></div></div></section>
</main>'''
out = ROOT / 'products/index.html'
out.parent.mkdir(exist_ok=True)
out.write_text(prefix + body + footer)
print(f'Generated {out.relative_to(ROOT)} with {len(products)} entries')
