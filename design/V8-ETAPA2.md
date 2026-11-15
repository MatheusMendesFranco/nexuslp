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
