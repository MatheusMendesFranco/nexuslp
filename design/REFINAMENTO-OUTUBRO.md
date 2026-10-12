# Referência e decisões — revisão de copy e rolagem

Referência principal: a home Nexus já publicada neste projeto, seu Canvas 2D,
Inter, gradientes mascarados e campo único de nós. Fonte de conteúdo: o arquivo
Texto colado(1).txt enviado nesta solicitação. Não há nova direção de marca.

Preservar: glifos, formações, fio de sinal, faixa cromática nas letras, reação ao
cursor, foco/toque, scroll nativo e WhatsApp. Refinar: hierarquia, densidade,
entrada do texto e passagem entre estados. Retirar do percurso as mensagens
conceituais repetidas e a permanência de 240svh no processo. Criar a explicação
concreta das oportunidades, o diferencial e a origem resumida.

| Decisão | Origem | Efeito |
|---|---|---|
| Hero comercial direto | Brief §§8,14 | Explicar a proposta na chegada |
| Cinco seções com conteúdo em fluxo normal | Brief §§3,4,10,16 | Avançar sem esperar animação |
| Mesma matéria se organiza em uma jornada | Brief §§5,11,20 | Motion acompanha o argumento |
| Letras sempre legíveis, mesmo em entrada | Brief §§7,19,26 | Funcionamento com rolagem rápida |
| Origem em 2019 e funções simples | Copy oficial | Humanizar sem inventar fatos |
| Fundo mais calmo em Quem somos | Brief §§6,13 | Contraste e alternância de intensidade |
| Gradiente decorativo por pseudoelemento | Brief §26 | Texto sem duplicação no HTML |

Refero foi aplicado como metodologia de preservação de referência. O catálogo
retornou assinatura inativa anteriormente; o alvo visual é o produto existente.
A skill de Sites determina que, neste perfil gerenciado, QA no navegador exige
control-browser. A capacidade não está disponível nesta sessão. Não foram
instalados ou usados navegadores alternativos. As verificações desta revisão
são de fonte, semântica e simulação do motor, não medição visual ou de FPS.

## Verificações concluídas

- Sintaxe do JavaScript e das três folhas CSS.
- IDs únicos, um H1, referências ARIA e todas as âncoras existentes.
- Três CTAs, URL oficial, origem individual, target e rel corretos.
- Camadas de gradiente sem texto duplicado no DOM e ocultas da árvore acessível.
- Ausência de palcos pinned no HTML e de interceptação de wheel/touchmove.
- Motor executado em DOM com geometria simulada para seis configurações, de
  320×640 até 1920×1080, com salto rápido, retorno, refresh em posição intermediária,
  pausa em repouso, redimensionamento e reação ao ponteiro fino.
- Coordenadas finitas e um desenho por frame ativo nas simulações.
- Saídas seguras com Canvas 2D indisponível e movimento reduzido.

Não foram medidos FPS, overflow renderizado, contraste renderizado, Safari/Firefox,
trackpad físico ou uso em aparelhos. Esses itens exigem QA em navegador/dispositivo.
