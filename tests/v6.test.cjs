const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {environment}=require('./dom.cjs');
const {files,withoutComments}=require('./source-audit.cjs');
const root=path.resolve(__dirname,'../dist');
const source=name=>fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
const pages=['index.html','linha-de-frente/index.html','balcao-digital/index.html','privacidade/index.html'];
const markup=file=>fs.readFileSync(path.join(root,file),'utf8');
function app(options={},file='index.html',engine=false){const env=environment(markup(file),options);env.window.location.pathname=file==='index.html'?'/':'/'+file.replace('index.html','');for(const script of ['whatsapp','consent','track','content','experience',...(engine?['interactions']:[])])env.run(source(script));return env;}
const saved=(measurement,marketing)=>JSON.stringify({version:1,measurement,marketing,updatedAt:'2026-11-14T00:00:00.000Z'});

test('V9: public HTML/CSS/JS has no text arrows, geometric emoji or pictographs outside comments',()=>{
 const forbidden=/[\u2190-\u21ff\u25a0-\u25ff\u2600-\u27bf\u{1f000}-\u{1faff}\ufe0f\u20e3]|\p{Extended_Pictographic}/gu;
 for(const file of files(root))assert.doesNotMatch(withoutComments(fs.readFileSync(file,'utf8'),path.extname(file)),forbidden,path.relative(root,file));
 // Comments can contain design notes; a string or URL must not hide a visible symbol.
 assert.equal(withoutComments('// \u2192\n/* \u2197 */ const label="x";','.js').includes('\u2192'),false);
 assert.ok(withoutComments('const label="https://example.com/\u2197"; // comment','.js').includes('\u2197'));
 for(const file of pages){const doc=environment(markup(file)).document;
  for(const control of doc.querySelectorAll('.nx-flip-control'))assert.equal(control.querySelectorAll('.nx-icon').length,1,'Single card icon');
  for(const summary of doc.querySelectorAll('summary')){const icons=summary.querySelectorAll('.nx-icon--chevron');assert.equal(icons.length,1);assert.equal(icons[0].getAttribute('aria-hidden'),'true');}
 }
});

test('V9 R-1: Canvas uses layout width when innerWidth includes horizontal overflow',()=>{
 for(const layoutWidth of [360,390,768,1440]){
  const env=app({width:layoutWidth+8,layoutWidth},'index.html',true);env.flush(160);
  const debug=env.window.NEXUS_DEBUG,canvas=env.document.querySelector('canvas');assert.equal(canvas.width,Math.round(layoutWidth*debug.dpr));
  assert.equal(debug.idle,true);assert.ok([...debug.X,...debug.Y].every(Number.isFinite));
  if(layoutWidth<900){const positions=debug.scenes.map(s=>s.a);env.height-=80;env.event('resize');env.flush(2);assert.deepEqual(debug.scenes.map(s=>s.a),positions,'Address bar changes keep scene geometry');}
 }
});

test('V9: spacing tokens define the mobile/tablet/desktop contract and section/hero consume it',()=>{
 const variables=withoutComments(fs.readFileSync(path.join(root,'css/variables.css'),'utf8'),'.css');
 const css=withoutComments(fs.readFileSync(path.join(root,'css/v9.css'),'utf8'),'.css');
 const values=name=>[...variables.matchAll(new RegExp('--space-'+name+':\\s*(\\d+)px','g'))].map(m=>Number(m[1]));
 assert.deepEqual(values('section'),[72,96,128]);assert.deepEqual(values('block'),[32,40,48]);assert.deepEqual(values('tight'),[12,16]);
 assert.match(css,/\.nx-section\s*\{[^}]*padding-block:var\(--space-section\)/);
 assert.match(css,/\.nx-section\.nx-hero[^}]*padding-top:calc\(var\(--header-h\) \+ var\(--space-block\)\)[^}]*padding-bottom:var\(--space-section\)/);
 for(const file of pages)assert.ok(environment(markup(file)).document.querySelector('link[href="/css/v9.css?v=9"]'));
});

test('V9 P-2: privacy introduction and sixteen legal sections are siblings with intact anchors',()=>{
 const doc=environment(markup('privacidade/index.html')).document,article=doc.querySelector('.nx-legal-document');
 assert.ok(article);const sections=article.querySelectorAll('section');assert.equal(sections.length,17);
 for(const section of sections){assert.equal(section.parentElement,article);assert.equal(section.parentElement.closest('section'),null);}
 assert.equal(doc.querySelector('#inicio').querySelectorAll('section').length,0);
 assert.equal(doc.querySelectorAll('.nx-legal nav a[href^="#"]').length,16);
 assert.equal(doc.querySelector('[data-consent-open]').closest('section').id,'contato');
});

test('V8.2: product identity is present in navigation, body, windows and metadata',()=>{
 for(const [code,route,name] of [['lf','linha-de-frente','Linha de Frente'],['bd','balcao-digital','Balcão Digital']]){
  const doc=environment(markup(route+'/index.html')).document;
  assert.equal(doc.body.dataset.product,code);
  assert.ok(doc.querySelector('title').textContent.startsWith(name));
  assert.ok(doc.querySelector('meta[property="og:title"]').getAttribute('content').startsWith(name));
  assert.match(doc.querySelector('.nx-product-tag').textContent,/PRODUTO NEXUS/);
  assert.ok(doc.querySelector('.nx-nav a[aria-current="page"] .nx-product-glyph'));
  assert.equal(doc.querySelector('.nx-window-bar .nx-lockup').dataset.product,code);
  assert.equal(doc.querySelector('h1').textContent,name);
  assert.equal(doc.querySelector('.nx-hero-copy .nx-lockup'),null,'Product hero keeps the tag and H1 without a redundant lockup');
  assert.ok(doc.querySelector('.nx-hero-split .nx-hero-copy .nx-product-role'));
  assert.ok(doc.querySelector('.nx-hero-preview .nx-window-badge').textContent.includes('SIMULAÇÃO'));
  assert.equal(doc.querySelectorAll('[data-demo-lf], [data-demo-chat]').length,1,'Preview must not duplicate the interactive demo');
  const live=app({storage:saved(true,false)},route+'/index.html');live.document.querySelector('[data-cta-origin="'+code+'-hero"]').click();
  assert.equal(live.window.dataLayer.find(e=>e.event==='cta_click').product,route);
 }
 for(const file of pages){const doc=environment(markup(file)).document;assert.equal(doc.querySelectorAll('.nx-footer .nx-lockup').length,2);}
});

test('V8.2: home bands and shortcuts distinguish both products without replacing their flows',()=>{
 const doc=environment(markup('index.html')).document;
 for(const code of ['lf','bd']){
  const band=doc.querySelector('#solucao-'+code);assert.equal(band.dataset.product,code);
  assert.ok(band.classList.contains('nx-product-band'));assert.ok(band.querySelector('h2.nx-product-name'));
  assert.ok(band.querySelector('.nx-product-name'));assert.ok(!band.querySelector('.nx-lockup'));assert.equal(band.querySelectorAll('.nx-flow-track li').length,5);
 }
 assert.equal(doc.querySelectorAll('.nx-product-shortcuts a').length,2);
 assert.equal(doc.querySelectorAll('.nx-product-connector .nx-lockup').length,2);
 assert.match(doc.querySelector('.nx-product-connector').textContent,/Funcionam separadas. Podem trabalhar juntas/);
});

test('V8.2: method and prospect rails keep flips exclusive, keyboard focus and narrative',()=>{
 for(const file of ['index.html','linha-de-frente/index.html']){
  const env=app({},file),doc=env.document,rail=doc.querySelector('[data-exclusive-flips]'),buttons=rail.querySelectorAll('[data-flip]');
  for(const button of buttons){
   if(button.getAttribute('aria-expanded')==='true')button.click();
   button.focus();button.pressKey('Enter');
   assert.equal(rail.querySelectorAll('[aria-expanded="true"]').length,1);
   assert.equal(doc.activeElement,button);
   assert.equal(doc.querySelector('#'+button.getAttribute('aria-controls')).hidden,false);
   assert.ok(button.closest('[data-scene]').dataset.narrativeStep);
  }
 }
 const bd=app({},'balcao-digital/index.html'),details=bd.document.querySelectorAll('[data-rail-detail]');assert.equal(details.length,5);
 details[4].open=true;details[4].dispatchEvent({type:'toggle',bubbles:false});
 assert.equal(details.filter(d=>d.open).length,1);assert.equal(bd.document.querySelector('#fluxo-atendimento').dataset.narrativeStep,'1');
 for(const [file,count] of [['linha-de-frente/index.html',9],['balcao-digital/index.html',9]])assert.equal(environment(markup(file)).document.querySelectorAll('main section').length,count);
});

test('V8.2: layout rhythm preserves facts, all persona flips and accessible FAQs',()=>{
 for(const file of ['index.html','linha-de-frente/index.html','balcao-digital/index.html']){
  const doc=environment(markup(file)).document;assert.ok(doc.querySelector('.nx-faq-layout .nx-faq-intro'));
  assert.ok(doc.querySelector('.nx-faq-layout .nx-faq details summary'));assert.ok(doc.querySelector('.nx-final'));
 }
 const home=environment(markup('index.html')).document;assert.equal(home.querySelectorAll('.nx-trust.nx-bento dt').length,4);assert.match(home.querySelector('#confianca').textContent,/Você sabe com quem fala/);
 const lf=environment(markup('linha-de-frente/index.html')).document;assert.ok(lf.querySelector('.nx-operation-bento [data-flip]'));assert.ok(lf.querySelector('.nx-comparison'));
 const bd=environment(markup('balcao-digital/index.html')).document;assert.equal(bd.querySelectorAll('.nx-persona-bento [data-flip]').length,8);assert.equal(bd.querySelectorAll('.nx-fact-strip .nx-index').length,3);assert.equal(bd.querySelectorAll('.nx-comparison h3').length,2);
 for(const button of bd.querySelectorAll('.nx-persona-bento [data-flip]')){
  const teaser=button.querySelector('.nx-card-teaser'),panel=bd.querySelector('#'+button.getAttribute('aria-controls'));
  assert.ok(teaser);assert.equal(teaser.textContent,panel.querySelectorAll('p')[1].textContent,'Persona preview reuses the approved description, leaving the back intact');
 }
});

test('V8.2: preference status dismisses, restarts its timeout and is not restored on reload',()=>{
 const env=app(),doc=env.document,toast=doc.querySelector('.nx-cookie-toast');
 assert.equal(toast.textContent,'');assert.equal(toast.getAttribute('role'),'status');assert.equal(toast.getAttribute('aria-live'),'polite');assert.equal(toast.getAttribute('aria-atomic'),'true');
 doc.querySelector('[data-consent="reject"]').click();assert.equal(toast.textContent,'Preferências salvas.');
 env.advanceTime(3000);doc.querySelector('[data-consent="reject"]').click();env.advanceTime(500);assert.equal(toast.textContent,'Preferências salvas.');
 env.advanceTime(2999);assert.ok(toast.textContent);env.advanceTime(1);assert.equal(toast.textContent,'');
 assert.equal(app({storage:env.storageValue}).document.querySelector('.nx-cookie-toast').textContent,'');
 const css=fs.readFileSync(path.join(root,'css/consent.css'),'utf8');assert.match(css,/\.nx-cookie-toast:empty\s*\{\s*display:none/);
 for(const id of ['solucao-lf','solucao-bd'])assert.ok(doc.querySelector('#'+id+' .nx-product-copy .nx-veil'));
});

test('V8.2: product text and CTA gradient samples meet AA against Nexus Void',()=>{
 const css=fs.readFileSync(path.join(root,'css/variables.css'),'utf8');
 const color=token=>css.match(new RegExp('--nx-'+token+':\\s*#([0-9a-f]{6})','i'))[1].match(/../g).map(v=>parseInt(v,16)/255);
 const luminance=rgb=>rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const bg=luminance(color('void')),ratio=rgb=>(luminance(rgb)+.05)/(bg+.05);
 for(const code of ['lf','bd']){
  assert.ok(ratio(color(code+'-text'))>=4.5,code+' text');
  const a=color(code+'-a'),b=color(code+'-b');
  for(let i=0;i<=100;i++)assert.ok(ratio(a.map((v,j)=>v+(b[j]-v)*i/100))>=4.5,code+' CTA gradient '+i);
 }
});
test('4 pages: unique IDs, one H1, existing local assets/routes and ARIA references',()=>{
 for(const file of pages){const html=markup(file),env=environment(html),doc=env.document;
  assert.equal(doc.querySelectorAll('h1').length,1,file);
  for(const el of doc.querySelectorAll('.nx-r'))assert.ok(el.closest('[data-scene]'),`${file}: animated text must belong to a scene`);
  const ids=doc.querySelectorAll('[id]').map(el=>el.id);assert.equal(new Set(ids).size,ids.length,file);
  for(const el of doc.querySelectorAll('[aria-controls], [aria-labelledby], [aria-describedby]'))for(const name of ['aria-controls','aria-labelledby','aria-describedby'])for(const id of (el.getAttribute(name)||'').split(/\s+/).filter(Boolean))assert.ok(ids.includes(id),`${file}: ${name}=${id}`);
  for(const el of doc.querySelectorAll('[href], [src]'))for(const name of ['href','src']){const raw=el.getAttribute(name);if(!raw||/^(https?:|mailto:|data:)/.test(raw))continue;const [pathname,hash]=raw.split('#');if(hash&&(!pathname||pathname==='/')){if(!pathname||file==='index.html')assert.ok(ids.includes(hash),`${file}: ${raw}`);}if(pathname){const local=pathname.split('?')[0];assert.ok(local.startsWith('/'),`Root relative asset: ${raw}`);const target=path.join(root,local.endsWith('/')?local+'index.html':local);assert.ok(fs.existsSync(target),`${file}: ${raw}`);if(hash)assert.ok(markup(local.replace(/^\//,'')+'index.html').includes(`id="${hash}"`));}}
  assert.ok(html.includes('Preferências de cookies'));assert.ok(html.includes('64.020.297/0001-30'));assert.ok(html.includes('contato@nexusfluxo.com'));
  assert.doesNotMatch(html,/connect\.facebook\.net|facebook\.com\/tr|<noscript><img/);
  assert.doesNotMatch(html,/raspagem|scraping/i);
 }
 assert.ok(markup('privacidade/index.html').includes('64.020.297/0001-30') && !markup('privacidade/index.html').includes('<!--'));
});
test('Commercial links work without JS and use exact per-origin message',()=>{
 const env=app();
 for(const file of pages)for(const el of environment(markup(file)).document.querySelectorAll('[data-contact="whatsapp"]')){
  assert.equal(el.getAttribute('href'),env.window.NEXUS.whatsapp.url(el.dataset.ctaOrigin));assert.equal(el.getAttribute('target'),'_blank');assert.match(el.getAttribute('rel'),/noopener/);assert.match(el.getAttribute('aria-label'),/nova aba/);
 }
});
test('I-01: six approved CTA captions and accessible names never include attribution',()=>{
 const labels={hero:'Quero melhorar meu comercial',final:'Conversar com a Nexus','lf-hero':'Quero conhecer a Linha de Frente','lf-final':'Quero conhecer a Linha de Frente','bd-hero':'Quero conhecer o Balcão Digital','bd-final':'Quero conhecer o Balcão Digital'};
 let count=0;
 for(const file of pages){
  const staticDoc=environment(markup(file)).document,env=app({},file);
  for(const origin of Object.keys(labels)){
   const selector=`[data-cta-origin="${origin}"]`,link=staticDoc.querySelector(selector);
   if(!link)continue;
   count++;
   const label=labels[origin],accessible=label+' (abre o WhatsApp em nova aba)';
   assert.equal(link.textContent,label);assert.equal(link.getAttribute('aria-label'),accessible);
   const live=env.document.querySelector(selector);assert.equal(live.textContent,label);assert.equal(live.getAttribute('aria-label'),accessible);
   // A stale/contaminated caption must not contaminate prepare() again.
   live.querySelector('span').textContent=label+' '+origin;
   env.window.NEXUS.whatsapp.prepare(live);env.window.NEXUS.whatsapp.prepare(live);
   assert.equal(live.textContent,label);assert.equal(live.getAttribute('aria-label'),accessible);assert.equal(live.dataset.ctaOrigin,origin);
  }
 }
 assert.equal(count,6);
});
test('I-02: both article and footer reopen preferences, focus the dialog and restore the opener',()=>{
 const env=app({},'privacidade/index.html'),doc=env.document,dialog=doc.querySelector('dialog');
 for(const opener of [doc.querySelector('[data-consent-open]'),doc.querySelector('[data-cookie-preferences]')]){
  assert.ok(opener);opener.focus();opener.click();assert.equal(dialog.open,true);assert.ok(dialog.contains(doc.activeElement));
  dialog.querySelector('[data-consent="close"]').click();assert.equal(dialog.open,false);assert.equal(doc.activeElement,opener);
 }
 doc.querySelector('[data-consent="accept"]').click();
 const article=doc.querySelector('[data-consent-open]');article.focus();article.click();
 dialog.querySelector('[data-consent="reject"]').click();assert.equal(doc.activeElement,article);assert.equal(env.reloads,1);
 const reloaded=app({storage:env.storageValue},'privacidade/index.html');assert.equal(reloaded.window.fbq,undefined);assert.equal(reloaded.document.querySelector('#nexus-meta-pixel'),null);
});
test('I-03: hiding the active control blurs it in the fixture; LF keeps keyboard continuity',()=>{
 for(const file of ['index.html','linha-de-frente/index.html']){
  const env=app({},file),doc=env.document;
  const start=doc.querySelector('[data-lf-start]'),next=doc.querySelector('[data-lf-next]'),reset=doc.querySelector('[data-lf-reset]');
  start.focus();start.hidden=true;assert.equal(doc.activeElement,doc.body);start.hidden=false;
  start.focus();start.click();assert.equal(doc.activeElement,next,'Start must focus the next visible control');
  while(!next.hidden){next.click();assert.equal(doc.activeElement,next.hidden?reset:next);}
  reset.click();assert.equal(doc.activeElement,next,'Restart must focus next');
  if(file!=='index.html'){
   for(let i=0;i<5;i++)next.click();
   const variant=doc.querySelector('[data-lf-variant]');assert.equal(variant.hidden,false);variant.focus();variant.click();
   assert.equal(variant.hidden,true);assert.equal(doc.activeElement,next);next.click();assert.equal(doc.activeElement,reset);
  }
 }
});
test('I-04: consent expires at 12 calendar months, including leap day, and rejects another version',()=>{
 const record=(stamp,version=1)=>JSON.stringify({version,measurement:true,marketing:true,updatedAt:stamp});
 const issued='2025-11-14T12:00:00.000Z',limit=Date.parse('2026-11-14T12:00:00.000Z');
 for(const [stamp,now,version,valid] of [[issued,limit-1,1,true],[issued,limit,1,false],[issued,limit+1,1,false],['2024-02-29T09:00:00.000Z',Date.parse('2025-02-28T08:59:59.999Z'),1,true],['2024-02-29T09:00:00.000Z',Date.parse('2025-02-28T09:00:00.000Z'),1,false],['2026-01-01T00:00:00.000Z',limit,2,false],['2027-01-01T00:00:00.000Z',limit,1,false]]){
  const env=app({storage:record(stamp,version),dateNow:now});
  assert.equal(env.document.querySelector('.nx-cookie-banner').hidden,valid);
  assert.equal(env.window.NEXUS.consent.get().marketing,valid);
  assert.equal(!!env.document.querySelector('#nexus-meta-pixel'),valid);
  if(!valid)assert.equal(env.window.fbq,undefined);
 }
});
test('I-04: active sessions expire and legacy/cross-tab restoration never renews the timestamp',()=>{
 const stamp='2025-11-14T12:00:00.000Z',limit=Date.parse('2026-11-14T12:00:00.000Z');
 const record=JSON.stringify({version:1,measurement:true,marketing:false,updatedAt:stamp});
 const env=app({storage:record,dateNow:limit-1000});
 env.advanceTime(999);assert.equal(env.window.NEXUS.consent.get().measurement,true);
 env.advanceTime(1);assert.equal(env.document.querySelector('.nx-cookie-banner').hidden,false);assert.equal(env.window.NEXUS.consent.get().measurement,false);
 const legacy=app({legacyStorage:record,dateNow:limit-1000});
 assert.equal(JSON.parse(legacy.storageValue).updatedAt,stamp);assert.equal(legacy.storageEntries.has('nexus.consent.v1'),false);
 legacy.event('storage',{key:'nexus-consent',newValue:record});assert.equal(legacy.window.NEXUS.consent.get().updatedAt,stamp);
 legacy.advanceTime(1000);assert.equal(legacy.document.querySelector('.nx-cookie-banner').hidden,false);
 const marketing=app({storage:JSON.stringify({version:1,measurement:true,marketing:true,updatedAt:stamp}),dateNow:limit-1000});
 marketing.advanceTime(1000);assert.equal(marketing.window.NEXUS.consent.get().marketing,false);assert.equal(marketing.reloads,1);
 const blocked=app({legacyStorage:saved(true,true),storageWriteError:true});blocked.document.querySelector('[data-consent="reject"]').click();assert.equal(blocked.storageEntries.has('nexus.consent.v1'),false);assert.equal(blocked.reloads,1);
});
test('I-04: accessible retention table and policy publish the same explicit periods',()=>{
 const env=app(),table=env.document.querySelector('.nx-cookie-table');
 assert.ok(table.querySelector('caption'));assert.equal(table.querySelectorAll('th[scope="col"]').length,3);assert.equal(table.querySelectorAll('th[scope="row"]').length,2);
 assert.match(table.textContent,/nexus-consent \(armazenamento local\)/);assert.match(table.textContent,/12 meses/);assert.match(table.textContent,/_fbp \/ _fbc \(Meta, só com marketing\)/);assert.match(table.textContent,/90 dias, conforme a Meta/);
 const policy=markup('privacidade/index.html');assert.doesNotMatch(policy,/conforme a tabela do banner|Conforme o banner de cookies/);
 assert.equal((policy.match(/12 meses\. _fbp \/ _fbc/g)||[]).length,1);assert.equal((policy.match(/90 dias, conforme a Meta/g)||[]).length,2);
});
test('I-05: public copy describes configured behavior and follow-up without absolute AI promises',()=>{
 const publicSources=[...pages.map(markup),...fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(path.join(root,'js',f),'utf8'))];
 publicSources.forEach(text=>assert.doesNotMatch(text,/não inventa|nunca erra|não comete erros|respostas? (?:sempre )?sem erros/i));
 for(const file of ['index.html','balcao-digital/index.html','privacidade/index.html']){
  assert.match(markup(file),/configurado para/i);assert.match(markup(file),/As conversas são acompanhadas para corrigir falhas/);
 }
 assert.match(app().window.NEXUS.content.chats[3].note,/As conversas são acompanhadas para corrigir falhas/);
});
test('M-01: each page has its own absolute canonical and matching og:url',()=>{
 for(const file of pages){const doc=environment(markup(file)).document,url='https://nexusfluxo.com/'+(file==='index.html'?'':file.replace('index.html',''));
  const canonical=doc.querySelectorAll('link[rel="canonical"]'),og=doc.querySelectorAll('meta[property="og:url"]');
  assert.equal(canonical.length,1);assert.equal(og.length,1);assert.equal(canonical[0].getAttribute('href'),url);assert.equal(og[0].getAttribute('content'),url);
 }
});
test('No consent or malformed storage: no pixel, no event queue',()=>{
 for(const storage of [null,'broken',JSON.stringify({version:1,marketing:'true',measurement:true}),saved(false,false)]){
  const env=app({storage});assert.equal(env.document.querySelector('#nexus-meta-pixel'),null);assert.equal(env.window.fbq,undefined);
  env.window.NEXUS.track('cta_click',{origin:'hero'});assert.equal(env.window.dataLayer,undefined);
 }
});
test('Reject, configure, measurement-only, marketing-only and reload restoration',()=>{
 const env=app(),doc=env.document;
 doc.querySelector('[data-consent="configure"]').click();assert.ok(doc.querySelector('dialog').open);assert.equal(doc.querySelector('#consent-marketing').checked,false);
 doc.querySelector('#consent-measurement').checked=true;doc.querySelector('[data-consent="save"]').click();
 assert.equal(env.window.NEXUS.consent.get().marketing,false);assert.equal(doc.querySelector('#nexus-meta-pixel'),null);
 env.window.NEXUS.track('demo_interaction',{demo:'lf',action:'start'});assert.ok(env.window.dataLayer.some(e=>e.event==='demo_interaction'));
 const restored=app({storage:env.storageValue});assert.equal(restored.document.querySelector('.nx-cookie-banner').hidden,true);assert.equal(restored.window.fbq,undefined);
 const marketing=app({storage:saved(false,true)});assert.ok(marketing.document.querySelector('#nexus-meta-pixel'));assert.equal(marketing.window.dataLayer,undefined);
 marketing.window.NEXUS.track('cta_click',{origin:'hero'});assert.ok(marketing.window.fbq.queue.some(args=>args[0]==='trackCustom'&&args[1]==='cta_click'));
 doc.querySelector('[data-cookie-preferences]').click();assert.equal(doc.querySelector('#consent-measurement').checked,true);doc.querySelector('[data-consent="reject"]').click();
 const count=env.window.dataLayer.length;env.window.NEXUS.track('cta_click',{origin:'hero'});assert.equal(env.window.dataLayer.length,count);
});
test('Acceptance inserts pixel once; revocation reloads only after successfully persisting denial',()=>{
 const env=app(),doc=env.document;
 doc.querySelector('[data-consent="accept"]').click();doc.querySelector('[data-consent="accept"]').click();assert.equal(doc.querySelectorAll('#nexus-meta-pixel').length,1);
 doc.querySelector('[data-consent="reject"]').click();assert.equal(env.reloads,1);assert.equal(JSON.parse(env.storageValue).marketing,false);
 const blocked=app({storage:saved(true,true),storageWriteError:true,storageRemoveError:true});blocked.document.querySelector('[data-consent="reject"]').click();assert.equal(blocked.reloads,0);assert.equal(blocked.window.NEXUS.consent.get().marketing,false);assert.ok(blocked.window.fbq.queue.some(a=>a[0]==='consent'&&a[1]==='revoke'));
 const quota=app({storage:saved(true,true),storageWriteError:true});quota.document.querySelector('[data-consent="reject"]').click();assert.equal(quota.reloads,1);assert.equal(quota.storageValue,null);
 const unavailable=app({storageReadError:true,storageWriteError:true});unavailable.document.querySelector('[data-consent="reject"]').click();assert.equal(unavailable.window.NEXUS.consent.get().marketing,false);assert.equal(unavailable.window.fbq,undefined);
});
test('Cross-tab revocation stops tracking and clears previous consent',()=>{
 const env=app({storage:saved(true,true)});env.event('storage',{key:'nexus-consent',newValue:saved(false,false)});assert.equal(env.window.NEXUS.consent.get().marketing,false);const before=env.window.fbq.queue.length;env.window.NEXUS.track('whatsapp_exit',{origin:'hero'});assert.equal(env.window.fbq.queue.length,before);assert.equal(env.reloads,1);
});
test('Events are identifiers only, and no Lead conversion is emitted',()=>{
 const env=app({storage:saved(true,true)});env.document.querySelector('[data-cta-origin="hero"]').click();
 assert.ok(env.window.dataLayer.some(x=>x.event==='cta_click'));assert.ok(env.window.dataLayer.some(x=>x.event==='whatsapp_exit'));
 env.window.NEXUS.track('Lead',{origin:'hero'});env.window.NEXUS.track('pain_select',{pain:'oportunidades',email:'private@example.com',text:'secret'});
 assert.doesNotMatch(JSON.stringify(env.window.dataLayer),/private|secret|Lead/);
 assert.doesNotMatch(JSON.stringify(env.window.fbq.queue),/private|secret|Lead/);
});
test('Product views observed before consent are sent once after the respective opt-in',()=>{
 const env=app();assert.equal(env.window.dataLayer,undefined);
 env.document.querySelector('[data-consent="accept"]').click();
 assert.equal(env.window.dataLayer.filter(e=>e.event==='product_view').length,2);
 assert.equal(env.window.fbq.queue.filter(e=>e[0]==='trackCustom'&&e[1]==='product_view').length,2);
 env.document.querySelector('[data-consent="accept"]').click();
 assert.equal(env.window.dataLayer.filter(e=>e.event==='product_view').length,2);
});
test('Pain selection changes narrative, panel, selection and announcement',()=>{
 const env=app({storage:saved(true,false)}),doc=env.document;
 for(const id of ['oportunidades','atendimento','retorno','informacao']){const button=doc.querySelector(`[data-pain="${id}"]`);button.click();assert.equal(doc.querySelector(`[data-pain-panel="${id}"]`).hidden,false);assert.equal(button.getAttribute('aria-expanded'),'true');assert.ok(doc.querySelector('[data-pain-status]').textContent);button.click();assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(doc.querySelector(`[data-pain-panel="${id}"]`).hidden,true);}
 assert.equal(env.window.dataLayer.filter(e=>e.event==='pain_select').length,4);
});
test('LF has 8 editorial steps, optional follow-up branch and meeting; BD has 4 scenarios',()=>{
 const env=app({storage:saved(true,false)},'linha-de-frente/index.html'),doc=env.document;
 assert.equal(env.window.NEXUS.content.lfSteps.length,8);doc.querySelector('[data-lf-start]').click();
 for(let i=0;i<5;i++)doc.querySelector('[data-lf-next]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/WhatsApp/);assert.equal(doc.querySelector('[data-lf-variant]').hidden,false);
 doc.querySelector('[data-lf-variant]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/Sem insistência/);doc.querySelector('[data-lf-next]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/Reunião agendada/);assert.equal(doc.querySelector('[data-lf-next]').hidden,true);
 doc.querySelector('[data-lf-reset]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/Perfil/);
 const bd=app({},'balcao-digital/index.html');for(let i=0;i<4;i++){bd.document.querySelector(`[data-chat-choice="${i}"]`).click();bd.advanceTime(450);assert.ok(bd.document.querySelector('[data-chat-log]').textContent.length>150);}
 assert.match(bd.document.querySelector('[data-chat-log]').textContent,/Não tenho essa informação/);
});
test('Home short demos and independent selection work',()=>{
 const env=app({width:360}),doc=env.document;doc.querySelector('[data-lf-start]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/1 \/ 4/);doc.querySelector('[data-demo-tab="bd"]').click();assert.equal(doc.querySelector('[data-demo-panel="lf"]').hidden,true);assert.equal(doc.querySelector('[data-demo-panel="bd"]').hidden,false);doc.querySelector('[data-chat-choice="2"]').click();env.advanceTime(450);assert.equal(doc.querySelector('[data-chat-log]').querySelectorAll('.nx-chat-bubble').length,4);
});
test('Engine on all pages at 8 widths: finite coordinates, scroll, reverse, idle and mobile buffer',()=>{
 for(const file of pages)for(const width of [320,360,390,430,768,1024,1440,1920]){
  const env=app({width},file,true);env.flush(70);const debug=env.window.NEXUS_DEBUG;assert.ok(debug,`${file} ${width}`);
  for(const sc of debug.scenes){env.scrollTo(sc.a+(sc.b-sc.a)*.55);assert.ok([...debug.X,...debug.Y].every(Number.isFinite));}
  env.scrollTo(0);env.flush(150);assert.equal(debug.idle,true);
  if(width<900){assert.equal(debug.buffered,true);assert.equal(env.visibleClears,0);assert.ok(debug.presents>0);const old=debug.scenes.map(s=>s.a);env.height-=80;env.event('resize');env.flush(2);assert.deepEqual(debug.scenes.map(s=>s.a),old,'Mobile address bar must not remap geometry');}
 }
});
test('Engine tolerates unknown scenes, no scenes, missing canvas and reduced motion',()=>{
 for(const html of ['<html><head></head><body><canvas id="narrative-canvas"></canvas></body></html>',...['unknown','__proto__','constructor'].map(id=>markup('privacidade/index.html').replace('data-formation="about"','data-formation="'+id+'"'))]){const env=environment(html);env.run(source('interactions'));env.flush(80);}
 for(const options of [{reduced:true},{noCanvas:true}]){const env=app(options,'index.html',true);env.flush(5);assert.equal(env.window.NEXUS_DEBUG,undefined);env.document.querySelector('.nx-menu-btn').click();assert.equal(env.document.querySelector('#conteudo').inert,true);env.event('keydown',{key:'Escape'});assert.equal(env.document.querySelector('#conteudo').inert,false);assert.equal(env.document.querySelector('.nx-menu-btn').getAttribute('aria-expanded'),'false');}
});
test('All historical formations run independently; pointer, menu focus and dynamic narrative stay active',()=>{
 for(const width of [360,1440]){
  const ids=['hero','context','process','fit','difference','result','about','contact'];
  const html='<html><head></head><body><canvas id="narrative-canvas"></canvas>'+ids.map(id=>`<section data-scene="${id}" data-flow><div class="nx-scene-content"><h2 class="nx-r">Narrativa</h2></div></section>`).join('')+'</body></html>';
  const env=environment(html,{width});env.run(source('interactions'));env.flush(70);
  for(const sc of env.window.NEXUS_DEBUG.scenes){env.scrollTo(sc.a+(sc.b-sc.a)*.65);assert.ok([...env.window.NEXUS_DEBUG.X,...env.window.NEXUS_DEBUG.Y].every(Number.isFinite));}
 }
 const env=app({width:1440},'index.html',true),doc=env.document;
 env.flush(70);env.event('pointermove',{pointerType:'mouse',clientX:100,clientY:200});env.flush(30);assert.equal(env.window.NEXUS_DEBUG.ptr.on,true);
 doc.querySelector('[data-pain="atendimento"]').click();env.flush(50);assert.equal(doc.querySelector('#dores').dataset.formation,'desk');
 const button=doc.querySelector('.nx-menu-btn');button.click();assert.equal(doc.querySelector('#menu').inert,false);assert.equal(doc.activeElement,doc.querySelector('#menu a'));
 env.event('keydown',{key:'Escape'});assert.equal(doc.activeElement,button);assert.equal(doc.querySelector('#menu').inert,true);
});
test('V7: card groups use native buttons, keyboard toggles and readable controlled backs',()=>{
 const expected=[['index.html',9],['linha-de-frente/index.html',7],['balcao-digital/index.html',8]];
 for(const [file,count] of expected){const env=app({},file),doc=env.document,cards=doc.querySelectorAll('[data-flip]');assert.equal(cards.length,count);
  for(const button of cards){assert.equal(button.tagName,'BUTTON');const panel=doc.querySelector('#'+button.getAttribute('aria-controls'));assert.ok(panel.textContent.trim().length>20);if(button.getAttribute('aria-expanded')==='true')button.click();assert.equal(panel.hidden,true);
   button.focus();button.pressKey('Enter');assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(panel.hidden,false);assert.equal(doc.activeElement,button);
   button.pressKey(' ');assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(panel.hidden,true);assert.equal(doc.activeElement,button);
   button.dispatchEvent({type:'pointerenter',pointerType:'mouse',target:button});assert.equal(button.getAttribute('aria-expanded'),'false');
  }
 }
});
test('V7: reduced-motion cards have no 3D, no field pulse and immediate chat responses',()=>{
 const env=app({reduced:true},'balcao-digital/index.html',true),doc=env.document;
 const button=doc.querySelector('[data-flip]');button.focus();button.pressKey('Enter');assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(env.window.NEXUS.field.pulse(button),false);
 doc.querySelector('[data-chat-choice="3"]').click();assert.equal(doc.querySelector('[data-chat-typing]').hidden,true);assert.match(doc.querySelector('[data-chat-log]').textContent,/Não tenho essa informação/);
 const css=fs.readFileSync(path.join(root,'css/v7.css'),'utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*?perspective:none[\s\S]*?transform:none !important/);assert.match(css,/\.nx-flip-back\[hidden\][^{]*\{[^}]*display:block !important[^}]*visibility:hidden/);
});
test('V7: home shows two framed windows on desktop and tabs on mobile',()=>{
 for(const width of [360,768,1440]){const env=app({width}),doc=env.document;assert.equal(doc.querySelectorAll('.nx-window-bar').length,2);
  assert.equal(doc.querySelector('[data-demo-panel="lf"]').hidden,false);assert.equal(doc.querySelector('[data-demo-panel="bd"]').hidden,width<768);
  doc.querySelector('[data-demo-tab="bd"]').click();assert.equal(doc.querySelector('[data-demo-panel="lf"]').hidden,width<768);assert.equal(doc.querySelector('[data-demo-panel="bd"]').hidden,false);
 }
});
test('V7: LF window advances by scroll only after starting on desktop, preserving control focus',()=>{
 for(const options of [{width:1440},{width:360},{width:1440,reduced:true}]){
  const env=app(options),doc=env.document,demo=doc.querySelector('[data-demo-lf]');demo._rect={left:40,top:0,width:700,height:2500};
  env.scrollTo(100);assert.match(doc.querySelector('[data-lf-output]').textContent,/E-mail de abordagem/);
  const start=doc.querySelector('[data-lf-start]');start.focus();start.click();const next=doc.querySelector('[data-lf-next]');assert.equal(doc.activeElement,next);
  env.scrollTo(100+env.height*.36);assert.match(doc.querySelector('[data-lf-output]').textContent,options.width>=1024&&!options.reduced?/2 \/ 4/:/1 \/ 4/);
  if(options.width>=1024&&!options.reduced){env.scrollTo(100+env.height*1.1);assert.match(doc.querySelector('[data-lf-output]').textContent,/Reunião agendada/);assert.equal(doc.activeElement,doc.querySelector('[data-lf-reset]'));}
 }
});
test('Polimento 2: windows open with email and a complete conversation, without interaction events',()=>{
 for(const file of ['index.html','linha-de-frente/index.html','balcao-digital/index.html']){
  const env=app({storage:saved(true,false)},file),doc=env.document;
  const lf=doc.querySelector('[data-lf-output]');if(lf)assert.match(lf.textContent,/Assunto: Contabilidade/);
  const chat=doc.querySelector('[data-chat-log]');if(chat){assert.equal(chat.querySelectorAll('.nx-chat-bubble').length,2);assert.equal(doc.querySelector('[data-chat-choice="0"]').getAttribute('aria-pressed'),'true');assert.equal(doc.querySelector('[data-chat-typing]').hidden,true);}
  assert.equal((env.window.dataLayer||[]).filter(e=>e.event==='demo_interaction').length,0);
 }
});
test('V7: messenger typing is finite, consults fictional property data and cancels old responses',()=>{
 const env=app({},'balcao-digital/index.html'),doc=env.document,button=doc.querySelector('[data-chat-choice="0"]');button.focus();button.click();
 assert.equal(doc.querySelector('[data-chat-typing]').hidden,false);assert.equal(doc.querySelector('[data-chat-log]').getAttribute('aria-busy'),'true');
 env.advanceTime(420);assert.equal(doc.querySelector('[data-chat-typing]').hidden,true);assert.equal(doc.activeElement,button);assert.equal(doc.querySelectorAll('.nx-property-result').length,1);assert.equal(doc.querySelector('[data-chat-consultation]').querySelectorAll('li').length,4);
 doc.querySelector('[data-chat-choice="1"]').click();doc.querySelector('[data-chat-choice="3"]').click();env.advanceTime(500);
 assert.equal(doc.querySelectorAll('.nx-property-result').length,0);assert.match(doc.querySelector('[data-chat-log]').textContent,/Não tenho essa informação/);assert.match(doc.querySelector('[data-chat-consultation]').textContent,/Encaminhamento humano/);
});
test('Polimento 3: consultation lists four current values with one active state and no dummy input',()=>{
 const env=app({},'balcao-digital/index.html'),doc=env.document,list=doc.querySelector('[data-chat-consultation]');
 assert.equal(list.querySelectorAll('li').length,4);assert.equal(list.querySelectorAll('[aria-current="step"]').length,1);assert.equal(doc.querySelector('.nx-chat-disabled'),null);
 doc.querySelector('[data-chat-choice="3"]').click();assert.equal(list.querySelector('[aria-current="step"] span').textContent,'Intenção');
 env.advanceTime(420);assert.equal(list.querySelector('[aria-current="step"] span').textContent,'Próximo passo');assert.match(list.textContent,/Condição ausente na base/);
});
test('V8: UI-field bridge safely degrades and node feedback settles without connectors',()=>{
 for(const options of [{noCanvas:true},{reduced:true}]){const env=app(options,'index.html',true);const button=env.document.querySelector('[data-flip]');assert.equal(env.window.NEXUS.field.pulse(button),false);button.click();assert.equal(button.getAttribute('aria-expanded'),'true');}
 const env=app({width:1440},'index.html',true);env.flush(160);assert.equal(env.window.NEXUS_DEBUG.idle,true);
 assert.equal(env.window.NEXUS.field.pulse(null),false);assert.equal(env.window.NEXUS.field.pulse(env.document.querySelector('[data-flip]')),true);env.flush(90);assert.equal(env.window.NEXUS_DEBUG.idle,true);assert.ok([...env.window.NEXUS_DEBUG.X,...env.window.NEXUS_DEBUG.Y].every(Number.isFinite));
 const missing=environment(markup('index.html').replace(/<canvas[^>]*><\/canvas>/,''));for(const name of ['whatsapp','consent','track','content','experience','interactions'])missing.run(source(name));const card=missing.document.querySelector('[data-flip]');assert.equal(missing.window.NEXUS.field.pulse(card),false);card.pressKey('Enter');assert.equal(card.getAttribute('aria-expanded'),'true');
});
test('V8: pointer, focus, selection and component feedback add no lines or expanding rings',()=>{
 const html='<html><head></head><body><canvas id="narrative-canvas"></canvas><section data-scene="isolated" data-formation="unknown" data-flow><div class="nx-scene-content"><button id="target" class="nx-cta">Detalhes</button></div></section></body></html>';
 for(const mode of ['pointer','focus','selection','component','mouse-down','touch-down']){
  const env=environment(html,{width:mode==='touch-down'?360:1440});env.run(source('interactions'));env.flush(180);
  const debug=env.window.NEXUS_DEBUG,button=env.document.querySelector('#target');
  assert.equal(debug.idle,true);assert.equal(Object.hasOwn(debug,'ripples'),false);
  env.captureCanvas=true;env.event('load');env.flush(1);
  const baseline=env.canvasCalls.filter(call=>call.method==='lineTo').length;assert.ok(baseline>0,'Scene continuity is preserved');env.canvasCalls.length=0;
  const beforeX=Array.from(debug.X),beforeY=Array.from(debug.Y),frames=debug.frames;
  const x=debug.X[0]+20,y=debug.Y[0]+10;
  if(mode==='pointer')env.event('pointermove',{pointerType:'mouse',clientX:x,clientY:y});
  if(mode==='focus')env.document.dispatchEvent({type:'focusin',target:button});
  if(mode==='selection'){
   env.window.getSelection=()=>({isCollapsed:false,rangeCount:1,getRangeAt:()=>({getBoundingClientRect:()=>({left:x-10,top:y-10,width:20,height:20})})});
   env.document.dispatchEvent({type:'selectionchange'});
  }
  if(mode==='component')assert.equal(env.window.NEXUS.field.pulse(button),true);
  if(mode.endsWith('-down'))env.event('pointerdown',{pointerType:mode==='touch-down'?'touch':'mouse',clientX:x,clientY:y,target:button});
  env.flush(5);
  assert.equal(env.canvasCalls.filter(call=>call.method==='lineTo').length,baseline*(debug.frames-frames),mode+': no extra connector/trail');
  assert.equal(env.canvasCalls.filter(call=>['arc','ellipse','createRadialGradient'].includes(call.method)).length,0,mode+': no click ring or radial wave');
  if(mode.endsWith('-down')){assert.deepEqual(Array.from(debug.X),beforeX);assert.deepEqual(Array.from(debug.Y),beforeY);}
  else{assert.notDeepEqual(Array.from(debug.X),beforeX,mode+': nodes still react');}
  if(mode==='pointer'||mode==='focus'||mode==='component')assert.ok(Array.from(debug.PROX).some(value=>value>0),'Lens and local glow remain active');
  if(mode==='focus')env.document.dispatchEvent({type:'focusout'});
  env.flush(180);assert.equal(debug.idle,true,mode+': returns to idle');
 }
 assert.doesNotMatch(source('interactions'),/\bripples\b|\blinkSource\b|\bdrawInteraction\b|\bcomponentSignal\b|\bnearSources\b/);
});
