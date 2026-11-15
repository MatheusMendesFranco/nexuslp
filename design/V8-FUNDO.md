# V8 — etapa 1

Base: `21bf5c7`. Removidos os desenhos de conexão do cursor/foco/seleção,
as ondas de clique e seu deslocamento radial dos nós, além da conexão
temporária entre componentes e o campo. O código e o estado desses efeitos
foram excluídos. Rastros curtos dos nós dependem de energia de scroll, para
não surgir uma linha apenas por mover o mouse ou focar um controle.

A API `NEXUS.field.pulse(element)` continua compatível com os componentes,
agora usando somente a lente/brilho local dos nós e seu decaimento natural.
As mudanças de formação por `narrative`, cursor, seleção, paralaxe, scroll,
magnetismo dos CTAs, buffer mobile, qualidade adaptativa e reduced-motion
foram mantidos. As linhas estruturais das cenas continuam pertencendo às
formações; não são criadas conexões adicionais para os gestos.

Testes capturam chamadas Canvas em uma cena dispersa: mouse, foco, seleção,
ponte dos componentes, clique e toque não acrescentam segmentos ou anéis;
clique/toque comuns também não deslocam os nós. A reação por proximidade e
o retorno ao repouso são verificados junto às regressões anteriores.
Essa captura verifica operações e coordenadas, não pixels em navegador real.
Suíte completa: `node --test tests/v6.test.cjs tests/http.test.cjs`,
**32 PASS, zero falhas**. Sintaxe dos módulos e `git diff --check` aprovados.

Etapa 2 não iniciada. Nenhuma alteração de layout, conteúdo comercial ou deploy.
