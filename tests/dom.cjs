// Minimal DOM/Canvas test fixture: exercises logic, never claims pixel/layout QA.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const decode = text => text.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
const attrName = key => 'data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
class Node {
  constructor(tag, doc, attrs={}) {
    this.tagName=tag.toUpperCase(); this.nodeType=tag==='#text'?3:1;
    this.ownerDocument=doc;this.attrs=attrs;this.childNodes=[];this.listeners={};this.parentElement=null;
    this.style={setProperty:(k,v)=>{this.style[k]=v;}};
    this.dataset=new Proxy({}, {get:(_,k)=>this.attrs[attrName(k)],set:(_,k,v)=>{this.attrs[attrName(k)]=String(v);return true;}});
    this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:(...cs)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...cs])].join(' ');},remove:c=>{this.className=this.className.split(/\s+/).filter(x=>x!==c).join(' ');},toggle:(c,on)=>{on=on===undefined?!this.classList.contains(c):on;on?this.classList.add(c):this.classList.remove(c);return on;}};
    this.checked=false; this.open=false;
  }
  get className(){return this.attrs.class||'';} set className(v){this.attrs.class=v;}
  get id(){return this.attrs.id||'';} set id(v){this.attrs.id=v;}
  get hidden(){return this.hasAttribute('hidden');} set hidden(v){v?this.setAttribute('hidden',''):this.removeAttribute('hidden');}
  get isConnected(){let n=this;while(n){if(n===this.ownerDocument)return true;n=n.parentElement;}return false;}
  get textContent(){return this.nodeType===3?this._text||'':this.childNodes.map(x=>x.textContent).join('');}
  set textContent(v){if(this.nodeType===3)this._text=String(v);else{this.childNodes=[];if(v!==undefined&&v!=='')this.append(this.ownerDocument.createTextNode(String(v)));}}
  set innerHTML(s){this.childNodes=[];parse(s,this,this.ownerDocument);}
  setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k]??null;} hasAttribute(k){return Object.hasOwn(this.attrs,k);} removeAttribute(k){delete this.attrs[k];}
  append(...children){for(const child of children){if(child.tagName==='#FRAGMENT'){this.append(...child.childNodes);continue;}child.parentElement=this;this.childNodes.push(child);}}
  appendChild(c){this.append(c);return c;}
  replaceChildren(...cs){this.childNodes=[];this.append(...cs);}
  replaceChild(next,old){const at=this.childNodes.indexOf(old);const nodes=next.tagName==='#FRAGMENT'?next.childNodes:[next];this.childNodes.splice(at,1,...nodes);nodes.forEach(n=>n.parentElement=this);}
  matches(selector){
    return selector.split(',').some(part=>{
      part=part.trim();
      const tokens=part.split(/\s+(?![^\[]*\])/);
      if(tokens.length>1){const last=tokens.pop();if(!this.matches(last))return false;let parent=this.parentElement;for(let i=tokens.length-1;i>=0;i--){while(parent&&!parent.matches(tokens[i]))parent=parent.parentElement;if(!parent)return false;parent=parent.parentElement;}return true;}
      const not=part.match(/:not\(([^)]+)\)/);if(not){if(this.matches(not[1]))return false;part=part.replace(not[0],'');}
      const tag=part.match(/^[a-z][\w-]*/i);if(tag&&this.tagName!==tag[0].toUpperCase())return false;
      for(const m of part.matchAll(/#([\w-]+)/g))if(this.id!==m[1])return false;
      for(const m of part.replace(/\[[^\]]+\]/g,'').matchAll(/\.([\w-]+)/g))if(!this.classList.contains(m[1]))return false;
      for(const m of part.matchAll(/\[([\w-]+)(?:(\^?=)["']?([^"'\]]*)["']?)?\]/g)){const val=this.getAttribute(m[1]);if(val===null)return false;if(m[2]==='='&&val!==m[3])return false;if(m[2]==='^='&&!val.startsWith(m[3]))return false;}
      return true;
    });
  }
  closest(s){let n=this;while(n){if(n.matches(s))return n;n=n.parentElement;}return null;}
  querySelectorAll(s){const found=[];for(const child of this.childNodes){if(child.nodeType===1){if(child.matches(s))found.push(child);found.push(...child.querySelectorAll(s));}}return found;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
  dispatchEvent(e){e.target ||= this;for(const fn of this.listeners[e.type]||[])fn(e);if(e.bubbles!==false&&this.parentElement)this.parentElement.dispatchEvent(e);return true;}
  click(){this.dispatchEvent({type:'click',target:this,preventDefault(){}});}
  focus(){this.ownerDocument.activeElement=this;}
  showModal(){this.open=true;this.querySelector('button')?.focus();}
  close(){this.open=false;this.dispatchEvent({type:'close',bubbles:false});}
  get clientHeight(){return this.tagName==='CANVAS'?this.ownerDocument.env.stableHeight:this._rect?.height||200;}
  get offsetHeight(){return this.clientHeight;}
  get scrollHeight(){return this.ownerDocument.height;}
  getBoundingClientRect(){const doc=this.ownerDocument, scene=this.closest('[data-scene]');const base=scene?scene._top||0:0;const r=this._rect||{left:20,top:base+80,width:Math.min(doc.env.width-40,760),height:this.hasAttribute('data-scene')?scene._height:80};const top=r.top-doc.env.scrollY;return {...r,top,bottom:top+r.height,right:r.left+r.width};}
  getContext(){return this.ownerDocument.env.noCanvas?null:this.ownerDocument.env.canvasContext(this);}
}
function parse(html,parent,doc){
  const stack=[parent];
  for(const m of html.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|[^<]+/gi)){
    const token=m[0];if(token.startsWith('<!'))continue;
    if(token.startsWith('</')){const tag=token.match(/^<\/([\w-]+)/)[1].toUpperCase();let i=stack.length-1;while(i>0&&stack[i].tagName!==tag)i--;if(i)stack.length=i;continue;}
    if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)[1];const attrs={};for(const a of token.slice(tag.length+1).matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs[a[1]]=decode(a[2]??a[3]??a[4]??'');const node=new Node(tag,doc,attrs);stack.at(-1).append(node);if(!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tag)&&!token.endsWith('/>'))stack.push(node);}
    else{const t=doc.createTextNode(decode(token));stack.at(-1).append(t);}
  }
}
function environment(html,{width=1440,height=900,reduced=false,noCanvas=false,storage=null,storageReadError=false,storageWriteError=false,storageRemoveError=false}={}){
  const env={width,height,stableHeight:height,scrollY:0,noCanvas,now:0,frames:new Map(),serial:0,draws:0,visibleClears:0,reloads:0,storageValue:storage};
  const doc=new Node('#document',null);doc.ownerDocument=doc;doc.env=env;doc.height=10000;doc.hidden=false;doc.createElement=tag=>new Node(tag,doc);doc.createTextNode=text=>{const n=new Node('#text',doc);n._text=text;return n;};doc.createDocumentFragment=()=>new Node('#fragment',doc);
  parse(html,doc,doc);doc.documentElement=doc.querySelector('html');doc.body=doc.querySelector('body');doc.head=doc.querySelector('head');doc.activeElement=doc.body;
  let top=0;doc.querySelectorAll('[data-scene]').forEach(sc=>{sc._top=top;sc._height=Math.max(height,sc.querySelectorAll('.nx-chapter').length*height*.9+height);top+=sc._height;});doc.height=Math.max(height,top+300);
  env.canvasContext=el=>new Proxy({}, {get:(obj,key)=>{
    if(key in obj)return obj[key];
    return (...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),'Canvas coordinate must be finite');if(key==='clearRect'&&el.id==='narrative-canvas')env.visibleClears++;if(key==='drawImage'&&el.id==='narrative-canvas')env.draws++;if(String(key).startsWith('create'))return {addColorStop(){}};};
  },set:(obj,k,v)=>{if(typeof v==='number')assert.ok(Number.isFinite(v));obj[k]=v;return true;}});
  const listeners={};
  const win={document:doc,location:{pathname:'/',search:'?nxdebug',hostname:'localhost',reload:()=>env.reloads++},console,Date,Math,Set,Map,WeakMap,Float32Array,Uint8Array,Uint16Array,Int16Array,
    performance:{now:()=>env.now},devicePixelRatio:2,matchMedia:query=>({matches:query.includes('reduced-motion')?reduced:query.includes('pointer:fine')?width>=900:query.includes('min-width')?width>=861:false,addEventListener(){}}),
    getComputedStyle:()=>({fontSize:'48px'}),getSelection:()=>({isCollapsed:true,rangeCount:0}),
    requestAnimationFrame:fn=>{const id=++env.serial;env.frames.set(id,fn);return id;},cancelAnimationFrame:id=>env.frames.delete(id),
    setTimeout:()=>0,clearTimeout(){},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;this.bubbles=false;}},
    ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){}},IntersectionObserver:class{constructor(fn){this.fn=fn;}observe(target){this.fn([{target,isIntersecting:true}]);}},
    localStorage:{getItem:()=>{if(storageReadError)throw Error('Storage blocked');return env.storageValue;},setItem:(_,v)=>{if(storageWriteError)throw Error('Quota');env.storageValue=v;},removeItem:()=>{if(storageRemoveError)throw Error('Blocked');env.storageValue=null;}},
    addEventListener:(type,fn)=>(listeners[type]||=[]).push(fn),dispatchEvent:e=>{for(const fn of listeners[e.type]||[])fn(e);}};
  Object.defineProperties(win,{innerWidth:{get:()=>env.width},innerHeight:{get:()=>env.height},scrollY:{get:()=>env.scrollY}});
  win.window=win;win.globalThis=win;vm.createContext(win);
  env.run=source=>vm.runInContext(source,win,{timeout:5000});env.document=doc;env.window=win;
  env.flush=(n=1)=>{for(let i=0;i<n;i++){const frames=[...env.frames.values()];env.frames.clear();env.now+=16;frames.forEach(fn=>fn(env.now));}};
  env.event=(type,props={})=>win.dispatchEvent({type,...props});
  env.scrollTo=y=>{env.scrollY=y;env.event('scroll');env.flush(100);};
  return env;
}
module.exports={environment,parse,Node};
