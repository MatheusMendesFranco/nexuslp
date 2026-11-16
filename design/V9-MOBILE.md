# V9 · Responsividade, ritmo e ícones

Base `b8d0611`, branch `fix/v9-mobile`. Escopo: `brief/V9-MOBILE.md`, auditoria R/T/A/P/S/C/E e as seis capturas fornecidas. Sistema Nexus e copy aprovados são a referência; sem nova direção visual. Sete grupos na ordem do plano da auditoria, um commit por grupo. Sem push.

## Grupo 1 — E-1 / E-2 / E-3

Ícone SVG único (`.nx-icon`, 16 px, currentColor, aria-hidden) para links, controles e chevrons. Removido o pseudo-elemento textual dos flips. O rótulo atualizável fica em um span separado, portanto virar o card não apaga nem duplica o SVG. Percursos e remetente/destinatário usam ponto médio. Summary sem marcador nativo, com chevron SVG que gira e respeita reduced-motion. Teste recursivo cobre os intervalos Unicode solicitados e pictográficos, ignorando comentários sem ocultar strings/URLs.

## Grupo 2 — R-1

Corrigida a extensão horizontal de 24 px do pseudo-elemento das etapas da home: ela excedia a margem de 16 px em 8 px (e a margem de 20 px em 4 px no tablet), compatível com a medida da auditoria. Ambiente sem inset negativo, com overflow contido localmente; quatro camadas limitadas à largura útil. Removido o `overflow-x:clip` do body. Canvas usa `documentElement.clientWidth` no dimensionamento e no teste de resize, impedindo realimentação de `innerWidth` inflado. Alteração restrita à medição; buffer, idle, formações e altura estável permanecem. Fixture reproduz innerWidth 8 px maior nas quatro larguras e confirma tamanho do buffer e estabilidade mobile.

## Grupo 3 — T-1

Balance em títulos/leads/frentes de card; pretty em parágrafos, listas e definições, com fallback nativo. As três órfãs explícitas recebem agrupamentos curtos sem quebra (`cada cliente.`, `quando quiser.`, `sua empresa.`), preservando o texto e evitando dependência de pretty em browsers antigos. As mensagens, nomes acessíveis e dados de CTA não mudam.

## Grupo 4 — A-1

Token de header 76 px desktop / 68 px mobile, incluindo safe area, usado no header e no scroll-margin de `#conteudo` e das âncoras internas (inclui cards e capítulos). Respiro de 16 px. Scroll-padding anterior zerado para não somar dois deslocamentos. Mantidos skip-link nativo, tabindex do main, foco das demos e dos painéis de consentimento.

## Grupo 5 — P-1

Logo com área mínima de 44 px e padding de toque; margem compensatória conserva a posição visual do símbolo e wordmark. Links do sumário jurídico com área mínima de 44 px, flex e alinhamento vertical, conservando conteúdo e destinos. Nenhum listener ou comportamento de navegação alterado.

## Grupo 6 — S-1 / S-2 e ritmo B

Escala section/block/tight: 72/32/12 px mobile, 96/40/16 tablet, 128/48/16 desktop. Seções, hero (header + block), capítulos, grades e janelas consomem os tokens; retiradas margens finais de 80 px das grades LF e alturas mínimas de viewport das cenas de demo. Botões, lógica e foco das demos não mudam. Faixas de produto com lista vertical numerada no mobile, sem etapa 05 isolada; links e claims com respiro consistente. Eyebrows sem traço decorativo oculto nem recuo vazio. Véus sem padding e leads alinhados à margem no mobile/tablet. Palavras do diferencial em lista vertical L4 no celular. Grupos de título da home centralizados como bloco no tablet, texto alinhado à esquerda, largura até 28ch. Teste valida o contrato de tokens e seu consumo, sem alegar medir CSS renderizado.

## Grupo 7 — C-1 / T-2 / E-4 / P-2 e refinamentos B

Frentes das dores com altura uniforme no mobile; versos só dimensionam a face aberta e crescem sem scroll interno. Tamanho em `max(300px,18em)` acompanha o tamanho do texto; fallback sem JS continua natural. Persona com índice+título em linha, teaser abaixo, padding de 16 px, controle de 44 px e gap tight. Trilho LF com raio de 12 px e padding de 18 px compartilhado pelos rótulos e faces; fundo e rodapé aberto consistentes. Rótulos e tags com 12 px. Toast opaco sob o header e fora do rodapé, preservando live region e temporizador. Política com introdução e dezesseis seções irmãs em um article; botão de preferências no contato, todos os IDs e o texto preservados. Teste cobre a estrutura e os dezesseis links do índice.

## Verificações e limites de evidência

- `node --test tests/v6.test.cjs tests/http.test.cjs`: **42/42 PASS**, zero falhas. Novos testes: zero emoji, viewport inflado em 8 px, contrato de tokens e estrutura jurídica. Regressões de consentimento, CTAs, eventos, teclado/foco, reduced-motion, buffer mobile e idle aprovadas.
- `node --check dist/js/interactions.js` e `node --check dist/js/experience.js`: aprovados. `git diff --check`: aprovado.
- Comparação direta com `b8d0611`: texto integral do main da privacidade igual após normalizar whitespace. Texto dos demais mains igual após descontar setas/separadores decorativos. Nenhuma mudança nos arquivos de consentimento, WhatsApp, tracking ou conteúdo das demos.
- Tentativa de `node ../brief/probe8.mjs dist ../v9-qa / home`: **bloqueada por `ERR_MODULE_NOT_FOUND: playwright`**. Nenhum pacote foi instalado. A inspeção visual usa as capturas fornecidas; não há capturas posteriores nem medição de layout/console real neste ambiente. O fixture de DOM não substitui `scrollWidth === clientWidth` em navegador.

### Para validar em navegador

Servir `dist/` como raiz (`python -m http.server 8080 --directory dist` ou `node tools/serve.cjs 8080`). Conferir as quatro páginas em 360, 390, 768 e 1440 px: largura do documento igual a clientWidth, camadas de fundo sem excesso, alvos de 44 px, skip-link/âncoras sem cobertura, chevrons sem marcador nativo, quatro dores fechadas com mesma altura e versos sem corte, oito personas compactas, rótulos LF alinhados, listas de cinco etapas e ritmo desktop. Repetir com reduced-motion e menu/painéis abertos.

Com Playwright disponível, executar o probe fornecido com caminho absoluto para `dist` e comparar às capturas `brief/shots-v9/`. Em Git Bash usar `MSYS_NO_PATHCONV=1`. O helper local `tools/v8-browser.cjs` também contém verificações de overflow por seção/card e captura de console, mas depende de Chrome funcional.

### Arquivos

Criados: `dist/css/v9.css`, `tests/source-audit.cjs` e este registro. Alterados: as quatro páginas, `dist/css/{variables.css,motion.css,v7.css,v8.css}`, `dist/js/{interactions.js,experience.js}`, `tests/{dom.cjs,v6.test.cjs}`. Assets afetados com cache `v=9`. Nenhuma dependência nova, deploy ou push.
