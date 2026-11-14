const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {environment}=require('./dom.cjs');
const root=path.resolve(__dirname,'../dist');
const source=name=>fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
const pages=['index.html','linha-de-frente/index.html','balcao-digital/index.html','privacidade/index.html'];
const markup=file=>fs.readFileSync(path.join(root,file),'utf8');
function app(options={},file='index.html',engine=false){const env=environment(markup(file),options);env.window.location.pathname=file==='index.html'?'/':'/'+file.replace('index.html','');for(const script of ['whatsapp','consent','track','content','experience',...(engine?['interactions']:[])])env.run(source(script));return env;}
const saved=(measurement,marketing)=>JSON.stringify({version:1,measurement,marketing,updatedAt:'2026-11-14T00:00:00.000Z'});
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
 assert.ok(markup('privacidade/index.html').includes('<!-- PRIVACIDADE:CONTEUDO -->'));
});
test('Commercial links work without JS and use exact per-origin message',()=>{
 const env=app();
 for(const file of pages)for(const el of environment(markup(file)).document.querySelectorAll('[data-contact="whatsapp"]')){
  assert.equal(el.getAttribute('href'),env.window.NEXUS.whatsapp.url(el.dataset.ctaOrigin));assert.equal(el.getAttribute('target'),'_blank');assert.match(el.getAttribute('rel'),/noopener/);assert.match(el.getAttribute('aria-label'),/nova aba/);
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
 const env=app({storage:saved(true,true)});env.event('storage',{key:'nexus.consent.v1',newValue:saved(false,false)});assert.equal(env.window.NEXUS.consent.get().marketing,false);const before=env.window.fbq.queue.length;env.window.NEXUS.track('whatsapp_exit',{origin:'hero'});assert.equal(env.window.fbq.queue.length,before);assert.equal(env.reloads,1);
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
 for(const id of ['oportunidades','atendimento','retorno','informacao']){doc.querySelector(`[data-pain="${id}"]`).click();assert.equal(doc.querySelectorAll('[data-pain-panel]').filter(x=>!x.hidden).length,1);assert.equal(doc.querySelector(`[data-pain-panel="${id}"]`).hidden,false);assert.equal(doc.querySelector(`[data-pain="${id}"]`).getAttribute('aria-pressed'),'true');assert.ok(doc.querySelector('[data-pain-status]').textContent);}
 assert.equal(env.window.dataLayer.filter(e=>e.event==='pain_select').length,4);
});
test('LF has 8 editorial steps, optional follow-up branch and meeting; BD has 4 scenarios',()=>{
 const env=app({storage:saved(true,false)},'linha-de-frente/index.html'),doc=env.document;
 assert.equal(env.window.NEXUS.content.lfSteps.length,8);doc.querySelector('[data-lf-start]').click();
 for(let i=0;i<5;i++)doc.querySelector('[data-lf-next]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/WhatsApp/);assert.equal(doc.querySelector('[data-lf-variant]').hidden,false);
 doc.querySelector('[data-lf-variant]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/Sem insistência/);doc.querySelector('[data-lf-next]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/Reunião agendada/);assert.equal(doc.querySelector('[data-lf-next]').hidden,true);
 doc.querySelector('[data-lf-reset]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/Perfil/);
 const bd=app({},'balcao-digital/index.html');for(let i=0;i<4;i++){bd.document.querySelector(`[data-chat-choice="${i}"]`).click();assert.ok(bd.document.querySelector('[data-chat-log]').textContent.length>150);}
 assert.match(bd.document.querySelector('[data-chat-log]').textContent,/Não tenho essa informação/);
});
test('Home short demos and independent selection work',()=>{
 const env=app(),doc=env.document;doc.querySelector('[data-lf-start]').click();assert.match(doc.querySelector('[data-lf-output]').textContent,/1 \/ 3/);doc.querySelector('[data-demo-tab="bd"]').click();assert.equal(doc.querySelector('[data-demo-panel="lf"]').hidden,true);assert.equal(doc.querySelector('[data-demo-panel="bd"]').hidden,false);doc.querySelector('[data-chat-choice="2"]').click();assert.equal(doc.querySelector('[data-chat-log]').querySelectorAll('.nx-chat-bubble').length,4);
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
