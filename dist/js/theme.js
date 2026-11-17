/* Theme preference is independent of consent. The light palette is staged in variables.css. */
(() => {
  'use strict';
  const KEY='nexus-theme';
  const root=document.documentElement;
  const system=matchMedia('(prefers-color-scheme: light)');
  const modes=['system','light','dark'];
  const names={system:'seguir o sistema',light:'claro',dark:'escuro'};
  const captions={system:'Seguir o sistema',light:'Claro',dark:'Escuro'};
  let preference=['light','dark'].includes(root.getAttribute('data-theme'))?root.getAttribute('data-theme'):'system';
  const controls=Array.from(document.querySelectorAll('[data-theme-toggle]'));
  const status=Array.from(document.querySelectorAll('[data-theme-status]'));
  const get=()=>({preference,effective:preference==='system'?(system.matches?'light':'dark'):preference});
  function render(announce){
    if(preference==='system')root.removeAttribute('data-theme');else root.setAttribute('data-theme',preference);
    const state=get(),next=modes[(modes.indexOf(preference)+1)%modes.length];
    controls.forEach(button=>{
      button.querySelector('[data-theme-label]').textContent=captions[preference];
      button.setAttribute('aria-label','Tema atual: '+names[preference]+(preference==='system'?' ('+names[state.effective]+')':'')+'. Próxima opção: '+names[next]+'.');
      button.querySelectorAll('[data-theme-icon]').forEach(icon=>{icon.hidden=icon.dataset.themeIcon!==preference;});
    });
    const color=getComputedStyle(root).getPropertyValue('--nx-theme-color').trim();
    if(color)document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.setAttribute('content',color));
    if(announce)status.forEach(el=>{el.textContent='Tema: '+names[preference]+(preference==='system'?', '+names[state.effective]:'')+'.';});
    window.dispatchEvent(new CustomEvent('nx:theme',{detail:state}));
  }
  function set(value,persist=true,announce=true){
    if(!modes.includes(value))return false;
    preference=value;
    if(persist)try{if(value==='system')localStorage.removeItem(KEY);else localStorage.setItem(KEY,value);}catch(_){/* The current page remains usable without storage. */}
    render(announce);return true;
  }
  function cycle(){return set(modes[(modes.indexOf(preference)+1)%modes.length]);}
  controls.forEach(button=>button.addEventListener('click',cycle));
  system.addEventListener('change',()=>{if(preference==='system')render(true);});
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null)set(['light','dark'].includes(event.newValue)?event.newValue:'system',false,true);});
  window.NEXUS=window.NEXUS||{};
  window.NEXUS.theme=Object.freeze({get,set:value=>set(value),cycle});
  render(false);
})();
