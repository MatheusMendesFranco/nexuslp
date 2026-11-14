/* Links remain usable without JavaScript; this helper centralizes per-origin copy. */
(() => {
  'use strict';
  const messages = Object.freeze({
    header: 'Olá! Vim pelo site da Nexus e gostaria de conversar sobre o meu comercial.',
    hero: 'Olá! Quero entender como a Nexus pode ajudar a melhorar o comercial da minha empresa.',
    'dor-oportunidades': 'Olá! Minha empresa tem poucas oportunidades novas e quero saber como a Linha de Frente pode ajudar.',
    'dor-atendimento': 'Olá! Minha equipe está sobrecarregada no atendimento e quero saber como o Balcão Digital pode ajudar.',
    'dor-retorno': 'Olá! Perco contatos por falta de acompanhamento e quero saber como a Nexus pode ajudar.',
    'dor-informacao': 'Olá! As informações da minha empresa estão desorganizadas e quero entender por onde começar.',
    'lf-hero': 'Olá! Quero saber como a Linha de Frente pode ajudar minha empresa a encontrar novas oportunidades comerciais.',
    'lf-final': 'Olá! Quero saber como a Linha de Frente pode ajudar minha empresa a encontrar novas oportunidades comerciais.',
    'lf-demo': 'Olá! Vi a simulação da Linha de Frente e quero avaliar se faz sentido para a minha empresa.',
    'bd-hero': 'Olá! Gostaria de entender como o Balcão Digital pode funcionar na minha empresa.',
    'bd-final': 'Olá! Gostaria de entender como o Balcão Digital pode funcionar na minha empresa.',
    'bd-demo': 'Olá! Vi a simulação do Balcão Digital e quero avaliar como seria para o meu negócio.',
    final: 'Olá! Quero conversar com a Nexus sobre o comercial da minha empresa.',
    menu: 'Olá! Vim pelo site da Nexus e gostaria de conversar.'
  });
  function url(origin) {
    return 'https://api.whatsapp.com/send/?phone=5521972599900&text=' + encodeURIComponent(messages[origin] || messages.header);
  }
  function prepare(link) {
    link.href = url(link.dataset.ctaOrigin);
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', link.textContent.trim() + ' (abre o WhatsApp em nova aba)');
  }
  window.NEXUS = window.NEXUS || {};
  window.NEXUS.whatsapp = Object.freeze({url, prepare});
  document.querySelectorAll('[data-contact="whatsapp"]').forEach(prepare);
})();
