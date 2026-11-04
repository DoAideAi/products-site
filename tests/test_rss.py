from pathlib import Path
from tempfile import TemporaryDirectory
from email.utils import parsedate_to_datetime
import json
import sys
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'build'))
from generate_rss import generate_feed


class FeedTest(unittest.TestCase):
    def test_regeneration_preserves_identity_and_original_dates(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'blog').mkdir()
            def save(path, data):
                path.write_text('<script type="application/ld+json">' + json.dumps(data) + '</script>')
            blog = {'@type': 'Blog', 'name': 'DoAide GST Blog', 'url': 'https://doaide.com/blog',
                    'description': 'Articles & checklists', 'blogPost': []}
            def add(slug, title, published):
                blog['blogPost'].append({'url': f'https://doaide.com/blog/{slug}.html', 'headline': title})
                save(root / 'blog' / (slug + '.html'), {'@type': 'BlogPosting',
                     'description': 'Review A & B; ₹180 < ₹200.', 'datePublished': published})
            add('first', 'Invoices & ITC', '2026-10-07')
            save(root / 'blog.html', blog)
            output = root / 'rss.xml'
            generate_feed(root, output)
            original = ET.parse(output).find('./channel/item')
            guid, published = original.findtext('guid'), original.findtext('pubDate')
            self.assertEqual(original.findtext('description'), 'Review A & B; ₹180 < ₹200.')
            self.assertEqual(parsedate_to_datetime(published).utcoffset().total_seconds(), 19800)
            add('new', 'A new checklist', '2026-11-04')
            blog['blogPost'][0]['headline'] = 'Updated invoice title'
            save(root / 'blog.html', blog)
            generate_feed(root, output)
            items = ET.parse(output).findall('./channel/item')
            self.assertEqual([i.findtext('title') for i in items], ['A new checklist', 'Updated invoice title'])
            self.assertEqual(items[1].findtext('guid'), guid)
            self.assertEqual(items[1].findtext('pubDate'), published)
            first_build = output.read_bytes()
            generate_feed(root, output)
            self.assertEqual(output.read_bytes(), first_build, 'A rebuild must not make old items look new')
            # Duplicate metadata and missing source files must block an incomplete release.
            blog['blogPost'].append(blog['blogPost'][0])
            save(root / 'blog.html', blog)
            with self.assertRaisesRegex(ValueError, 'Duplicate'):
                generate_feed(root, output)
            blog['blogPost'].pop()
            save(root / 'blog.html', blog)
            (root / 'blog/new.html').unlink()
            with self.assertRaises(FileNotFoundError):
                generate_feed(root, output)


if __name__ == '__main__':
    unittest.main()
