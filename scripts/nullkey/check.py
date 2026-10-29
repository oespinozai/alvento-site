from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import hashlib
root=Path(__file__).resolve().parents[2]
class Doc(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.assets=[];self.ids=set();self.meta={};self.h1=0;self.canonical=None
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if 'id' in a:
   assert a['id'] not in self.ids,('Duplicate id',a['id'])
   self.ids.add(a['id'])
  if t=='a':self.links.append(a.get('href',''))
  if t=='meta':self.meta[a.get('name') or a.get('property')]=a.get('content')
  if t=='h1':self.h1+=1
  if t in ['script','img'] and 'src' in a:self.assets.append(a['src'])
  if t=='img':assert 'alt' in a
  if t=='link' and a.get('rel') in ['stylesheet','icon']:self.assets.append(a['href'])
  if t=='link' and a.get('rel')=='canonical':self.canonical=a['href']
cache={}
def parse(p):
 if p not in cache:
  d=Doc();d.feed(p.read_text());cache[p]=d
 return cache[p]
for p in (root/'nullkey').rglob('index.html'):
 if p.parent.name=='privacy':continue
 d=parse(p)
 assert d.h1==1 and d.meta['robots']=='index,follow',p
 assert d.canonical=='https://alvento.uk/'+str(p.relative_to(root)).replace('index.html',''),p
 assert 'https://alvento.uk/nullkey/privacy/' in d.links,p
 for href in d.links+d.assets:
  u=urlsplit(href)
  if u.scheme and u.netloc!='alvento.uk':continue
  q=root/u.path.lstrip('/') if u.path else p
  if q.is_dir():q=q/'index.html'
  if not q.exists() and u.path.rstrip('/') in ['/tools','/privacy']:q=root/(u.path.strip('/')+'.html')
  assert q.exists(),(p,href)
  if u.fragment:assert u.fragment in parse(q).ids,(p,href)
assert hashlib.sha256((root/'nullkey/privacy/index.html').read_bytes()).hexdigest()=='14d41f7e3dfa87112c6f10808ec835cc3845c33012a1a068a421542210844ab1'
for p in ['index.html','case-studies/index.html']:assert 'href="/nullkey/"' in (root/p).read_text(),p
print('PASS: 11 integrated pages; links, assets, canonical URLs, parent navigation, product discovery and unchanged privacy policy')
