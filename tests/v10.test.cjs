const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {environment}=require('./dom.cjs');
const {files,withoutComments}=require('./source-audit.cjs');
const root=path.resolve(__dirname,'../dist');
const pages=['index.html','linha-de-frente/index.html','balcao-digital/index.html','privacidade/index.html'];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const parse=block=>Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
const css=read('css/variables.css');
const declarations=parse(css.match(/:root\s*\{([\s\S]*?)\n\}/)[1]);
const lightDeclarations={...declarations,...parse(css.match(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/)[1])};
function resolve(value,vars=declarations,depth=0){if(depth>12)throw Error('Token cycle');return value.replace(/var\((--[\w-]+)\)/g,(_,name)=>resolve(vars[name]||'',vars,depth+1));}
const resolved=vars=>Object.fromEntries(Object.entries(vars).map(([name,value])=>[name,resolve(value,vars)]));
const darkVariables=resolved(declarations),lightVariables=resolved(lightDeclarations);
function setup(options={},page='index.html',engine=false){
 const env=environment(read(page),{themeVariables:{dark:darkVariables,light:lightVariables},...options});
 env.run(env.document.querySelector('#nx-theme-init').textContent);
 for(const name of ['theme','whatsapp','consent','track','content','experience',...(engine?['interactions']:[])])env.run(read('js/'+name+'.js'));
 return env;
}

test('V10: all component CSS colors depend on tokens; literal colors live only in variables.css',()=>{
 for(const file of files(path.join(root,'css')).filter(file=>!file.endsWith('variables.css'))){
  const css=withoutComments(fs.readFileSync(file,'utf8'),'.css').replace(/url\(["']?data:image\/svg\+xml[^)]*\)/g,'');
  assert.doesNotMatch(css,/#[\da-f]{3,8}\b/i,path.basename(file));
  assert.doesNotMatch(css,/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*[-+.\d]/i,path.basename(file));
  assert.doesNotMatch(css,/(?<![-\w])(?:white|black|transparent)(?![-\w])/i,path.basename(file));
 }
 for(const [name,rgb] of [['void','2,4,10'],['text','248,250,252'],['cyan','32,214,231'],['blue','47,123,255'],['violet','139,92,246']])assert.equal(darkVariables['--nx-'+name+'-rgb'],rgb);
 assert.equal(darkVariables['--nx-theme-color'],'#02040A');
 assert.match(css,/prefers-color-scheme:light/);assert.match(css,/:root:not\(\[data-theme\]\)/);assert.doesNotMatch(css,/V10: aguardando paleta/);
 for(const [name,value] of Object.entries({void:'#F3F6FB',text:'#0B1220',muted:'#3C4A63',surface:'#FFFFFF','surface-2':'#E6EDF7','lf-text':'#00677A','bd-text':'#5B34C9'}))assert.equal(lightVariables['--nx-'+name],value);
});

test('V10: head restores only valid theme preferences before CSS; absent/blocked storage follows system',()=>{
 for(const page of pages){
  const html=read(page);
  assert.ok(html.indexOf('id="nx-theme-init"')<html.indexOf('rel="stylesheet"'));
  for(const themeStorage of ['light','dark',null,'system','invalid']){
   const env=environment(html,{themeStorage});env.run(env.document.querySelector('#nx-theme-init').textContent);
   assert.equal(env.document.documentElement.getAttribute('data-theme'),['light','dark'].includes(themeStorage)?themeStorage:null);
  }
  const env=environment(html,{themeStorage:'light',storageReadError:true});env.run(env.document.querySelector('#nx-theme-init').textContent);assert.equal(env.document.documentElement.getAttribute('data-theme'),null);
  const doc=env.document;assert.equal(doc.querySelector('meta[name="color-scheme"]').getAttribute('content'),'dark light');
  assert.equal(doc.querySelectorAll('meta[name="theme-color"][media]').length,2);
 }
});

test('V10: keyboard toggle persists light/dark and footer reset follows the system without reload',()=>{
 for(const page of pages){
  const env=setup({},page),doc=env.document,button=doc.querySelector('[data-theme-toggle]');
  assert.equal(doc.querySelectorAll('[data-theme-toggle]').length,1);assert.equal(env.window.NEXUS.theme.get().preference,'system');
  assert.equal(button.closest('.nx-header-actions').querySelectorAll('a,button')[0],button,'Toggle precedes WhatsApp in the header');
  assert.equal(button.id,'nx-theme-toggle');assert.equal(button.querySelectorAll('[data-theme-icon]').length,2);
  assert.equal(doc.querySelector('[data-theme-status]').textContent,'');button.focus();
  for(const preference of ['light','dark']){
   button.pressKey('Enter');assert.equal(env.window.NEXUS.theme.get().preference,preference);
   assert.equal(doc.documentElement.getAttribute('data-theme'),preference==='system'?null:preference);
   assert.equal(env.storageEntries.get('nx-theme'),preference);
   assert.equal(doc.activeElement,button);const label='Ativar tema '+(preference==='light'?'escuro':'claro');assert.equal(button.getAttribute('aria-label'),label);assert.equal(button.getAttribute('title'),label);
   assert.ok(doc.querySelector('[data-theme-status]').textContent.endsWith('ativado.'));
   assert.equal(button.querySelectorAll('[data-theme-icon]').filter(icon=>!icon.hidden).length,1);
  }
  const reset=doc.querySelector('[data-theme-system]');reset.focus();reset.pressKey('Enter');
  assert.equal(env.storageEntries.has('nx-theme'),false);assert.equal(env.storageEntries.has('nexus-theme'),false);assert.equal(doc.documentElement.hasAttribute('data-theme'),false);assert.equal(doc.activeElement,button);
  assert.equal(env.window.NEXUS.theme.get().preference,'system');assert.equal(reset.hidden,true);
  assert.equal(env.reloads,0);assert.equal(env.window.dataLayer,undefined);assert.equal(env.window.fbq,undefined);
 }
});

test('V10: system changes, cross-tab changes and denied storage keep theme usable without reload',()=>{
 for(const light of [true,false]){
  const auto=setup({light});assert.equal(auto.window.NEXUS.theme.get().effective,light?'light':'dark');assert.equal(auto.document.documentElement.getAttribute('data-theme'),null);
  const explicit=setup({light,themeStorage:light?'dark':'light'});assert.equal(explicit.window.NEXUS.theme.get().effective,light?'dark':'light');
 }
 const env=setup(),api=env.window.NEXUS.theme,root=env.document.documentElement;
 env.setMedia('(prefers-color-scheme: light)',true);assert.equal(api.get().effective,'light');assert.equal(root.getAttribute('data-theme'),null);
 api.set('dark');env.setMedia('(prefers-color-scheme: light)',false);env.setMedia('(prefers-color-scheme: light)',true);assert.equal(api.get().effective,'dark');
 env.event('storage',{key:'nx-theme',newValue:'light'});assert.equal(api.get().preference,'light');
 env.event('storage',{key:'nx-theme',newValue:null});assert.equal(api.get().preference,'system');assert.equal(root.getAttribute('data-theme'),null);
 assert.equal(api.set('invalid'),false);assert.equal(env.reloads,0);
 for(const options of [{storageReadError:true},{storageWriteError:true},{storageRemoveError:true},{reduced:true},{noCanvas:true}]){
  const blocked=setup(options);for(const mode of ['light','dark','system'])assert.equal(blocked.window.NEXUS.theme.set(mode),true);assert.equal(blocked.reloads,0);
 }
});

test('V10.2: legacy preferences migrate and metadata follows explicit and automatic appearance',()=>{
 const legacy=setup({legacyThemeStorage:'light'}),doc=legacy.document;
 assert.equal(legacy.storageEntries.get('nx-theme'),'light');assert.equal(legacy.storageEntries.has('nexus-theme'),false);
 assert.equal(doc.querySelectorAll('meta[name="theme-color"]').length,1);assert.equal(doc.querySelector('meta[name="theme-color"]').getAttribute('content'),'#F3F6FB');
 legacy.window.NEXUS.theme.set('system');assert.equal(doc.querySelectorAll('meta[name="theme-color"][media]').length,2);
 assert.equal(doc.querySelector('meta[name="color-scheme"]').getAttribute('content'),'dark light');
 legacy.setMedia('(prefers-color-scheme: light)',true);assert.equal(legacy.window.NEXUS.theme.get().effective,'light');assert.equal(doc.documentElement.hasAttribute('data-theme'),false);
 legacy.window.NEXUS.theme.set('dark');assert.equal(doc.querySelector('meta[name="theme-color"]').getAttribute('content'),'#02040A');
});

test('V10: Canvas caches CSS colors between frames and rebuilds on theme or system changes',()=>{
 for(const width of [360,1440]){
  const env=setup({width},'index.html',true),debug=env.window.NEXUS_DEBUG;env.flush(160);
  assert.equal(JSON.stringify(debug.palette.tones),JSON.stringify([[32,214,231],[47,123,255],[139,92,246]]));
  const reads=env.styleReads,version=debug.palette.version,canvasWidth=env.document.querySelector('canvas').width;
  env.flush(50);assert.equal(env.styleReads,reads,'No root style read in animation frames');
  env.cssVariables['--nx-canvas-node']='1,2,3';env.cssVariables['--nx-canvas-link']='4,5,6';env.cssVariables['--nx-canvas-accent']='7,8,9';
  env.captureCanvas=true;env.window.NEXUS.theme.set('light');env.flush(160);
  assert.equal(debug.palette.version,version+1);assert.equal(debug.palette.tones[0].join(','),'1,2,3');assert.ok(env.canvasPaints.some(p=>p.value==='rgb(1,2,3)'));
  assert.equal(env.document.querySelector('canvas').width,canvasWidth);assert.equal(debug.idle,true);assert.equal(env.reloads,0);
  const changed=debug.palette.version;env.cssVariables['--nx-canvas-node']='10,11,12';env.setMedia('(prefers-color-scheme: light)',true);env.flush(160);assert.equal(debug.palette.version,changed+1);
  const finalReads=env.styleReads;env.flush(50);assert.equal(env.styleReads,finalReads);assert.ok([...debug.X,...debug.Y].every(Number.isFinite));
 }
});

test('V10.2: light Canvas applies deep tones and reduced alpha on all pages without changing geometry',()=>{
 for(const page of pages)for(const width of [360,1440]){
  const env=setup({width},page,true);env.flush(160);const debug=env.window.NEXUS_DEBUG;
  const scenes=debug.scenes.map(s=>[s.a,s.b]),nodes=debug.nodes;
  assert.equal(debug.palette.alpha['sprite-core'],.55);assert.equal(debug.palette.alpha.edge,1);
  env.captureCanvas=true;const version=debug.palette.version;env.window.NEXUS.theme.set('light');env.flush(160);
  assert.equal(JSON.stringify(debug.palette.tones),JSON.stringify([[14,116,144],[37,99,235],[109,64,224]]));
  assert.equal(debug.palette.alpha['sprite-core'],.3);assert.equal(debug.palette.alpha['sprite-outer'],.1);assert.equal(debug.palette.alpha.edge,.7);
  assert.equal(debug.palette.version,version+1);assert.ok(env.canvasPaints.some(p=>p.property==='colorStop'&&p.value==='rgba(14,116,144,0.3)'));
  assert.deepEqual(debug.scenes.map(s=>[s.a,s.b]),scenes);assert.equal(debug.nodes,nodes);assert.equal(debug.idle,true);assert.equal(env.reloads,0);
  env.window.NEXUS.theme.set('dark');env.flush(160);assert.equal(debug.palette.alpha['sprite-core'],.55);assert.equal(debug.palette.tones[0].join(','),'32,214,231');
 }
});

test('V10.2: only deliberate theme actions emit theme_toggle after the appropriate consent',()=>{
 const env=setup(),doc=env.document,button=doc.querySelector('[data-theme-toggle]');
 button.click();assert.equal(env.window.dataLayer,undefined);assert.equal(env.window.fbq,undefined);
 doc.querySelector('[data-consent="configure"]').click();doc.querySelector('#consent-measurement').checked=true;doc.querySelector('[data-consent="save"]').click();
 button.click();const layer=env.window.dataLayer,events=()=>layer.filter(e=>e.event==='theme_toggle');
 assert.equal(events().length,1);assert.equal(events()[0].action,'dark');assert.equal(events()[0].origin,'header');assert.equal(env.window.fbq,undefined);
 doc.querySelector('[data-theme-system]').click();assert.equal(events().length,2);assert.equal(events()[1].action,'system');
 env.setMedia('(prefers-color-scheme: light)',true);assert.equal(events().length,2,'OS changes are not interactions');
 doc.querySelector('[data-consent="accept"]').click();button.click();assert.ok(env.window.fbq.queue.some(args=>args[0]==='trackCustom'&&args[1]==='theme_toggle'));
});
