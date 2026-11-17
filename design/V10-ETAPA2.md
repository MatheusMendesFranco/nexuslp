# V10 · Etapa 2

Base `4539634`, branch `feat/v10-tema`. Direção fixada: `brief/V10-ETAPA2.md` e a paleta aprovada de `brief/V10-TEMA-CLARO.md`. As decisões do Diretor prevalecem: versos claros, botão à esquerda do WhatsApp e reset explícito no rodapé. Sem push/deploy.

## Grupo 1 — paleta e preferência

Aplicados papel frio, tinta noturna, canais RGB, gradientes e papéis semânticos para claro automático e explícito. O escuro permanece como base. Sem escolha salva, não há data-theme: CSS e script seguem o sistema ao abrir e durante a sessão. Escolha manual vale sobre o sistema. A chave canônica é `nx-theme`; o bootstrap migra a chave `nexus-theme` da etapa 1 sem perder preferência válida. O reset remove ambas. Metas têm dois hints no sistema, uma cor ativa em escolha manual; bootstrap antes do CSS evita tema errado no carregamento. API preservada, agora alternando direto claro/escuro; emite `nx:themechange`.

## Grupo 2 — botão no header

Botão circular visual de 40 px, área de 44 px no mobile, antes do WhatsApp em todos os tamanhos (decisão do Diretor). Sol/lua SVG de 20 px mostram o destino; aria-label e title usam “Ativar tema claro/escuro”. Header mantém logo, WhatsApp e menu, com espaçamento adaptado até 320 px. Reset discreto no rodapé só aparece com escolha manual; devolve foco ao botão quando se oculta. Transições de cor de 180 ms, desligadas com reduced-motion; animações de flip/magnetismo preservadas. Navegação do menu considera todos os botões do header.

## Grupo 3 — campo claro

TONES claros 14/116/144, 37/99/235 e 109/64/224. Alfas de sprite .30/.10, arestas ×.70, cometa .45/.70/.85, núcleo .80, halo .60/.30 e glifos limitados a .30. Todos são tokens lidos fora do frame e fazem parte da assinatura do cache; sprites e tabelas reconstruídos no `nx:themechange`. O evento antigo continua aceito por compatibilidade. Geometria, buffer, trajetória e reduced-motion preservados; testes alternam em quatro páginas e duas larguras e verificam cores de desenho, cache e retorno ao idle.

## Grupo 4 — superfícies, versos, gradientes e CTAs

Janelas brancas com barra fria e sombras próprias; chat com superfícies de cliente/atendente separadas. Frentes e versos claros, com gradiente do produto no contorno, incluindo dores LF/BD identificadas por data-product. Véus claros difusos protegem parágrafos e etapas. CTA de marca conserva ciano/azul brilhante e tinta #02040A; BD claro usa #3B82F6 / #7C5CF0, sem texto branco. Gradiente dos nomes usa a variante de texto profunda do produto; espectro gráfico fica em contornos/linhas. A máscara do texto mantém a tinta do tema para não tornar letras claras sobre papel, preservando contraste durante a animação. Header e menu herdam superfícies e tinta corretas. Nenhuma cor literal nova fora de variables.css.

## Grupo 5 — leitura, foco, cookies e eventos

Rótulos/assuntos/contagens usam tinta do produto, não ciano gráfico; links e hover usam azul legível. Seleção com tinta noturna no claro. Foco opaco e bordas de controles reforçadas; fallback forced-colors preserva texto de gradientes. Cookies mantêm Aceitar/Rejeitar equivalentes, Configurar discreto, tabela clara, checkbox com acento de foco e toast escuro legível. Privacidade herda tinta, links e superfícies. `theme_toggle` segue a camada existente de consentimento: só ação deliberada do botão/reset, sem dado pessoal; sistema/entre abas não emitem interação. Teste cobre medição separada de marketing.
