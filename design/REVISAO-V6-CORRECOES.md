# Correções da revisão independente da V6

Base recebida: `0c1c638`. Branch: `feat/duas-ofertas-v6`.
Correções e testes: `73a51d1`.
Decisões editoriais e prazo de 12 meses autorizados pelo Diretor nesta rodada.
Todas as referências abaixo são relativas ao clone e apontam para o código
corrigido, não para a numeração antiga da revisão.

| Achado | Correção e arquivo:linha | Evidência automatizada |
| --- | --- | --- |
| I-01 | Rótulos comerciais separados dos identificadores em `dist/js/whatsapp.js:21` e `dist/js/whatsapp.js:35`. HTML e aria-label corrigidos em `dist/index.html:37`, `dist/index.html:121`, `dist/linha-de-frente/index.html:37`, `dist/linha-de-frente/index.html:78`, `dist/balcao-digital/index.html:37`, `dist/balcao-digital/index.html:96`. Origem preservada em `data-cta-origin`. | `tests/v6.test.cjs:31`: seis CTAs sem JS, após preparação e após uma legenda contaminada; preparação idempotente. URLs e mensagens mantidas. |
| I-02 | Os dois atributos de abertura são reconhecidos em `dist/js/consent.js:167`. `review(opener)` guarda o botão de origem e move o foco ao dialog em `dist/js/consent.js:99`; o fechamento devolve o foco em `dist/js/consent.js:154`. | `tests/v6.test.cjs:51`: artigo e rodapé, entrada/retorno do foco e aceitar → revisar pelo artigo → rejeitar → recarregar sem Pixel. |
| I-03 | Foco capturado antes de qualquer controle ser escondido em `dist/js/experience.js:49`; transferência para Próxima etapa ou reinício em `dist/js/experience.js:64`. O fixture perde foco ao esconder o elemento ativo ou ancestral em `tests/dom.cjs:22`. | `tests/v6.test.cjs:62`: reproduz o blur causado por hidden e verifica início, conclusão e reinício nas duas demos, além da variante LF. |
| I-04 | Validade de 12 meses em `dist/js/consent.js:8` e `dist/js/consent.js:22`; expiração em sessão aberta em `dist/js/consent.js:108` e `dist/js/consent.js:115`. Tabela com caption e cabeçalhos em `dist/js/consent.js:55`, estilo em `dist/css/consent.css:18`; política com prazos explícitos em `dist/privacidade/index.html:168` e `dist/privacidade/index.html:204`. Contrato atualizado em `design/V6.md:43`. | `tests/v6.test.cjs:77`, `tests/v6.test.cjs:88`, `tests/v6.test.cjs:102`: limite exato, bissexto, outra versão, futuro, migração, eventos entre abas, expiração ativa e informação pública. |
| I-05 | Copy aprovada aplicada à home em `dist/index.html:45`, `dist/index.html:61`, `dist/index.html:93`, `dist/index.html:112`; BD em `dist/balcao-digital/index.html:37`, `dist/balcao-digital/index.html:41`, `dist/balcao-digital/index.html:77`; política em `dist/privacidade/index.html:140` e `dist/privacidade/index.html:142`; legenda simulada em `dist/js/content.js:149`. Formulações equivalentes foram revistas como comportamento configurado, com acompanhamento para corrigir falhas. | `tests/v6.test.cjs:109`: varredura das quatro páginas e de todo JS público; confirmação da copy de acompanhamento e da legenda da demo. |
| M-01 | Canonical absoluto e og:url correspondentes em `dist/index.html:4`, `dist/linha-de-frente/index.html:4`, `dist/balcao-digital/index.html:4`, `dist/privacidade/index.html:4`. | `tests/v6.test.cjs:117`: exatamente um canonical e um og:url por página, domínio oficial e barras finais corretas. |

## Retenção e compatibilidade

A preferência usa a chave `nexus-consent`, alinhada ao nome publicado na tabela.
Escolhas ainda válidas de `nexus.consent.v1` são migradas sem mudar `updatedAt`.
Outra versão, data inválida, data futura ou 12 meses completos não autorizam
rastreamento. O aniversário é calculado em UTC e 29 de fevereiro vence em
28 de fevereiro no ano seguinte. A restauração entre abas não renova o prazo.

O painel publica 12 meses para a escolha e até 90 dias, conforme a Meta, para
`_fbp` / `_fbc`, somente com marketing. Não foi alterado o prazo da biblioteca
da Meta: essa linha informa o prazo aprovado pelo Diretor. A revogação e os
gates de medição/marketing continuam funcionando, incluindo falhas de storage.

## Verificação

```sh
node --test tests/v6.test.cjs tests/http.test.cjs
git diff --check
```

Resultado: **23 testes, 23 PASS, zero falhas**. Sintaxe dos módulos alterados
aprovada. Busca nas páginas e em `dist/js/` sem a formulação absoluta apontada
em I-05. HTTP e demais regressões anteriores seguem cobertos pela mesma suíte.

`dist/js/interactions.js`, `dist/css/variables.css`, `dist/css/base.css` e
`dist/css/motion.css` permaneceram idênticos ao HEAD recebido. O texto da
política foi preservado fora das alterações de I-04/I-05. Sem push ou deploy.

O foco foi retestado no fixture com blur por hidden; não houve nova execução
em navegador real nesta sessão, cujo host de navegador continua indisponível.
Na nova revisão, conferir também via teclado os dois caminhos de preferências
e início/conclusão/reinício/variante das demos em navegador real.
