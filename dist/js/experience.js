(() => {
  'use strict';
  const {content, track, whatsapp} = window.NEXUS;
  function narrative(el,formation,progress) {
    const scene=el.closest('[data-scene]');
    if (scene) {
      scene.dataset.formation=formation;
      if (typeof progress==='number') scene.dataset.narrativeStep=String(progress);
      else delete scene.dataset.narrativeStep;
    }
    window.dispatchEvent(new CustomEvent('nexus:narrative'));
  }
  const make = (tag,text,cls) => {
    const el=document.createElement(tag);
    if (text) el.textContent=text;
    if (cls) el.className=cls;
    return el;
  };
  document.querySelectorAll('[data-pain]').forEach(button => button.addEventListener('click', () => {
    const id=button.dataset.pain;
    const region=button.closest('[data-scene]');
    region.querySelectorAll('[data-pain]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    region.querySelectorAll('[data-pain-panel]').forEach(el=>{el.hidden=el.dataset.painPanel!==id;});
    region.querySelector('[data-pain-empty]').hidden=true;
    region.querySelector('[data-pain-status]').textContent=button.textContent;
    narrative(button,id==='oportunidades'?'prospect':id==='atendimento'?'desk':'method',.86);
    track('pain_select',{pain:id,origin:'dor-'+id});
  }));

  document.querySelectorAll('[data-demo-tab]').forEach(button=>button.addEventListener('click',()=>{
    const scope=button.closest('[data-scene]'), demo=button.dataset.demoTab;
    scope.querySelectorAll('[data-demo-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    scope.querySelectorAll('[data-demo-panel]').forEach(el=>{el.hidden=el.dataset.demoPanel!==demo;});
    narrative(button,demo==='lf'?'prospect':'desk');
    track('demo_interaction',{demo,action:'select',origin:'home-demo'});
  }));

  document.querySelectorAll('[data-demo-lf]').forEach(demo=>{
    const short=demo.hasAttribute('data-short');
    const steps=short?content.homeLF:content.lfSteps;
    const output=demo.querySelector('[data-lf-output]');
    const start=demo.querySelector('[data-lf-start]');
    const next=demo.querySelector('[data-lf-next]');
    const variant=demo.querySelector('[data-lf-variant]');
    const reset=demo.querySelector('[data-lf-reset]');
    let index=-1;
    function show(i,action) {
      // Browsers blur a control as soon as hidden removes it from layout.
      const activeControl=document.activeElement;
      const hadControlFocus=[start,next,variant,reset].includes(activeControl);
      index=i;
      const step=steps[index];
      output.replaceChildren();
      output.append(make('p',`${index+1} / ${steps.length}`,'nx-demo-count'),make('h3',step.title,'nx-demo-title'));
      if (step.preface) output.append(make('p',step.preface,'nx-chat-bubble nx-chat-bubble--client'));
      if (step.subject) output.append(make('p','Assunto: '+step.subject,'nx-email-subject'));
      if (step.speaker) output.append(make('p',step.speaker,'nx-micro'));
      if (step.body) output.append(make('p',step.body,step.reply?'nx-chat-bubble':''));
      if (step.reply) output.append(make('p',step.reply,'nx-chat-bubble nx-chat-bubble--client'));
      if (step.chips) { const tags=make('ul',null,'nx-demo-tags');step.chips.forEach(text=>tags.append(make('li',text)));output.append(tags); }
      if (step.tag) output.append(make('p',step.tag,'nx-demo-note'));
      start.hidden=true; next.hidden=index===steps.length-1; reset.hidden=false;
      variant.hidden=short||index!==5;
      if (hadControlFocus) (next.hidden ? reset : next).focus({preventScroll:true});
      narrative(demo,'prospect',index/Math.max(1,steps.length-1));
      track('demo_interaction',{demo:'lf',step:String(index+1),action,origin:short?'home-demo':'lf-demo'});
    }
    start.addEventListener('click',()=>show(0,'start'));
    next.addEventListener('click',()=>{
      // The optional follow-up branch is not an event in the main scenario.
      const target=!short&&index===5?7:index+1;
      if(target<steps.length) show(target,'next');
    });
    variant.addEventListener('click',()=>show(6,'variant'));
    reset.addEventListener('click',()=>show(0,'restart'));
  });

  document.querySelectorAll('[data-demo-chat]').forEach(demo=>{
    const log=demo.querySelector('[data-chat-log]');
    demo.querySelectorAll('[data-chat-choice]').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.chatChoice), scenario=content.chats[index];
      if (!scenario) return;
      demo.querySelectorAll('[data-chat-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
      log.replaceChildren();
      scenario.messages.forEach(message=>{
        const bubble=make('div',null,'nx-chat-bubble'+(message.speaker==='Cliente'?' nx-chat-bubble--client':''));
        bubble.append(make('p',message.speaker,'nx-chat-speaker'),make('p',message.text));log.append(bubble);
      });
      if (scenario.tags.length) {
        const tags=make('ul',null,'nx-demo-tags');scenario.tags.forEach(text=>tags.append(make('li',text)));log.append(tags);
      }
      if (scenario.note) log.append(make('p',scenario.note,'nx-demo-note'));
      narrative(demo,'desk',index===3?1:.7);
      track('demo_interaction',{demo:'bd',step:String(index+1),action:'scenario',origin:demo.hasAttribute('data-short')?'home-demo':'bd-demo'});
    }));
  });
  // Dynamically inserted CTAs use the same helper as static navigation.
  document.querySelectorAll('[data-contact="whatsapp"]').forEach(whatsapp.prepare);
})();
