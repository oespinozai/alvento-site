#!/usr/bin/env python3
"""Update only the contiguous NullKey sitemap block, using guide review dates.

Existing non-guide entries retain their metadata; existing guide entries retain
all other fields. New guide entries use the supplied reviewed date. This command
is explicit so draft builds cannot silently update the publication sitemap.
"""
from pathlib import Path
import json, re
from datetime import date

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / 'sitemap.xml'
CONTENT = ROOT / 'scripts/nullkey/content'
PATTERN = re.compile(r'(?m)^  <url><loc>https://alvento\.uk/nullkey/[^\n]*</url>\n')

def update(text):
    matches = list(PATTERN.finditer(text))
    if not matches or any(matches[i].end() != matches[i+1].start() for i in range(len(matches)-1)):
        raise ValueError('NullKey sitemap entries must be one contiguous block')
    entries = {re.search(r'<loc>([^<]+)</loc>', m.group()).group(1): m.group() for m in matches}
    dates = {g[0]: '2026-11-03' for g in json.loads((CONTENT/'guides.json').read_text())}
    for path in sorted((CONTENT/'guides').glob('*.json')):
        guide=json.loads(path.read_text()); date.fromisoformat(guide['reviewed'])
        if guide['slug'] != path.stem or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', path.stem):
            raise ValueError(f'Invalid guide slug: {path}')
        if path.stem in dates: raise ValueError(f'Duplicate slug: {path.stem}')
        dates[path.stem]=guide['reviewed']
    for slug, reviewed in dates.items():
        url=f'https://alvento.uk/nullkey/guides/{slug}/'
        if url in entries:
            entry=entries[url]
            if '<lastmod>' in entry: entry=re.sub(r'<lastmod>[^<]*</lastmod>',f'<lastmod>{reviewed}</lastmod>',entry)
            else: entry=entry.replace('</loc>',f'</loc><lastmod>{reviewed}</lastmod>')
            entries[url]=entry
        else: entries[url]=f'  <url><loc>{url}</loc><lastmod>{reviewed}</lastmod><changefreq>monthly</changefreq></url>\n'
    return text[:matches[0].start()]+''.join(entries[url] for url in sorted(entries))+text[matches[-1].end():]

if __name__ == '__main__':
    before=PATH.read_text(); after=update(before); PATH.write_text(after); print(f'Updated NullKey block in {PATH}; {len(PATTERN.findall(after))} entries')
