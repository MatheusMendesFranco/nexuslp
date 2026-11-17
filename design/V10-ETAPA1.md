# V10 · Etapa 1

Base `a5b3e2b`, branch `feat/v10-tema`. Referência: sistema Nexus atual e `brief/V10-ETAPA1.md`. Um commit por item, sem push.

## 1. Descendentes em gradiente

Nome grande com line-height 1,12 e reserva de 0,12 em sob a linha, compensada por margem negativa. Font-size, peso, tracking e copy não mudam. Isso protege a tinta de g/p/q/ç no background-clip das duas páginas e das faixas da home. Outros destaques `.nx-gradient-stack` já têm padding vertical de 0,14 em e margem compensatória em `motion.css`; preservados. Conferência renderizada nas quatro larguras segue dependente de navegador funcional.

## 2. Etiqueta e nome

Etiqueta em uma linha de layout própria, com margem inferior proporcional de 16–28 px. Retirada a margem superior redundante do H1 no hero; o mesmo gap fica nas duas páginas e nos dois bands. Margem compensatória inferior do gradiente preservada. Sem mudança de copy, CTA ou escala tipográfica.

## 3. Infraestrutura de tema

- Convertidas 122 ocorrências de cor em CSS de componentes para tokens sólidos ou canais RGB (`--nx-veil-rgb`, `--nx-border-rgb`, `--nx-shadow-rgb`, acentos etc.). Alfas estáticos e expressões dinâmicas de opacidade permanecem exatos. Cores literais ficam em `variables.css`; foreground do CTA usa `--nx-on-cta`.
- `:root` continua escuro. Blocos para preferência de sistema, light explícito e dark explícito estão preparados. **Os blocos claros têm `V10: aguardando paleta` e conservam a paleta escura**, inclusive controles nativos: nenhuma paleta provisória nova é aplicada. O estudo posterior deve substituir os valores nesses blocos, incluindo cores sólidas, canais RGB e gradientes. Os canais espelhados de cores sólidas precisam permanecer consistentes.
- Bootstrap mínimo nas quatro páginas antes do CSS aceita somente `light|dark` em `nexus-theme`; ausência/valor inválido/erro de storage seguem o sistema. Metas `color-scheme=dark light` e dois `theme-color` com media. O script atualiza ambos com o token efetivo `--nx-theme-color`; o hint estático usa o escuro atual enquanto não houver paleta clara.
- `theme.js`: ciclo sistema, claro, escuro, com SVGs, nome acessível descritivo, live region, persistência segura e sincronização entre abas. Seguir sistema remove a preferência armazenada. Sem reload e sem integração com analytics/consentimento. Posição temporária no rodapé mantém o header mobile intacto; posição e estilo finais dependem do estudo.
- API `NEXUS.theme.get()`, `.set('system'|'light'|'dark')`, `.cycle()`. Emite `nx:theme` com `{preference,effective}`. Em erro de storage a escolha continua válida na página atual.
- Canvas lê uma vez os seis tokens de canais `--nx-canvas-{node,link,accent,tracer,highlight,ring}` (`R,G,B`) e relê no evento e em mudanças de prefers-color-scheme. Paleta, cores de aresta e sprites são reconstruídos só quando a assinatura muda. Nenhuma leitura de estilo de tema por frame; nenhuma mudança em formações, tempo de história, reduced-motion ou geometria mobile.

## Verificações

- `node --test tests/*.cjs`: **49 PASS**, zero falhas (inclui 47 casos de teste e duas entradas dos helpers). Os novos testes cobrem cores fixas, bootstrap antes do CSS, sistema/persistência, teclado, anúncio, falhas de storage, mudanças entre abas e cache do Canvas sem reload/leitura por frame.
- Sintaxe de `theme.js` e `interactions.js` aprovada; `git diff --check` aprovado.
- Comparação com `a5b3e2b`: os sete CSS de componentes existentes são idênticos após resolver tokens e normalizar as representações das mesmas cores. Alfas e canais preservados.
- Comparação da sequência de cores aplicada ao Canvas antigo/novo, percorrendo as cenas: **44.105 operações idênticas em 360 px** e **41.152 em 1440 px**. É evidência numérica de paridade do escuro, não uma comparação de screenshots.
- Permanecem pendentes a inspeção renderizada das descendentes e do gap em 360/390/768/1440 px. Tentado `node ../brief/probe8.mjs dist ../v10-qa / home`: `ERR_MODULE_NOT_FOUND` para Playwright. Não há afirmação de validação visual. Servir `dist/` como raiz e verificar g/p/q/ç nos nomes e frases em gradiente, ciclo de tema e foco do botão no rodapé, incluindo reduced-motion.

## Arquivos

Criados: `dist/css/v10.css`, `dist/js/theme.js`, `tests/v10.test.cjs` e este registro. Alterados: as quatro páginas (head e controle), `variables.css` e os CSS de componentes com cores literais, `interactions.js` e fixtures/testes existentes para integrar tema e MediaQueryList. `consent.js`, `whatsapp.js`, `track.js` e a copy das demos não mudam. Cache dos CSS e do motor renovado para `v=10`. Sem dependência nova, push ou deploy.
