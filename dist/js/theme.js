/* Manual appearance persists; absent preference always follows the operating system. */
(() => {
  'use strict';
  const KEY='nx-theme', LEGACY_KEY='nexus-theme';
  const root=document.documentElement;
  const system=matchMedia('(prefers-color-scheme: light)');
  const modes=['system','light','dark'];
  const names={system:'seguir o sistema',light:'claro',dark:'escuro'};
  let preference=['light','dark'].includes(root.getAttribute('data-theme'))?root.getAttribute('data-theme'):'system';
  const controls=Array.from(document.querySelectorAll('[data-theme-toggle]'));
  const resets=Array.from(document.querySelectorAll('[data-theme-system]'));
  const status=Array.from(document.querySelectorAll('[data-theme-status]'));
  const get=()=>({preference,effective:preference==='system'?(system.matches?'light':'dark'):preference});
  function metadata(style,state){
    const scheme=document.querySelector('meta[name="color-scheme"]');
    if(scheme)scheme.setAttribute('content',preference==='system'?'dark light':state.effective);
    const metas=Array.from(document.querySelectorAll('meta[name="theme-color"]'));
    if(preference==='system'){
      for(const mode of ['dark','light']){
        let meta=metas.find(el=>(el.getAttribute('media')||'').includes(mode));
        if(!meta){meta=document.createElement('meta');meta.setAttribute('name','theme-color');document.head.appendChild(meta);}
        meta.setAttribute('media','(prefers-color-scheme: '+mode+')');
        const color=style.getPropertyValue('--nx-theme-color-'+mode).trim();if(color)meta.setAttribute('content',color);
      }
      metas.filter(el=>!el.hasAttribute('media')).forEach(el=>el.remove());
    }else{
      const meta=metas[0]||document.createElement('meta');meta.setAttribute('name','theme-color');
      if(!meta.isConnected)document.head.appendChild(meta);
      meta.removeAttribute('media');
      const color=style.getPropertyValue('--nx-theme-color').trim();if(color)meta.setAttribute('content',color);
      metas.slice(1).forEach(el=>el.remove());
    }
  }
  function render(announce){
    if(preference==='system')root.removeAttribute('data-theme');else root.setAttribute('data-theme',preference);
    const state=get(),next=state.effective==='dark'?'light':'dark';
    controls.forEach(button=>{
      const label='Ativar tema '+names[next],caption=button.querySelector('[data-theme-label]');
      if(caption)caption.textContent=label;
      button.setAttribute('aria-label',label);button.setAttribute('title',label);
      button.querySelectorAll('[data-theme-icon]').forEach(icon=>{icon.hidden=icon.dataset.themeIcon!==next;});
    });
    resets.forEach(button=>{button.hidden=preference==='system';});
    metadata(getComputedStyle(root),state);
    if(announce)status.forEach(el=>{el.textContent=preference==='system'?'Seguindo o tema do sistema: '+names[state.effective]+'.':'Tema '+names[state.effective]+' ativado.';});
    window.dispatchEvent(new CustomEvent('nx:themechange',{detail:state}));
  }
  function set(value,persist=true,announce=true){
    if(!modes.includes(value))return false;
    const restoreFocus=value==='system'&&resets.includes(document.activeElement);
    preference=value;
    if(persist)try{
      if(value==='system'){localStorage.removeItem(KEY);localStorage.removeItem(LEGACY_KEY);}
      else{localStorage.setItem(KEY,value);localStorage.removeItem(LEGACY_KEY);}
    }catch(_){/* A blocked store does not prevent changing the current page. */}
    render(announce);if(restoreFocus&&controls[0])controls[0].focus({preventScroll:true});return true;
  }
  function cycle(){return set(get().effective==='dark'?'light':'dark');}
  function measure(action,origin){if(window.NEXUS.track)window.NEXUS.track('theme_toggle',{action,origin});}
  controls.forEach(button=>button.addEventListener('click',()=>{cycle();measure(preference,'header');}));
  resets.forEach(button=>button.addEventListener('click',()=>{set('system');measure('system','footer');}));
  system.addEventListener('change',()=>{if(preference==='system')render(true);});
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null)set(['light','dark'].includes(event.newValue)?event.newValue:'system',false,true);});
  window.NEXUS=window.NEXUS||{};
  window.NEXUS.theme=Object.freeze({get,set:value=>set(value),cycle});
  render(false);
})();
