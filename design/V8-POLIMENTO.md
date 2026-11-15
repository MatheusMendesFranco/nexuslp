# V8 · Polimento

Base: `e9db1f8`. Direção visual: `brief/V8-POLIMENTO.md` e as sete capturas em `brief/shots-v8/`, examinadas antes da alteração. Mantidos o sistema Nexus, as decisões da etapa 2, o Canvas e os comportamentos aprovados. Quatro itens, quatro commits locais, sem push.

## 1. Hero LF / BD

Removido somente o lockup pequeno da coluna de texto do hero; tag, H1 e lockup da prévia continuam. Escala do nome em 48–104 px no desktop e 40–44 px no mobile. Claim, descritor, corpo e CTA recebem espaçamentos menores, sem retirar ou encurtar a copy. Ajuste de padding superior mantém distância do header. Teste de identidade confirma ausência do lockup redundante e preserva título, prévia e CTA.

## 2. Véus difusos

Retirados padding, fundo retangular e backdrop-filter dos parágrafos. O véu passa a um pseudo-elemento isolado atrás do texto, com gradiente radial, blur e sombra de borda difusa; não intercepta ponteiro nem afeta o fluxo. Sem extensão horizontal do pseudo-elemento: apenas blur/sombra pintam além da área, evitando criar largura de layout adicional. Texto conserva o alinhamento do título. Aplicado também às faixas de fatos e ao fluxo de atendimento; janelas e versos opacos dispensam o efeito.

## 3. Persona compacta, com teaser

O primeiro card ocupa quatro das seis colunas, em uma linha de altura; os demais ocupam duas, preenchendo a grade sem lacunas. Retirada a centralização vertical e a altura mínima das frentes. Índice, título e teaser partem do topo; o título principal fica em 34–48 px. Os oito teasers repetem a descrição curta já aprovada em cada verso, sem adicionar promessas. Versos, botões, IDs e `aria-expanded` permanecem. Teste compara cada teaser à descrição correspondente e conserva a verificação dos oito flips por teclado. Mobile mantém uma coluna e altura natural.

### Validação renderizada

Tentado `node brief/probe7.mjs nexuslp/dist v8-pol-baseline` a partir do diretório pai: falhou com `ERR_MODULE_NOT_FOUND` para `playwright`. Nenhuma dependência instalada. A disponibilidade do CTA em 1440×900 e a medição real de overflow em 360 px precisam de conferência em navegador funcional; testes de DOM/Canvas não demonstram layout CSS. Limitação registrada conforme o brief.
