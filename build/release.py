"""Assemble the static release without running the legacy site generator."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, unquote
import json
import shutil
import sys
import xml.etree.ElementTree as ET
from generate_rss import generate_feed

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]).resolve()
OUT.mkdir(parents=True, exist_ok=True)
ALLOWED = {'.html', '.css', '.js', '.png', '.jpg', '.svg', '.ico', '.webp'}

# Publish only the static site sources, never build scripts or local caches.
for source in [ROOT]:
    for path in source.iterdir():
        if path.is_file() and (path.suffix in ALLOWED or path.name in {'_headers', '_redirects', 'robots.txt', 'doaide2026indexkey.txt'}):
            shutil.copy2(path, OUT / path.name)
    for directory in ('blog', 'assets', 'guides', 'company', 'demo', 'privacy', 'products'):
        if (source / directory).exists():
            shutil.copytree(source / directory, OUT / directory, dirs_exist_ok=True)

# Generate before checking links so discovery and subscription links are validated.
feed_items = generate_feed(ROOT, OUT / 'rss.xml')

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        for attr in ('href', 'src'):
            if attrs.get(attr) and (attr == 'src' or tag in ('a', 'link')):
                self.links.append((tag, attr, attrs[attr]))

pages = {}
for path in OUT.rglob('*.html'):
    parser = Links()
    parser.feed(path.read_text())
    pages[path] = parser

ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')
namespace = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
sitemap = ET.Element(namespace + 'urlset')
for path in sorted(pages):
    source = path.read_text()
    if 'noindex' in source or 'http-equiv="refresh"' in source:
        continue
    item = ET.SubElement(sitemap, namespace + 'url')
    name = path.relative_to(OUT).as_posix()
    ET.SubElement(item, namespace + 'loc').text = 'https://doaide.com/' + ('' if name == 'index.html' else name.removesuffix('index.html') if name.endswith('/index.html') else name)
ET.indent(sitemap)
ET.ElementTree(sitemap).write(OUT / 'sitemap.xml', encoding='utf-8', xml_declaration=True)

broken = []
external = set()
for path, parser in pages.items():
    for tag, attr, link in parser.links:
        url = urlsplit(urljoin('https://doaide.com/' + path.relative_to(OUT).as_posix(), link))
        if url.scheme not in ('https', 'http'):
            continue
        if url.netloc not in ('doaide.com', 'www.doaide.com'):
            if tag == 'a':
                external.add(url.geturl())
            continue
        target = OUT / unquote(url.path.lstrip('/'))
        if target.is_dir():
            target = target / 'index.html'
        if not target.exists() and target.with_suffix('.html').exists():
            target = target.with_suffix('.html')
        if not target.exists():
            broken.append([str(path.relative_to(OUT)), link, 'missing file'])
        elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
            broken.append([str(path.relative_to(OUT)), link, 'missing anchor'])

print(json.dumps({'pages': len(pages), 'rss_items': feed_items, 'broken': broken, 'external': sorted(external)}, indent=2))
sys.exit(bool(broken))
