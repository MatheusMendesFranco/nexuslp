# V9 · Responsividade, ritmo e ícones

Base `b8d0611`, branch `fix/v9-mobile`. Escopo: `brief/V9-MOBILE.md`, auditoria R/T/A/P/S/C/E e as seis capturas fornecidas. Sistema Nexus e copy aprovados são a referência; sem nova direção visual. Sete grupos na ordem do plano da auditoria, um commit por grupo. Sem push.

## Grupo 1 — E-1 / E-2 / E-3

Ícone SVG único (`.nx-icon`, 16 px, currentColor, aria-hidden) para links, controles e chevrons. Removido o pseudo-elemento textual dos flips. O rótulo atualizável fica em um span separado, portanto virar o card não apaga nem duplica o SVG. Percursos e remetente/destinatário usam ponto médio. Summary sem marcador nativo, com chevron SVG que gira e respeita reduced-motion. Teste recursivo cobre os intervalos Unicode solicitados e pictográficos, ignorando comentários sem ocultar strings/URLs.
