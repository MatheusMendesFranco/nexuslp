/* Copy V6 + delta LF, only fictional demo content. */
window.NEXUS.content = {
  "lfSteps": [
    {
      "title": "Perfil",
      "body": "Perfil definido com a consultoria: clínicas com mais de uma unidade, expansão recente, sem equipe contábil interna."
    },
    {
      "title": "Identificação",
      "body": "Em fontes públicas, a Clínica Exemplo aparece alinhada ao perfil: duas unidades, abertura recente, vaga aberta no financeiro. Só dados profissionais entram na ficha."
    },
    {
      "title": "E-mail de abordagem",
      "subject": "Contabilidade para a segunda unidade da Clínica Exemplo",
      "body": "Olá, Marina. Sou da Consultoria Exemplo. Vi que a Clínica Exemplo abriu uma segunda unidade. Costumamos ajudar clínicas nessa fase a organizar a rotina contábil. Faz sentido conversar? Se preferir não receber nossos e-mails, é só responder “não” e deixamos de escrever.",
      "tag": "Opt-out em toda mensagem"
    },
    {
      "title": "Resposta",
      "body": "Pode ser. Hoje fazemos tudo com um escritório externo, mas está apertado.",
      "speaker": "Marina · contato fictício"
    },
    {
      "title": "Qualificação",
      "chips": [
        "Interesse: sim",
        "Momento: avaliando",
        "Decisora: sim",
        "Critério atendido"
      ]
    },
    {
      "title": "Para o WhatsApp",
      "body": "Marina, para ficar mais ágil, podemos continuar pelo WhatsApp? Me passa o melhor número, por favor.",
      "reply": "Claro, é este: (xx) xxxxx-xxxx.",
      "tag": "A conversa passa a acontecer no WhatsApp com a autorização da pessoa."
    },
    {
      "title": "Follow-up (variante)",
      "body": "Se não houvesse resposta, haveria uma retomada por e-mail, com contexto, depois de alguns dias. Sem insistência.",
      "variant": true
    },
    {
      "title": "Reunião agendada",
      "body": "Reunião agendada — Clínica Exemplo · Marina · quinta, 15h · tema: revisão da rotina contábil das duas unidades · histórico anexado."
    }
  ],
  "homeLF": [
    {
      "title": "E-mail de abordagem",
      "subject": "Contabilidade para a segunda unidade da Clínica Exemplo",
      "body": "Olá, Marina. Sou da Consultoria Exemplo. Vi que a Clínica Exemplo abriu uma segunda unidade. Costumamos ajudar clínicas nessa fase a organizar a rotina contábil. Faz sentido conversar? Se preferir não receber nossos e-mails, é só responder “não” e deixamos de escrever.",
      "tag": "Opt-out em toda mensagem"
    },
    {
      "title": "Resposta e WhatsApp",
      "body": "Marina, para ficar mais ágil, podemos continuar pelo WhatsApp? Me passa o melhor número, por favor.",
      "reply": "Claro, é este: (xx) xxxxx-xxxx.",
      "tag": "A conversa passa a acontecer no WhatsApp com a autorização da pessoa.",
      "preface": "Pode ser. Hoje fazemos tudo com um escritório externo, mas está apertado."
    },
    {
      "title": "Reunião agendada",
      "body": "Reunião agendada — Clínica Exemplo · Marina · quinta, 15h · tema: revisão da rotina contábil das duas unidades · histórico anexado."
    }
  ],
  "chats": [
    {
      "label": "Quero saber sobre um apartamento",
      "messages": [
        {
          "speaker": "Cliente",
          "text": "Oi, vocês têm apartamento de 2 quartos no centro?"
        },
        {
          "speaker": "Júlia",
          "text": "Olá! Aqui é a Júlia, atendente virtual da Imobiliária Exemplo. Temos opções de 2 quartos no centro cadastradas. Você busca para morar ou investir?"
        }
      ],
      "tags": [
        "Consulta: imóveis cadastrados",
        "[depende de integração com a base de imóveis]"
      ],
      "note": ""
    },
    {
      "label": "O imóvel ainda está disponível?",
      "messages": [
        {
          "speaker": "Cliente",
          "text": "O apartamento da Rua das Flores ainda está disponível?"
        },
        {
          "speaker": "Júlia",
          "text": "Pela base de imóveis, o apartamento da Rua das Flores consta como disponível. Posso te passar as características principais ou agendar uma visita?"
        }
      ],
      "tags": [
        "Consulta em tempo real",
        "[depende de integração]"
      ],
      "note": "Sem integração, a disponibilidade é confirmada por uma pessoa."
    },
    {
      "label": "Quero financiar",
      "messages": [
        {
          "speaker": "Cliente",
          "text": "Quero comprar, mas vou precisar de financiamento."
        },
        {
          "speaker": "Júlia",
          "text": "Tudo bem, posso te ajudar a começar. Para indicar as opções certas, me conta: qual faixa de valor você tem em mente e em qual bairro prefere morar?"
        },
        {
          "speaker": "Cliente",
          "text": "Até uns 400 mil, de preferência perto do metrô."
        },
        {
          "speaker": "Júlia",
          "text": "Anotado. Posso chamar um corretor para detalhar as condições de financiamento?"
        }
      ],
      "tags": [
        "Qualificação",
        "Interesse: compra",
        "Faixa: informada",
        "Região: informada",
        "Financiamento: sim"
      ],
      "note": ""
    },
    {
      "label": "Pergunta que ele não sabe",
      "messages": [
        {
          "speaker": "Cliente",
          "text": "O proprietário aceita trocar por um carro?"
        },
        {
          "speaker": "Júlia",
          "text": "Não tenho essa informação, e prefiro não te passar nada errado. Vou encaminhar sua dúvida para um dos nossos corretores, que te responde com a resposta correta. Pode ser por este número?"
        }
      ],
      "tags": [
        "Encaminhamento humano",
        "Resumo enviado ao corretor: interesse no apt. da Rua das Flores; dúvida sobre troca por veículo."
      ],
      "note": "Quando não sabe, o atendente avisa e encaminha. Ele não inventa."
    }
  ],
  "lfScenario": "Uma consultoria de contabilidade quer atender clínicas médicas de médio porte.",
  "lfDisclaimer": "Exemplo ilustrativo; não é um caso real. Em projetos reais, critérios, mensagens e quem conduz cada etapa são definidos com a empresa e respeitam a LGPD.",
  "chatDisclaimer": "Exemplo ilustrativo; não é uma conversa real. Nomes e imóveis são fictícios."
};
