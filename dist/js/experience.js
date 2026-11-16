(() => {
  'use strict';
  const {content, track, whatsapp} = window.NEXUS;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const signal=el=>window.NEXUS.field ? window.NEXUS.field.pulse(el) : false;
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
  const flipLabels=new Map();
  function setFlip(button,open) {
    const card=button.closest('[data-flip-card]');
    const panel=document.querySelector('#'+button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded',String(open));
    panel.hidden=!open;card.classList.toggle('is-flipped',open);
    button.querySelector('[data-flip-label]').textContent=open?'Voltar à frente':flipLabels.get(button);
  }
  document.querySelectorAll('[data-flip]').forEach(button=>{
    const card=button.closest('[data-flip-card]');
    const panel=document.querySelector('#'+button.getAttribute('aria-controls'));
    if(!card||!panel)return;
    flipLabels.set(button,button.closest('[data-exclusive-flips]')?'Abrir etapa':button.querySelector('[data-flip-label]').textContent);
    button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')!=='true';
      const rail=button.closest('[data-exclusive-flips]');
      if(open&&rail)rail.querySelectorAll('[data-flip]').forEach(other=>{if(other!==button)setFlip(other,false);});
      setFlip(button,open);
      if(button.dataset.pain){
        const id=button.dataset.pain,region=button.closest('[data-scene]');
        region.querySelector('[data-pain-status]').textContent=open?panel.querySelector('h3').textContent:'Situação recolhida.';
        narrative(button,id==='oportunidades'?'prospect':id==='atendimento'?'desk':'method',open?.86:.1);
        if(open)track('pain_select',{pain:id,origin:'dor-'+id});
      }else narrative(button,button.dataset.flipKind==='prospect'?'prospect':button.dataset.flipKind==='desk'?'desk':'method',open?Number(button.dataset.fieldStage||.8):.1);
      signal(card);
    });
    if(!reduced)card.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch')return;
      const r=card.getBoundingClientRect();
      card.style.setProperty('--card-x',((event.clientX-r.left)/Math.max(1,r.width)*100).toFixed(1)+'%');
      card.style.setProperty('--card-y',((event.clientY-r.top)/Math.max(1,r.height)*100).toFixed(1)+'%');
    },{passive:true});
  });
  document.querySelectorAll('[data-rail-detail]').forEach(detail=>detail.addEventListener('toggle',()=>{
    if(!detail.open)return;
    detail.closest('.nx-detail-rail').querySelectorAll('[data-rail-detail]').forEach(other=>{if(other!==detail)other.open=false;});
    narrative(detail,'desk',Number(detail.dataset.stage));
    signal(detail);
  }));
  function revealHashCard(){
    if(!location.hash || !/^#[\w-]+$/.test(location.hash))return;
    const target=document.querySelector(location.hash),button=target&&target.querySelector('[data-flip]');
    if(button && button.getAttribute('aria-expanded')==='false')button.click();
  }
  revealHashCard();window.addEventListener('hashchange',revealHashCard);

  document.querySelectorAll('[data-demo-tab]').forEach(button=>button.addEventListener('click',()=>{
    const scope=button.closest('[data-scene]'), demo=button.dataset.demoTab;
    scope.querySelectorAll('[data-demo-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    scope.querySelectorAll('[data-demo-panel]').forEach(el=>{el.hidden=innerWidth<768&&el.dataset.demoPanel!==demo;});
    narrative(button,demo==='lf'?'prospect':'desk');
    signal(button);
    track('demo_interaction',{demo,action:'select',origin:'home-demo'});
  }));
  function syncExamplePanels(){
    document.querySelectorAll('.nx-examples').forEach(scope=>{
      const selected=scope.querySelector('[data-demo-tab][aria-pressed="true"]');
      const active=selected?selected.dataset.demoTab:'lf';
      scope.querySelectorAll('[data-demo-panel]').forEach(el=>{el.hidden=innerWidth<768&&el.dataset.demoPanel!==active;});
    });
  }
  syncExamplePanels();
  window.addEventListener('resize',syncExamplePanels,{passive:true});

  document.querySelectorAll('[data-demo-lf]').forEach(demo=>{
    const short=demo.hasAttribute('data-short');
    const steps=short?content.homeLF:content.lfSteps;
    const output=demo.querySelector('[data-lf-output]');
    const start=demo.querySelector('[data-lf-start]');
    const next=demo.querySelector('[data-lf-next]');
    const variant=demo.querySelector('[data-lf-variant]');
    const reset=demo.querySelector('[data-lf-reset]');
    let index=-1;
    let scrollBase=0,scrollEnabled=false,scrollFrame=0;
    const route=short?[0,1,2,3]:[0,1,2,3,4,5,7];
    function show(i,action) {
      const preview=action==='preview';
      // Browsers blur a control as soon as hidden removes it from layout.
      const activeControl=document.activeElement;
      const hadControlFocus=[start,next,variant,reset].includes(activeControl);
      index=i;
      const step=steps[index];
      if(!preview && action!=='scroll'){
        scrollEnabled=!step.variant;
        scrollBase=scrollY-Math.max(0,route.indexOf(index))*innerHeight*.35;
      }
      output.replaceChildren();
      output.append(make('p',`${index+1} / ${steps.length}`,'nx-demo-count'),make('h3',step.title,'nx-demo-title'));
      if (step.preface) output.append(make('p',step.preface,'nx-chat-bubble nx-chat-bubble--client'));
      if (step.subject) output.append(make('p','Assunto: '+step.subject,'nx-email-subject'));
      if(step.subject)output.append(make('p','Consultoria Exemplo · Marina · Clínica Exemplo','nx-email-correspondents'));
      if (step.speaker) output.append(make('p',step.speaker,'nx-micro'));
      if (step.body) output.append(make('p',step.body,step.reply?'nx-chat-bubble':''));
      if (step.reply) output.append(make('p',step.reply,'nx-chat-bubble nx-chat-bubble--client'));
      if (step.chips) { const tags=make('ul',null,'nx-demo-tags');step.chips.forEach(text=>tags.append(make('li',text)));output.append(tags); }
      if (step.tag) output.append(make('p',step.tag,'nx-demo-note'));
      output.dataset.channel=step.title.includes('WhatsApp')?'conversation':step.title.includes('Reunião')?'meeting':'email';
      if(output.dataset.channel==='meeting')output.append(make('p','Convite ilustrativo · agendamento conforme o formato combinado com a empresa.','nx-demo-note'));
      start.hidden=!preview; next.hidden=index===steps.length-1; reset.hidden=preview;
      variant.hidden=short||index!==5;
      if (hadControlFocus) (next.hidden ? reset : next).focus({preventScroll:true});
      if(!preview){
        narrative(demo,'prospect',index/Math.max(1,steps.length-1));
        signal(demo);
        if(action!=='scroll')track('demo_interaction',{demo:'lf',step:String(index+1),action,origin:short?'home-demo':'lf-demo'});
      }
    }
    start.addEventListener('click',()=>show(0,'start'));
    next.addEventListener('click',()=>{
      // The optional follow-up branch is not an event in the main scenario.
      const target=!short&&index===5?7:index+1;
      if(target<steps.length) show(target,'next');
    });
    variant.addEventListener('click',()=>show(6,'variant'));
    reset.addEventListener('click',()=>show(0,'restart'));
    start.textContent=short?'Iniciar simulação':'Ver desde o início';
    show(short?0:2,'preview');
    window.addEventListener('scroll',()=>{
      if(reduced||innerWidth<1024||!scrollEnabled||scrollFrame)return;
      scrollFrame=requestAnimationFrame(()=>{
        scrollFrame=0;
        const r=demo.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
        const position=Math.max(0,Math.min(route.length-1,Math.floor((scrollY-scrollBase)/(innerHeight*.35))));
        if(route[position]!==index)show(route[position],'scroll');
      });
    },{passive:true});
  });

  document.querySelectorAll('[data-demo-chat]').forEach(demo=>{
    const log=demo.querySelector('[data-chat-log]');
    const typing=demo.querySelector('[data-chat-typing]');
    const consultation=demo.querySelector('[data-chat-consultation]');
    const consulted=[
      ['Apartamento de 2 quartos no centro','Imóveis cadastrados','Pergunta: morar ou investir','Entender o perfil do cliente'],
      ['Disponibilidade do imóvel','Base de imóveis · depende de integração','Disponível na base simulada','Características ou visita'],
      ['Compra com financiamento','Faixa de valor e região informadas','Perguntas de qualificação','Encaminhar a um corretor'],
      ['Troca por veículo','Condição ausente na base','Aviso de informação indisponível','Encaminhamento humano']
    ];
    function renderConsultation(index,active){
      if(!consultation)return;
      consultation.replaceChildren();
      ['Intenção','Base','Resposta','Próximo passo'].forEach((label,i)=>{
        const li=make('li');li.append(make('span',label),make('p',consulted[index][i]));
        if(i===active)li.setAttribute('aria-current','step');
        consultation.append(li);
      });
    }
    let responseTimer;
    function selectScenario(button,preview=false){
      const index=Number(button.dataset.chatChoice), scenario=content.chats[index];
      if (!scenario) return;
      demo.querySelectorAll('[data-chat-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
      clearTimeout(responseTimer);
      renderConsultation(index,0);
      log.replaceChildren();
      const appendMessage=message=>{
        const bubble=make('div',null,'nx-chat-bubble'+(message.speaker==='Cliente'?' nx-chat-bubble--client':''));
        bubble.append(make('p',message.speaker,'nx-chat-speaker'),make('p',message.text));log.append(bubble);
      };
      appendMessage(scenario.messages[0]);
      log.setAttribute('aria-live',preview?'off':'polite');
      log.setAttribute('aria-busy',String(!reduced&&!preview));
      if(typing)typing.hidden=reduced||preview;
      const finish=()=>{
       scenario.messages.slice(1).forEach(appendMessage);
       if(index<2){
        const property=make('article',null,'nx-property-result');
        property.append(make('p','Consulta à base simulada','nx-example-label'),make('h4',index===0?'Apartamentos de 2 quartos no centro':'Apartamento da Rua das Flores'),make('p',index===0?'Opções cadastradas na imobiliária fictícia.':'Disponível na base desta simulação.'),make('p','Depende de integração. Sem conexão, a confirmação é feita por uma pessoa.','nx-micro'));log.append(property);
       }
       if (scenario.tags.length) {
        const tags=make('ul',null,'nx-demo-tags');scenario.tags.forEach(text=>tags.append(make('li',text)));log.append(tags);
       }
       if (scenario.note) log.append(make('p',scenario.note,'nx-demo-note'));
       renderConsultation(index,3);
       if(typing)typing.hidden=true;
       log.setAttribute('aria-busy','false');
       if(!preview)signal(demo);
      };
      if(reduced||preview)finish();else responseTimer=setTimeout(finish,420);
      if(!preview){
        narrative(demo,'desk',index===3?1:.7);
        track('demo_interaction',{demo:'bd',step:String(index+1),action:'scenario',origin:demo.hasAttribute('data-short')?'home-demo':'bd-demo'});
      }
    }
    demo.querySelectorAll('[data-chat-choice]').forEach(button=>button.addEventListener('click',()=>selectScenario(button)));
    const first=demo.querySelector('[data-chat-choice="0"]');if(first)selectScenario(first,true);
  });
  // Dynamically inserted CTAs use the same helper as static navigation.
  document.querySelectorAll('[data-contact="whatsapp"]').forEach(whatsapp.prepare);
})();
