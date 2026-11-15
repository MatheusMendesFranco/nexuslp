# V8 · Etapa 2 — identidade e organização visual

## Direção fixada antes da implementação

Alvo: o sistema Nexus existente e o mapa P1–P16 aprovado em `brief/V8-ETAPA2.md` / `brief/V8-ORGANIZACAO-VISUAL.md`. Preservar Void, Inter local, Canvas vivo, cards reversíveis, interações, consentimento e CTAs. Sem novas formações, dependências ou provas comerciais.

Refero consultado: serviço retornou `NO_SUBSCRIPTION`. Referências públicas lidas em 15/11/2026: [Ramper](https://www.ramper.com.br/), [Fin](https://fin.ai/), [HubSpot Prospecting Agent](https://www.hubspot.com/products/sales/ai-prospecting-agent). A leitura textual confirma hierarquia e função, sem comprovar aparência renderizada. As capturas V7 fornecidas são o ponto de comparação visual; valores tipográficos vêm do brief aprovado. Guia Refero de tipografia usado para hierarquia e limites de leitura.

| Decisão | Fonte / papel | Aplicação |
|---|---|---|
| Nome + função no primeiro bloco | Brief §3a, Fin / HubSpot | Tag, lockup e nome dominante, frase subordinada |
| Ciano LF / violeta BD | Tokens aprovados §3a | Acentos em gráficos; variantes claras para texto AA |
| Janelas com resultado e Simulação | Brief P2/P5, Ramper | E-mail e conversa fictícios, sem prova inventada |
| Ritmo por conteúdo | Mapa §3c | Bands espelhados, trilhos, faixas, bento e FAQ lateral |
| Cards preservados | Decisão expressa do Diretor | Dores, método e persona continuam reversíveis |
| Corpo protegido do Canvas | Brief §3b | Véu localizado; Canvas continua visível ao redor |

Estratégia de mídia: SVG inline simples para glifos; HTML semântico para simulações. Sem imagens geradas. Evitar grade uniforme, cores novas e cópia estética de concorrentes.

## Passo 1 — identidade

Tokens LF/BD, `data-product="lf|bd"`, tags, lockups, glifos e títulos com nome do produto. Navegação, janelas e rodapés compartilham marcação. `track.js` normaliza os códigos visuais para os identificadores anteriores dos eventos; mensagens/origens de CTA permanecem intactas. Cache dos arquivos alterados renovado.

## Passo 2 — heros P2

Um H1 com o nome do produto, claim aprovado subordinado, descritor de função e janela ilustrativa. No desktop, composição em duas colunas; mobile empilha a janela depois do CTA. E-mail e atendimento têm identificação de simulação; a prévia leva à demo existente. Sem eventos de interação disparados na prévia estática.

## Passo 3 — bands P4 e conector P16

Home com atalhos dos dois produtos, bands com lavagem de cor, tag, lockup e nome em H2. Composição espelhada preserva os cinco passos originais de cada solução. Conector reforça que operam separadas ou juntas. O gradiente de cada band fica no nome, evitando competição com a frase de benefício.

## Passo 4 — trilhos e cenas

Método com os cinco flip cards ligados em trilho; apenas uma face aberta por vez, com a primeira inicialmente aberta. Mobile vertical. LF reorganiza seus sete cards entre pesquisa (três), percurso (três) e acompanhamento (um), conservando todo o conteúdo e os IDs de deep link. BD separa problema, persona e fluxo em cenas; o fluxo usa details/summary nativos, agrupados por `name`, e narra a etapa selecionada. Somente formações existentes (`prospect`, `desk`, `method`).

## Passo 5 — ritmo por conteúdo

P6 no diferencial/problema; P13 nas definições e integrações; P8 na confiança e participação da Nexus. A quinta linha de confiança vira nota de identificação abaixo do bento, preservando o conteúdo. Persona mantém os oito flip cards em bento assimétrico (decisão do Diretor, substitui P12). Pesquisa LF e acompanhamento BD seguem P9. FAQ em P10 com introdução lateral e link para o contato existente; fechamento P11 com lockup. A escala distingue nome, título, lead, corpo, rótulo e índice sem números comerciais novos.

## Passo 6 — legibilidade e status de consentimento

Véus locais a 55% com blur de 6 px protegem corpo/lead sem cobrir o Canvas inteiro. Dentro de janelas e versos já opacos, o véu é dispensado. O toast mantém a região `role=status`, `aria-live=polite`, agora atômica; some em 3,5 s, reinicia o prazo após nova escolha e permanece vazio ao recarregar. O estado vazio não desenha superfície. Teste reproduz decisões consecutivas e reload; a escolha de cookies e carregamento do Pixel permanecem intactos.
