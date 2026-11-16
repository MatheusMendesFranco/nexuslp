# V9 · Responsividade, ritmo e ícones

Base `b8d0611`, branch `fix/v9-mobile`. Escopo: `brief/V9-MOBILE.md`, auditoria R/T/A/P/S/C/E e as seis capturas fornecidas. Sistema Nexus e copy aprovados são a referência; sem nova direção visual. Sete grupos na ordem do plano da auditoria, um commit por grupo. Sem push.

## Grupo 1 — E-1 / E-2 / E-3

Ícone SVG único (`.nx-icon`, 16 px, currentColor, aria-hidden) para links, controles e chevrons. Removido o pseudo-elemento textual dos flips. O rótulo atualizável fica em um span separado, portanto virar o card não apaga nem duplica o SVG. Percursos e remetente/destinatário usam ponto médio. Summary sem marcador nativo, com chevron SVG que gira e respeita reduced-motion. Teste recursivo cobre os intervalos Unicode solicitados e pictográficos, ignorando comentários sem ocultar strings/URLs.

## Grupo 2 — R-1

Corrigida a extensão horizontal de 24 px do pseudo-elemento das etapas da home: ela excedia a margem de 16 px em 8 px (e a margem de 20 px em 4 px no tablet), compatível com a medida da auditoria. Ambiente sem inset negativo, com overflow contido localmente; quatro camadas limitadas à largura útil. Removido o `overflow-x:clip` do body. Canvas usa `documentElement.clientWidth` no dimensionamento e no teste de resize, impedindo realimentação de `innerWidth` inflado. Alteração restrita à medição; buffer, idle, formações e altura estável permanecem. Fixture reproduz innerWidth 8 px maior nas quatro larguras e confirma tamanho do buffer e estabilidade mobile.
