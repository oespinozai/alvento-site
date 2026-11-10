"""Render comparison pages using validated, explicitly supplied comparison content."""
import json
from pathlib import Path
from datetime import date
from compare_merge import validate

DIR=Path(__file__).parent/'content'/'compare'
def load():
 out=[]
 for path in sorted(DIR.glob('*.json')):
  d=validate(json.loads(path.read_text(encoding='utf8')))
  if path.stem != d['skeleton']['competitor_slug']:raise ValueError('Comparison filename does not match slug')
  out.append(d)
 return out

def render(ns, comparisons):
 if not comparisons:return
 page,esc,a,faq=ns['page'],ns['esc'],ns['a'],ns['faq']; origin=ns['ORIGIN']
 links=lambda skip='': ''.join('<a class="guide" href="/compare/'+esc(x['skeleton']['slug'])+'/"><h3>NullKey vs '+esc(x['skeleton']['competitor_name'])+'</h3><span class="read">Read comparison</span></a>' for x in comparisons if x['skeleton']['slug']!=skip)
 intro='Compare NullKey with the main types of Android vault and private folder, using plain descriptions of each type and practical differences.'
 page('/compare/','NullKey comparisons',intro,ns['head']('Comparisons','Compare your options',intro)+'<div class="guide-grid section">'+links()+'</div><section class="section"><h2>Our method</h2><p>These pages compare NullKey with types of app, not with individual products. Features vary between apps of the same type, so read the description of an app before you rely on it. Spot something out of date? Email <a href="mailto:hello@alvento.uk">hello@alvento.uk</a>.</p></section>'+ns['hub_cta']())
 for d in comparisons:
  s,p=d['skeleton'],d['prose']; slug=s['slug']; name=s['competitor_name']; day=s['facts_checked_utc'][:10]; label=ns['date_label'](day); route='/compare/'+slug+'/'; url=origin+route
  table='<p>Scroll the table horizontally to see both options.</p><div class="compare-scroll" role="region" aria-label="Feature comparison table" tabindex="0"><table><caption>Feature comparison</caption><thead><tr><th scope="col">Point</th><th scope="col">NullKey</th><th scope="col">'+esc(name)+'</th></tr></thead><tbody>'
  for r in s['table']:
   table+='<tr data-row="'+esc(r['row_id'])+'"><th scope="row">'+esc(r['point'])+'</th><td>'+esc(r['nullkey'])+'</td><td>'+esc(r['competitor'])+('' if r['competitor_ref']=='category' else ' <sup><a href="#ref-'+esc(r['competitor_ref'])+'" aria-label="Reference '+esc(r['competitor_ref'])+'">'+esc(r['competitor_ref'])+'</a></sup>')+'</td></tr>'
  table+='</tbody></table></div>'
  css='<style>main{overflow-wrap:anywhere}.compare-scroll{overflow-x:auto;max-width:100%;margin:1.5rem 0}.compare-scroll table{border-collapse:collapse;min-width:680px;width:100%}.compare-scroll th,.compare-scroll td{border:1px solid #565d50;padding:1rem;text-align:left;vertical-align:top}.compare-scroll caption{text-align:left;margin-bottom:.8rem}.compare-scroll a{color:#c4f042}</style>'
  paras=lambda section: ''.join('<p>'+esc(v)+'</p>' for v in section['p'])
  body=css+'<nav aria-label="Breadcrumb"><a href="/compare/">Comparisons</a> / <span aria-current="page">'+esc(name)+'</span></nav>'+ns['head']('Comparison','NullKey vs '+esc(name),esc(p['thesis']))+'<p>Facts about '+esc(name)+' checked on '+label+' from the sources below. Spot something out of date? Email <a href="mailto:hello@alvento.uk">hello@alvento.uk</a>.</p><section class="section"><h2>Feature comparison</h2>'+table+'</section><section class="section"><h2>'+esc(p['honest_case']['h'])+'</h2>'+paras(p['honest_case'])+'</section>'+ns['mid_guide_cta']()
  for x in p['differences']:body+='<section class="section"><h2>'+esc(x['h'])+'</h2>'+paras(x)+'</section>'
  body+='<section class="section"><h2>Bottom line</h2><p>'+esc(p['bottom_line'])+'</p></section><section class="section"><h2>References</h2><ol>'
  for ref in s['references']:
   body+='<li id="ref-'+esc(ref['id'])+'"><a href="'+esc(ref['url'])+'" rel="noopener noreferrer">'+esc(ref.get('title',ref['url']))+'</a> (fetched '+ns['date_label'](ref['fetched_utc'][:10])+')</li>'
  body+='</ol></section><section class="section faq"><h2>Frequently asked questions</h2>'+''.join(faq(esc(x['q']),esc(x['a'])) for x in p['faq'])+'</section>'+ns['guide_end_cta']()+'<section class="section"><h2>More comparisons</h2><div class="guide-grid">'+links(slug)+'</div></section><section class="section"><h2>Related guides</h2><ul><li>'+a('/guides/hidden-folder-vs-encrypted-vault/','Hidden folders and encrypted vaults')+'</li><li>'+a('/guides/backup-offline-vault/','How to back up an offline vault')+'</li></ul></section>'
  schema={'@context':'https://schema.org','@graph':[{'@type':'Article','headline':p['title'],'dateModified':day,'author':{'name':'Alvento Ltd'},'mainEntityOfPage':url},{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Comparisons','item':origin+'/compare/'},{'@type':'ListItem','position':2,'name':'NullKey vs '+name,'item':url}]}]}
  page(route,p['title'],p['description'],body,schema,compact_title=True)
