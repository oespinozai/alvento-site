#!/usr/bin/env python3
"""Merge reviewed skeleton and prose JSON deterministically; fail closed on invalid input."""
import argparse, json, re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit

BAN=['best','worst','safest','better than','worse than','superior','inferior','scam','unsafe','dangerous','fake','sketchy','shady','terrible','awful','avoid','beats ','untrustworthy','careless','audited','zero knowledge','military','end-to-end','unhackable','guarantee','100%']
GLYPH=re.compile('[—–→←↑↓•…]|[\U0001F000-\U0001FAFF☀-➿]|!')
MONEY=re.compile(r'[£$€]|\b(?:pounds|dollars|euros|price|discount|cheap|expensive)\b',re.I)
POPULAR=re.compile(r'\b(?:stars?|rated|rating|reviews?|downloads?|installs?|million|billion)\b',re.I)
WORDS=re.compile(r"[A-Za-z0-9’']+")
OTHER=['samsung','google','keepsafe','hide it pro','gallery vault','calculator','files by google','secure folder','safe folder','bitwarden','1password','lastpass','signal','whatsapp','telegram','dropbox','onedrive','icloud','apple','vaultaire','proton','cryptomator','norton','microsoft','facebook','instagram','tiktok','amazon','pixel','xiaomi','huawei','chrome','gmail']
SLUG=re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*')

def validate(data):
 s=data['skeleton']; p=data['prose']; slug=s['competitor_slug']; errors=[]
 if not SLUG.fullmatch(slug) or s['slug']!='nullkey-vs-'+slug: errors.append('invalid slug')
 try: datetime.fromisoformat(s['facts_checked_utc'].replace('Z','+00:00'))
 except (KeyError,ValueError): errors.append('invalid facts date')
 refs={r['id']:r for r in s['references']}
 if not refs or len(refs)!=len(s['references']): errors.append('missing or duplicate references')
 for r in refs.values():
  u=urlsplit(r['url'])
  if u.scheme!='https' or not u.netloc: errors.append('reference must use HTTPS')
  try: datetime.fromisoformat(r['fetched_utc'].replace('Z','+00:00'))
  except (KeyError,ValueError): errors.append('invalid reference date')
 rows={r['row_id'] for r in s['table']}
 HEDGE=re.compile(r'(Varies|Typically|Some|Yes, by definition|Part of)')
 for r in s['table']:
  if r.get('competitor_ref')=='category' and not HEDGE.match(r.get('competitor','')):errors.append('category row must start with a hedge: '+r.get('row_id',''))
 if not rows or len(rows)!=len(s['table']):errors.append('missing or duplicate rows')
 for r in s['table']:
  if not all(r.get(k) for k in ('point','nullkey','competitor','competitor_ref')) or (r.get('competitor_ref') not in refs and r.get('competitor_ref')!='category'):errors.append('missing row or reference')
 if set(p)!={'title','description','thesis','honest_case','differences','bottom_line','faq'}:errors.append('invalid prose keys')
 texts=[p['title'],p['description'],p['thesis'],p['bottom_line']]; hc=p['honest_case']; texts += [hc['h']]+hc['p']
 if len(hc['p'])!=2 or len(p['differences'])!=3 or len(p['faq'])!=3:errors.append('invalid prose section counts')
 for item in [hc]+p['differences']+p['faq']:
  if not item.get('rows_used') or any(x not in rows for x in item['rows_used']):errors.append('invalid rows_used')
 for item in p['differences']:
  if not 1<=len(item['p'])<=2:errors.append('invalid paragraph count')
  texts += [item['h']]+item['p']
 for item in p['faq']:texts += [item['q'],item['a']]
 if len(p['title'])>65 or not p['title'].startswith('NullKey vs ') or not 130<=len(p['description'])<=155:errors.append('title or description length')
 full='\n'.join(texts); count=len(WORDS.findall(full)); all_text=full+'\n'+'\n'.join(' '.join(r[k] for k in ('point','nullkey','competitor')) for r in s['table']); low=all_text.lower()
 if not 450<=count<=800:errors.append(f'prose words {count}, expected 450-800')
 for b in BAN:
  if b in low:errors.append('banned phrase '+b)
 if GLYPH.search(all_text):errors.append('banned glyph')
 for brand in OTHER:
  if brand not in s['competitor_name'].lower() and brand not in ('google','android') and re.search(r'(?<![a-z])'+re.escape(brand)+r'(?![a-z])',full,re.I):errors.append('other brand in prose: '+brand)
 if MONEY.search(all_text):errors.append('money or price language')
 if POPULAR.search(all_text):errors.append('popularity language')
 if errors: raise ValueError(f'{slug}: '+ '; '.join(errors))
 return data

def main():
 ap=argparse.ArgumentParser();ap.add_argument('drafts',type=Path);ap.add_argument('output',type=Path);ap.add_argument('slug',nargs='+');args=ap.parse_args();args.output.mkdir(parents=True,exist_ok=True)
 for slug in args.slug:
  if not SLUG.fullmatch(slug):raise ValueError('invalid slug')
  s=json.loads((args.drafts/f'skeleton-{slug}.json').read_text());p=json.loads((args.drafts/f'prose-{slug}.json').read_text());d=validate({'skeleton':s,'prose':p});(args.output/f'{slug}.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
  print('Merged',slug)
if __name__=='__main__':main()
