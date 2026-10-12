# Ajustes de smartphone e movimento

Referência fixada: a home Nexus e seus tokens atuais. Mantidos conteúdo, paleta,
fonte, formações, gradiente viajante, fio de sinal, cursor e scroll nativo.

## Correções

- Gradiente pintado sobre a própria composição tipográfica. Retirada a camada
  duplicada que podia desalinha​r letras quando a frase quebrava em telas estreitas.
- Geometria da narrativa usa a altura estável do canvas no mobile. Uma mudança
  de altura da barra de endereço não remapeia o progresso das cenas.
- Safe areas no header, margens laterais, menu e rodapé; viewport-fit para recortes
  de tela. Menu visível e rolável também em smartphones na horizontal.
- Títulos com tamanho e entrelinha ajustados; quebra de palavras disponível em
  casos extremos. Grades de etapas e funções usam colunas com mínimo zero.
- Botões limitados à largura disponível e com rótulo que pode quebrar.
- Menor atraso e menor excesso de inércia na rolagem, amplitude cromática mais
  controlada e fade entre intensidades com a curva suave existente.
- Magnetismo do botão volta ao repouso quando o scroll move sua posição real.
- Gradiente estático e legível com movimento reduzido e fallback de texto branco.

## Verificação

JavaScript e CSS parseados; IDs, referências ARIA, âncoras, assets e WhatsApp
verificados. Motor executado com DOM/geometria simulados em 320, 360, 390, 430,
768, 1024, 1440 e 1920px. Verificados retorno, avanço, pausa, resize, coordenadas
finitas e estabilidade da geometria/canvas quando a altura da barra muda.

O controle de navegador continua indisponível nesta sessão gerenciada. Não houve
renderização para inspeção visual, medição de FPS ou teste em smartphone físico.
