#!/usr/bin/env python3
"""Fail closed on NullKey quality, integrity, graph and sitemap checks."""
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from collections import defaultdict, deque
from html.parser import HTMLParser
import json, re, sys, hashlib, xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[2]; product=root/'nullkey'; errors=[]
NAMES=['samsung','secure folder','safe folder','google photos','google drive','google one','files by google','icloud','onedrive','dropbox','keepsafe','vaultaire','calculator vault','bitwarden','1password','lastpass','signal','whatsapp','telegram','cryptomator','veracrypt','norton','proton','mega','apple','iphone','ios','pixel','xiaomi','huawei','oneplus','chrome','gmail','microsoft','windows','facebook','instagram','tiktok','amazon','openai','chatgpt','kaspersky','mcafee','nordvpn','tutanota']
BANNED=re.compile(r'\b(?:audited|zero[ -]knowledge|military[ -]grade|end[ -]to[ -]end)\b',re.I)
GLYPH=re.compile('[—←-⇿⟀-⟿\U0001F000-\U0001FAFF]')
MONEY=re.compile(r'(?:[£$€]\s*\d|\b\d+(?:\.\d+)?\s*(?:pounds|dollars|euros|gbp|usd|eur)\b)',re.I)
def fail(path,message):errors.append(f'{path}: {message}')
class Doc(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.links=[];self.assets=[];self.ids=set();self.h1=0;self.canon=[];self.meta={};self.title='';self.text=[];self.in_title=False;self.in_script=False;self.in_style=False;self.jsonld=[];self.current=None
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if a.get('id'):
   if a['id'] in self.ids:fail('HTML','duplicate id '+a['id'])
   self.ids.add(a['id'])
  if t=='title':self.in_title=True
  if t=='h1':self.h1+=1
  if t=='a':self.links.append(a.get('href',''))
  if t=='meta':self.meta.setdefault(a.get('name') or a.get('property'),[]).append(a.get('content',''))
  if t=='link' and 'canonical' in a.get('rel','').split():self.canon.append(a.get('href',''))
  if t=='link' and a.get('rel') in ('stylesheet','icon'):self.assets.append(a.get('href',''))
  if t in ('script','img','video','source') and 'src' in a:self.assets.append(a['src'])
  if t=='img' and 'alt' not in a:fail('HTML','image missing alt')
  for k in ('poster','data-poster-portrait'):
   if k in a:self.assets.append(a[k])
  if 'srcset' in a:self.assets.extend(x.strip().split()[0] for x in a['srcset'].split(',') if x.strip())
  if t=='script':
   self.in_script=True
   if a.get('type')=='application/ld+json':self.current=''
  if t=='style':self.in_style=True
 def handle_endtag(self,t):
  if t=='title':self.in_title=False
  if t=='script':
   if self.current is not None:self.jsonld.append(self.current);self.current=None
   self.in_script=False
  if t=='style':self.in_style=False
 def handle_data(self,data):
  if self.in_title:self.title+=data
  if self.current is not None:self.current+=data
  if not self.in_script and not self.in_style:self.text.append(data)

def read_doc(path):
 d=Doc();d.feed(path.read_text(encoding='utf-8'));return d
pages=sorted(product.rglob('index.html'));docs={p:read_doc(p) for p in pages};titles={};descriptions={};graph=defaultdict(set);base='https://alvento.uk'
new_slugs={p.stem for p in (root/'scripts/nullkey/content/guides').glob('*.json')}
def target_for(url,source):
 parsed=urlsplit(urljoin(base+'/'+str(source.relative_to(root)).replace('index.html',''),url))
 if parsed.scheme not in ('http','https') or parsed.netloc!='alvento.uk':return None
 path=unquote(parsed.path);target=root/path.lstrip('/')
 if target.is_dir():target=target/'index.html'
 if not target.exists() and path.rstrip('/') in ('/tools','/privacy'):target=root/(path.strip('/')+'.html')
 if not target.exists():fail(source.relative_to(root),f'broken internal link or asset {url}');return None
 if parsed.fragment and target.suffix=='.html':
  doc=docs.get(target) or read_doc(target)
  if parsed.fragment not in doc.ids:fail(source.relative_to(root),f'broken fragment {url}')
 return target
for path,doc in docs.items():
 rel=path.relative_to(root);url=base+'/'+str(rel).replace('index.html','');visible=' '.join(doc.text)
 if doc.h1!=1:fail(rel,f'expected 1 h1, got {doc.h1}')
 if path != product/'privacy/index.html' and doc.meta.get('robots') != ['index,follow']:fail(rel,'missing index,follow robots')
 if path != product/'privacy/index.html' and 'https://alvento.uk/nullkey/privacy/' not in doc.links:fail(rel,'missing privacy link')
 if path != product/'privacy/index.html' and 'https://play.google.com/store/apps/details?id=uk.alvento.nullkeyapp' not in doc.links:fail(rel,'missing Play CTA')
 if doc.canon!=[url]:fail(rel,f'missing or wrong canonical {doc.canon}')
 if not doc.title or len(doc.title)>65:fail(rel,f'title length {len(doc.title)} (max 65)')
 if doc.title.casefold() in titles:fail(rel,f'duplicate title with {titles[doc.title.casefold()]}')
 titles[doc.title.casefold()]=rel
 visible += ' '+doc.title+' '+' '.join(x for vals in doc.meta.values() for x in vals)+' '+' '.join(doc.jsonld)
 desc=doc.meta.get('description',[])
 if len(desc)!=1 or not 120<=len(desc[0])<=160:fail(rel,f'description length {[len(x) for x in desc]} (120-160)')
 if len(desc)==1:
  if desc[0].casefold() in descriptions:fail(rel,f'duplicate description with {descriptions[desc[0].casefold()]}')
  descriptions[desc[0].casefold()]=rel
 for raw in doc.jsonld:
  try:json.loads(raw)
  except (ValueError,TypeError) as exc:fail(rel,f'invalid JSON-LD {exc}')
 if GLYPH.search(visible):fail(rel,'banned glyph '+repr(GLYPH.search(visible).group()))
 if MONEY.search(visible):fail(rel,'currency amount '+repr(MONEY.search(visible).group()))
 if BANNED.search(visible):fail(rel,'banned claim '+repr(BANNED.search(visible).group()))
 for name in NAMES:
  if re.search(r'(?<![a-z])'+re.escape(name)+r'(?![a-z])',visible,re.I):fail(rel,'named competing product or brand: '+name)
 for link in doc.links:
  target=target_for(link,path)
  if target in docs and target!=path:graph[path].add(target)
 for asset in doc.assets:target_for(asset,path)
 if path.parent.name in new_slugs and path.parent.parent.name=='guides':
  data=json.loads((root/'scripts/nullkey/content/guides'/f'{path.parent.name}.json').read_text())
  text=' '.join([data['title'],data['description']]+[x for sec in data['sections'] for x in [sec['h']]+sec['p']+sec.get('list',[])]+[x for f in data.get('faq',[]) for x in [f['q'],f['a']]])
  n=len(re.findall(r"[A-Za-z0-9’']+",text))
  if n<600:fail(rel,f'new guide word count {n} (minimum 600)')
sitemap={e.text for e in ET.parse(root/'sitemap.xml').getroot().iter() if e.tag.endswith('loc')}
for path in pages:
 url=base+'/'+str(path.relative_to(root)).replace('index.html','')
 if url not in sitemap:fail(path.relative_to(root),'missing sitemap entry')
for p in ('index.html','case-studies/index.html'):
 if 'href="/nullkey/"' not in (root/p).read_text():fail(p,'known parent homepage-link assertion: missing href="/nullkey/"')
privacy=product/'privacy/index.html'
if hashlib.sha256(privacy.read_bytes()).hexdigest()!='68bd5b7de32538f93a381666eac7dcc3e59f6768006894cbc5d44daf505b19f9':fail(privacy,'privacy policy changed')
inbound=defaultdict(set)
for src,targets in graph.items():
 for dst in targets:inbound[dst].add(src)
hub=product/'guides/index.html'; seen={hub};queue=deque([hub])
while queue:
 for target in graph[queue.popleft()]:
  if target not in seen:seen.add(target);queue.append(target)
guides=[p for p in pages if p.parent.parent==product/'guides']
for path in guides:
 if path not in seen:fail(path.relative_to(root),'orphan: unreachable from guide hub')
 if len(inbound[path])<3:fail(path.relative_to(root),f'only {len(inbound[path])} distinct inbound internal pages (minimum 3)')
 print('INBOUND',len(inbound[path]),'/'+str(path.relative_to(root)).replace('index.html',''))
print(f'GRAPH: {len(guides)} guides; {sum(p not in seen for p in guides)} unreachable from hub; {sum(len(inbound[p])<3 for p in guides)} below 3 inbound')
for err in errors:print('FAIL',err)
print(f'CHECKED {len(pages)} pages; {len(errors)} failures')
sys.exit(bool(errors))
