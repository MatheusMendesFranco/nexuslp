// Local rendered QA using an isolated Chrome profile and the native DevTools protocol.
// No packages, user browser state or non-local URLs. Screenshots are optional artifacts.
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {createServer}=require('./serve.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
 const chrome=process.env.NEXUS_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
 await fs.access(chrome);
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'nexus-v8-'));
 const output=path.resolve(process.argv[2]||path.join(os.tmpdir(),'nexus-v8-shots'));
 await fs.mkdir(output,{recursive:true});
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const child=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let launchError,chromeLog='';child.on('error',error=>launchError=error);child.stderr.on('data',chunk=>chromeLog=(chromeLog+chunk).slice(-4000));
 let ws;
 try {
  let port;
  for(let i=0;i<100;i++){if(launchError)throw launchError;try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{}await wait(100);}
  assert.ok(port,'Chrome did not expose DevTools');
  const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('DevTools connection timeout')),10000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=reject;});
  let id=0;const pending=new Map(),errors=[],requests=[];
  ws.onmessage=message=>{const m=JSON.parse(message.data);if(m.id){const call=pending.get(m.id);pending.delete(m.id);if(call){m.error?call.reject(Error(JSON.stringify(m.error))):call.resolve(m.result);}}
   else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''));
   else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));
   else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);
   else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)errors.push('HTTP '+m.params.response.status+' '+m.params.response.url);
  };
  ws.onclose=()=>{for(const entry of pending.values())entry.reject(Error('Chrome connection closed: '+chromeLog));pending.clear();};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(Error(method+' timeout: '+chromeLog));},10000);pending.set(key,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  for(const method of ['Page.enable','Runtime.enable','Network.enable'])await call(method);
  const overflow=()=>evaluate(`(() => {const w=document.documentElement.clientWidth;return {width:w,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.position!=='fixed' && s.visibility!=='hidden' && r.width && (r.right>w+1 || r.left < -1)}).slice(0,12).map(e=>({tag:e.tagName,class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}})()`);
  const checkOverflow=async label=>{const sizes=await overflow();assert.ok(sizes.scroll<=sizes.width, label+' overflow: '+JSON.stringify(sizes));};
  const screenshot=async name=>{const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(shot.data,'base64'));};
  const reports=[];
  for(const mode of ['dark','light'])for(const width of [360,390,768,1024,1440])for(const route of ['/','/linha-de-frente/','/balcao-digital/','/privacidade/']){
   console.log('Checking '+mode+' '+width+' '+route);
   const label=mode+' '+width+' '+route;errors.length=0;requests.length=0;
   await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'},{name:'prefers-color-scheme',value:mode}]});
   await call('Storage.clearDataForOrigin',{origin:base,storageTypes:'local_storage,cookies'});
   await call('Page.navigate',{url:base+route});
   for(let i=0;i<80;i++){if(await evaluate("document.readyState==='complete' && !!window.NEXUS?.field"))break;await wait(50);}
   await evaluate('document.fonts.ready');await wait(150);
   assert.equal(await evaluate('window.NEXUS.theme.get().effective'),mode,label+' system theme');
   assert.equal(await evaluate('document.documentElement.hasAttribute("data-theme")'),false,label+' implicit system');
   const targets=await evaluate(`(() => {const w=document.documentElement.clientWidth;return [...document.querySelectorAll('.nx-header a,.nx-header button')].filter(el=>getComputedStyle(el).display!=='none').map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height,limit:w}})})()`);
   assert.ok(targets.every(r=>r.left>=-1&&r.right<=r.limit+1),label+' header fits '+JSON.stringify(targets));
   const toggleSize=await evaluate("document.querySelector('[data-theme-toggle]').getBoundingClientRect().height");assert.ok(toggleSize>=(width<=860?44:40),label+' theme target');
   await evaluate("window.__v10qa='alive';document.querySelector('[data-theme-toggle]').click()");await wait(210);
   assert.equal(await evaluate('window.NEXUS.theme.get().effective'),mode==='dark'?'light':'dark');
   assert.equal(await evaluate("localStorage.getItem('nx-theme')"),mode==='dark'?'light':'dark');
   await evaluate("document.querySelector('[data-theme-system]').focus();document.querySelector('[data-theme-system]').click()");await wait(210);
   assert.equal(await evaluate("window.__v10qa"),'alive',label+' no reload');
   assert.ok(await evaluate("document.activeElement.matches('[data-theme-toggle]') && !document.documentElement.hasAttribute('data-theme') && localStorage.getItem('nx-theme')===null"));
   await checkOverflow(label+' banner');
   const noPixel=await evaluate("!document.querySelector('#nexus-meta-pixel') && typeof window.fbq==='undefined'");assert.ok(noPixel,label+' early pixel');
   assert.ok(!requests.some(url=>/facebook|fbevents/.test(url)),label+' marketing network request');
   const bannerVisible=await evaluate("!document.querySelector('.nx-cookie-banner').hidden");
   if(bannerVisible){await evaluate("document.querySelector('[data-consent=reject]').click()");await wait(3600);}
   await checkOverflow(label+' accepted layout');
   if(width===360||width===1440)await screenshot(mode+'-'+(route==='/'?'home':route.split('/')[1])+'-'+width+'-hero');
   const ids=await evaluate("[...document.querySelectorAll('main section[id]')].map(e=>e.id)");
   for(const section of ids){
    await evaluate(`document.getElementById(${JSON.stringify(section)}).scrollIntoView({block:'start',behavior:'instant'})`);await wait(90);
    await checkOverflow(label+' #'+section);
    if((width===360||width===1440)&&['solucao-lf','solucao-bd','metodo','persona','lf-pesquisa','lf-percurso','lf-acompanhamento','duvidas'].includes(section))await screenshot(mode+'-'+(route==='/'?'home':route.split('/')[1])+'-'+width+'-'+section);
   }
   // Native keyboard activation, open every retained flip, and exercise its content size.
   const count=await evaluate("document.querySelectorAll('[data-flip]').length");
   for(let i=0;i<count;i++){
    await evaluate(`(() => {const b=document.querySelectorAll('[data-flip]')[${i}];if(b.getAttribute('aria-expanded')==='true')b.click();b.scrollIntoView({block:'center',behavior:'instant'});b.focus()})()`);
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await wait(400);assert.ok(await evaluate(`document.querySelectorAll('[data-flip]')[${i}].getAttribute('aria-expanded')==='true'`),label+' keyboard flip '+i);
    await checkOverflow(label+' flip '+i);
    if(mode==='light')assert.equal(await evaluate(`(() => {const b=document.querySelectorAll('[data-flip]')[${i}];return getComputedStyle(document.getElementById(b.getAttribute('aria-controls'))).backgroundColor})()`),'rgb(255, 255, 255)',label+' light back '+i);
   }
   // Preference opener returns focus to the precise button after closing.
   assert.ok(await evaluate(`(() => {const b=document.querySelector('[data-cookie-preferences]');b.focus();b.click();const d=document.querySelector('dialog');if(!d.contains(document.activeElement))return false;d.querySelector('[data-consent=close]').click();return true})()`));
   await wait(40);assert.ok(await evaluate("document.activeElement.matches('[data-cookie-preferences]')"));
   const lf=await evaluate("!!document.querySelector('[data-lf-start]')");
   if(lf){
    await evaluate("document.querySelector('[data-lf-start]').focus();document.querySelector('[data-lf-start]').click()");assert.ok(await evaluate("document.activeElement.matches('[data-lf-next]')"));
    await evaluate("for(let i=0;i<10&&!document.querySelector('[data-lf-next]').hidden;i++)document.querySelector('[data-lf-next]').click()");assert.ok(await evaluate("document.activeElement.matches('[data-lf-reset]')"));
   }
   assert.deepEqual(errors,[],label+' console/network');reports.push({mode,width,route,flips:count,consoleErrors:errors.length});
  }
  // Repeat product/method interactions with the browser's reduced-motion preference.
  for(const mode of ['dark','light'])for(const route of ['/','/linha-de-frente/','/balcao-digital/']){
   await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-color-scheme',value:mode}]});
   await call('Page.navigate',{url:base+route});await wait(300);
   assert.ok(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('nx-live')"));
   await evaluate("document.querySelector('[data-flip]').click()");
   const transforms=await evaluate("[...document.querySelectorAll('.nx-flip-front,.nx-flip-back')].map(e=>getComputedStyle(e).transform)");assert.ok(transforms.every(t=>t==='none'));
  }
  const contrast=await evaluate(`(() => {const css=getComputedStyle(document.documentElement);const lum=h=>{const v=h.trim().replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722};const bg=lum(css.getPropertyValue('--nx-void'));return ['--nx-lf-text','--nx-bd-text','--nx-text','--nx-muted','--nx-dim','--nx-link'].map(token=>{const fg=lum(css.getPropertyValue(token));return {token,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)}})})()`);
  contrast.forEach(item=>assert.ok(item.ratio>=4.5,item.token+' contrast '+item.ratio));
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({reports,contrast},null,2));
  console.log(JSON.stringify({pages:reports.length,widths:[360,390,768,1024,1440],consoleErrors:0,overflow:0,reducedMotion:'PASS',contrast,output},null,2));
 }finally{
  if(ws)ws.close();child.kill();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await wait(500);
  // Delete only the isolated profile created above, never a user's browser profile.
  if(path.dirname(path.resolve(profile))!==path.resolve(os.tmpdir())||!path.basename(profile).startsWith('nexus-v8-'))throw Error('Unexpected profile path');
  await fs.rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:300});
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
