#!/usr/bin/env python3
"""Fail closed on NullKey quality, integrity, graph and sitemap checks."""
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote, parse_qs
from collections import defaultdict, deque
from html.parser import HTMLParser
import json, re, sys, hashlib, xml.etree.ElementTree as ET
from play_links import PACKAGE, campaign_for_route

root=Path(__file__).resolve().parents[2]; product=root/'nullkey'; errors=[]
NAMES=['samsung','secure folder','safe folder','google photos','google drive','google one','files by google','icloud','onedrive','dropbox','keepsafe','vaultaire','calculator vault','bitwarden','1password','lastpass','signal','whatsapp','telegram','cryptomator','veracrypt','norton','proton','mega','apple','pixel','xiaomi','huawei','oneplus','chrome','gmail','microsoft','windows','facebook','instagram','tiktok','amazon','openai','chatgpt','kaspersky','mcafee','nordvpn','tutanota']
# iPhone and iOS are platform names for NullKey's own roadmap (Oscar, 2026-11-08), not competing products, so they are not on this list.
BANNED=re.compile(r'\b(?:audited|zero[ -]knowledge|military[ -]grade|end[ -]to[ -]end)\b',re.I)
GLYPH=re.compile('[—←-⇿⟀-⟿\U0001F000-\U0001FAFF]')
MONEY=re.compile(r'(?:[£$€]\s*\d|\b\d+(?:\.\d+)?\s*(?:pounds|dollars|euros|gbp|usd|eur)\b)',re.I)
def fail(path,message):errors.append(f'{path}: {message}')
def check_play_url(href, path):
 u=urlsplit(href); outer=parse_qs(u.query,keep_blank_values=True)
 if u.scheme!='https' or u.netloc.lower()!='play.google.com' or u.path!='/store/apps/details' or outer.get('id')!=[PACKAGE]:
  fail(path.relative_to(root),'incorrect Google Play package: '+href); return
 route='/'+str(path.relative_to(product)).replace('index.html','')
 expected={'utm_source':['alvento-site'],'utm_medium':['web'],'utm_campaign':[campaign_for_route(route)]}
 if set(outer)!={'id','referrer'} or len(outer.get('referrer',[]))!=1 or parse_qs(outer['referrer'][0],keep_blank_values=True)!=expected:
  fail(path.relative_to(root),'incorrect Google Play campaign referrer: '+href)

def is_disclaimed(text, match):
 prefix=text[max(0,match.start()-85):match.start()]
 # Only a direct negation or this existing caution about marketing labels.
 return bool(re.search(r'\b(?:no(?:\s+independent)?|not(?:\s+independently)?)\s*$',prefix,re.I) or re.search(r'Answers are more useful than labels such as [“"\']$',prefix,re.I))

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

class GuideCTA(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.in_article=False;self.sections=0;self.mid_positions=[];self.mid_text=[];self.in_mid=False;self.anchors=[];self.current=None;self.end_depth=0;self.end_text=[];self.end_count=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='div' and 'guide-download' in a.get('class','').split():self.end_count+=1;self.end_depth=1
  elif self.end_depth and tag not in ('img','br','hr','input','meta','link','source'):self.end_depth+=1
  if tag=='article':self.in_article=True
  if tag=='section' and self.in_article:self.sections+=1
  if tag=='aside' and a.get('data-cta')=='mid':self.mid_positions.append(self.sections if self.in_article else -1);self.in_mid=True
  if tag=='a':self.current={'href':a.get('href',''),'rel':a.get('rel','').split(),'text':'','image':False,'mid':self.in_mid}
  if tag=='img' and self.current is not None:self.current['image']=True
 def handle_data(self,data):
  if self.in_mid:self.mid_text.append(data)
  if self.end_depth:self.end_text.append(data)
  if self.current is not None:self.current['text']+=data
 def handle_endtag(self,tag):
  if tag=='a' and self.current is not None:self.anchors.append(self.current);self.current=None
  if tag=='aside' and self.in_mid:self.in_mid=False
  if tag=='article':self.in_article=False
  if self.end_depth:self.end_depth-=1

def check_guide_cta(path):
 d=GuideCTA();d.feed(path.read_text(encoding='utf-8'));rel=path.relative_to(root)
 if d.mid_positions!=[2]:fail(rel,f'expected one mid-article CTA after section 2, got {d.mid_positions}')
 if d.end_count!=1:fail(rel,f'expected one end download block, got {d.end_count}')
 cta=' '.join(d.mid_text+d.end_text)
 if MONEY.search(cta) or re.search(r'\bprice\b',cta,re.I) or BANNED.search(cta):fail(rel,'price, currency or banned claim in CTA')
 play=[]
 for a in d.anchors:
  u=urlsplit(a['href'])
  if u.netloc.lower()=='play.google.com':
   check_play_url(a['href'],path)
   if 'noopener' not in a['rel']:fail(rel,'Play link missing noopener')
   if not a['image']:play.append(a)
 labels={a['text'].strip() for a in play}
 if not {'Get NullKey on Google Play','Download NullKey from Google Play'} <= labels:fail(rel,'missing two distinct non-badge Play link labels')
 if not any(a['mid'] and a['text'].strip()=='Get NullKey on Google Play' for a in play):fail(rel,'missing Play text button in mid CTA')
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
 play_links=[link for link in doc.links if urlsplit(link).netloc.lower()=='play.google.com']
 if path != product/'privacy/index.html' and not play_links:fail(rel,'missing Play CTA')
 for link in play_links:check_play_url(link,path)
 if doc.canon!=[url]:fail(rel,f'missing or wrong canonical {doc.canon}')
 if path != product/'privacy/index.html' and (not doc.title or len(doc.title)>65):fail(rel,f'title length {len(doc.title)} (max 65)')
 if doc.title.casefold() in titles:fail(rel,f'duplicate title with {titles[doc.title.casefold()]}')
 titles[doc.title.casefold()]=rel
 visible += ' '+doc.title+' '+' '.join(x for vals in doc.meta.values() for x in vals)+' '+' '.join(doc.jsonld)
 desc=doc.meta.get('description',[])
 if path != product/'privacy/index.html' and (len(desc)!=1 or not 120<=len(desc[0])<=160):fail(rel,f'description length {[len(x) for x in desc]} (120-160)')
 if len(desc)==1:
  if desc[0].casefold() in descriptions:fail(rel,f'duplicate description with {descriptions[desc[0].casefold()]}')
  descriptions[desc[0].casefold()]=rel
 for raw in doc.jsonld:
  try:json.loads(raw)
  except (ValueError,TypeError) as exc:fail(rel,f'invalid JSON-LD {exc}')
 # Privacy policy is legally preserved byte for byte; title/description length and glyph checks cannot require edits.
 if path != product/'privacy/index.html' and GLYPH.search(visible):fail(rel,'banned glyph '+repr(GLYPH.search(visible).group()))
 if MONEY.search(visible):fail(rel,'currency amount '+repr(MONEY.search(visible).group()))
 for match in BANNED.finditer(visible):
  if not is_disclaimed(visible,match):fail(rel,'banned claim '+repr(match.group()))
 for name in NAMES:
  # The privacy policy must name the payment processor and backup system it describes (Apple, iCloud); allowed on that page only (2026-11-10).
  if path == product/'privacy/index.html' and name in ('apple','icloud'):continue
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
 if 'href="/nullkey/"' not in (root/p).read_text():print('WARNING',p+': known parent homepage-link assertion: missing href="/nullkey/"')
privacy=product/'privacy/index.html'
if hashlib.sha256(privacy.read_bytes()).hexdigest()!='11a9cf232ff8ff781f8f74046266483a97072a9f7ad3645f65f4d73220fd2966':fail(privacy,'privacy policy changed')
inbound=defaultdict(set)
for src,targets in graph.items():
 for dst in targets:inbound[dst].add(src)
hub=product/'guides/index.html'; seen={hub};queue=deque([hub])
while queue:
 for target in graph[queue.popleft()]:
  if target not in seen:seen.add(target);queue.append(target)
guides=[p for p in pages if p.parent.parent==product/'guides']
legacy_slugs={g[0] for g in json.loads((root/'scripts/nullkey/content/guides.json').read_text())}
for path in guides:
 check_guide_cta(path)
 if path.parent.name not in legacy_slugs | new_slugs:fail(path.relative_to(root),'stale guide output has no source')
for path in guides:
 if path not in seen:fail(path.relative_to(root),'orphan: unreachable from guide hub')
 if len(inbound[path])<3:fail(path.relative_to(root),f'only {len(inbound[path])} distinct inbound internal pages (minimum 3)')
 print('INBOUND',len(inbound[path]),'/'+str(path.relative_to(root)).replace('index.html',''))
print(f'GRAPH: {len(guides)} guides; {sum(p not in seen for p in guides)} unreachable from hub; {sum(len(inbound[p])<3 for p in guides)} below 3 inbound')
for err in errors:print('FAIL',err)
print(f'CHECKED {len(pages)} pages; {len(errors)} failures')
sys.exit(bool(errors))
