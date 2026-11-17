# V10 · Etapa 2

Base `4539634`, branch `feat/v10-tema`. Direção fixada: `brief/V10-ETAPA2.md` e a paleta aprovada de `brief/V10-TEMA-CLARO.md`. As decisões do Diretor prevalecem: versos claros, botão à esquerda do WhatsApp e reset explícito no rodapé. Sem push/deploy.

## Grupo 1 — paleta e preferência

Aplicados papel frio, tinta noturna, canais RGB, gradientes e papéis semânticos para claro automático e explícito. O escuro permanece como base. Sem escolha salva, não há data-theme: CSS e script seguem o sistema ao abrir e durante a sessão. Escolha manual vale sobre o sistema. A chave canônica é `nx-theme`; o bootstrap migra a chave `nexus-theme` da etapa 1 sem perder preferência válida. O reset remove ambas. Metas têm dois hints no sistema, uma cor ativa em escolha manual; bootstrap antes do CSS evita tema errado no carregamento. API preservada, agora alternando direto claro/escuro; emite `nx:themechange`.
