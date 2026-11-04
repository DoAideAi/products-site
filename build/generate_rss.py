"""Generate the blog's RSS feed from its existing article metadata."""
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import xml.etree.ElementTree as ET

ORIGIN = 'https://doaide.com'
FEED_URL = ORIGIN + '/rss.xml'
ATOM = 'http://www.w3.org/2005/Atom'
IST = timezone(timedelta(hours=5, minutes=30))


class Metadata(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.documents = []
        self.collecting = False
        self.parts = []
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        if tag == 'script' and dict(attrs).get('type') == 'application/ld+json':
            self.collecting = True
            self.parts = []

    def handle_data(self, data):
        if self.collecting:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.collecting:
            self.documents.append(json.loads(''.join(self.parts)))
            self.collecting = False

    def find(self, *kinds):
        for document in self.documents:
            if isinstance(document, dict) and document.get('@type') in kinds:
                return document
        raise ValueError(f'Missing structured metadata: {kinds}')


def timestamp(value):
    parsed = datetime.fromisoformat(value)
    # Older articles record only a date. Keep that date in the publication's zone.
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=IST)


def generate_feed(root: Path, destination: Path):
    blog = Metadata(root / 'blog.html').find('Blog')
    posts = []
    seen = set()
    for entry in blog['blogPost']:
        url = urlsplit(entry['url'])
        if (url.scheme, url.netloc) != ('https', 'doaide.com') or url.query or url.fragment:
            raise ValueError(f'Expected a local published article URL: {entry["url"]}')
        source = (root / unquote(url.path.lstrip('/'))).resolve()
        if not source.is_relative_to(root.resolve() / 'blog'):
            raise ValueError(f'Article must be inside blog/: {source}')
        if source.suffix != '.html':
            source = source.with_suffix('.html')
        article = Metadata(source).find('BlogPosting', 'Article')
        # Pages serves clean URLs; these identifiers stay fixed across rebuilds.
        permalink = ORIGIN + url.path.removesuffix('.html')
        if permalink in seen:
            raise ValueError(f'Duplicate RSS article: {permalink}')
        seen.add(permalink)
        published = timestamp(article['datePublished'])
        modified = timestamp(article.get('dateModified', article['datePublished']))
        posts.append((published, modified, permalink, entry['headline'], article['description']))
    if not posts:
        raise ValueError('The blog must contain at least one published article')
    posts.sort(key=lambda post: (post[0], post[2]), reverse=True)

    ET.register_namespace('atom', ATOM)
    rss = ET.Element('rss', {'version': '2.0'})
    channel = ET.SubElement(rss, 'channel')
    for tag, value in [('title', blog['name']), ('link', blog['url']),
                       ('description', blog['description']), ('language', 'en-IN'),
                       ('lastBuildDate', format_datetime(max(max(p[0], p[1]) for p in posts))),
                       ('ttl', '60')]:
        ET.SubElement(channel, tag).text = value
    ET.SubElement(channel, '{' + ATOM + '}link', {
        'href': FEED_URL, 'rel': 'self', 'type': 'application/rss+xml',
    })
    for published, _, permalink, title, description in posts:
        item = ET.SubElement(channel, 'item')
        ET.SubElement(item, 'title').text = title
        ET.SubElement(item, 'link').text = permalink
        ET.SubElement(item, 'guid', {'isPermaLink': 'true'}).text = permalink
        ET.SubElement(item, 'description').text = description
        ET.SubElement(item, 'pubDate').text = format_datetime(published)
    ET.indent(rss)
    ET.ElementTree(rss).write(destination, encoding='utf-8', xml_declaration=True)
    return len(posts)
