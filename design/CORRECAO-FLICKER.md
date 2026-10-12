# Correção da tela piscando no smartphone

Relato: a tela inteira pisca ou treme durante o uso no celular. A versão anterior corrigiu as camadas do texto, mas não eliminou esse sintoma.

## Hipótese e mudança

O canvas visível usava `desynchronized: true` e era limpo antes de cada redesenho. A documentação do Chrome descreve a possibilidade de flicker nessa combinação e recomenda preparar o quadro fora da superfície visível antes de copiá-lo: https://developer.chrome.com/blog/desynchronized/.

- Contexto visível sincronizado com a composição da página.
- Em dispositivos de ponteiro impreciso ou telas estreitas, desenho em um canvas auxiliar; uma única cópia apresenta o quadro concluído, incluindo sua transparência.
- Nenhum `clearRect` na superfície visível entre quadros nesse caminho.
- Dimensões do canvas só são atribuídas quando a resolução muda.
- Fundo ambiente estável no celular e retirada da promoção forçada de camada do canvas.
- Novas URLs de assets para carregar esta correção.

Os glifos, a paleta, as transições de formação e a reação ao scroll permanecem. O conteúdo e os contatos comerciais não foram alterados.

## Verificação

`node --check` e `git diff --check` passaram. A simulação de DOM e Canvas2D passou nas larguras de 320, 360, 390, 430, 768, 1024, 1440 e 1920 px, incluindo avanço, retorno, idle, resize, barra de endereço, fallback e movimento reduzido. No caminho com buffer, cada quadro gerou uma cópia completa e nenhum clear na superfície visível.

Limite: essa verificação não renderiza pixels, não mede FPS e não reproduz o smartphone do usuário. A causa continua sendo uma hipótese técnica; a confirmação visual depende de testar a versão publicada no aparelho.
