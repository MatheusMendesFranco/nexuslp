# Nexus — V6: Linha de Frente e Balcão Digital

Site estático da Nexus Soluções Digitais: home, Linha de Frente, Balcão Digital
e layout de privacidade. HTML/CSS/JS puro, fundo Canvas2D compartilhado, demos
locais fictícias, consentimento granular e contato no WhatsApp por origem.

Este checkout contém trabalho local na branch `feat/duas-ofertas-v6`. Nenhum
deploy é necessário para abrir ou testar o código.

## Abrir localmente

O projeto usa HTML, CSS e JavaScript, sem instalação de dependências ou etapa de build.

Na pasta do projeto:

```sh
python -m http.server 8080 --directory dist
```

Abra `http://localhost:8080/`, `/linha-de-frente/`, `/balcao-digital/` e
`/privacidade/`. Os assets e links usam caminhos a partir da raiz `dist/`.

Se o computador não tiver Python, há um servidor opcional sem dependências:

```sh
node tools/serve.cjs 8080
```

Use HTTP para testar; abrir um arquivo com `file://` não resolve os caminhos
absolutos das páginas e assets. O site servido não requer Node, Python ou build.

## Verificar

Com Node instalado, sem `npm install`:

```sh
node --test tests/v6.test.cjs tests/http.test.cjs
git diff --check
```

Os testes verificam HTML/links/ARIA, mensagens do WhatsApp, consentimento,
eventos, demos e execução do motor em DOM/Canvas simulado. O teste HTTP serve
as quatro páginas e todos os assets referenciados. Esses testes não medem
overflow renderizado, Web Vitals ou comportamento de um smartphone físico.

## Publicação

O conteúdo de `dist/` deve ser servido como raiz, incluindo as subpastas das
páginas, `css/`, `js/` e `fonts/`. A publicação é responsabilidade do Diretor,
mediante autorização humana. Este trabalho não faz push ou deploy.

O arquivo `.openai/hosting.json` mantém a configuração e a identidade do Site original no ChatGPT. Ele não é necessário em outras hospedagens.

## Estrutura e manutenção

- `dist/index.html`, `dist/linha-de-frente/index.html` e `dist/balcao-digital/index.html`: copy final com delta LF aplicado, links e marcação das interações.
- `dist/privacidade/index.html`: inserir o fragmento no marcador `<!-- PRIVACIDADE:CONTEUDO -->`; os estilos `.nx-legal` já estão disponíveis.
- `dist/css/variables.css`, `base.css`, `motion.css`: sistema visual existente, preservado.
- `dist/css/v6.css`, `consent.css`: componentes e consentimento.
- `dist/js/interactions.js`: motor e formações narrativas compartilhadas.
- `dist/js/content.js`: textos fictícios das demos.
- `dist/js/experience.js`: seletor de dores, demos e chat simulado.
- `dist/js/whatsapp.js`: mensagens e URLs por origem; os links HTML já funcionam sem JavaScript.
- `dist/js/consent.js`: escolhas e carregamento condicional do Meta Pixel.
- `dist/js/track.js`: eventos com gate de consentimento.
- `dist/fonts/`: fonte Inter local e licença.
- `tests/`, `tools/serve.cjs`: QA sem dependências externas.
- `design/V6.md`: decisões, contrato do motor e limites de validação.

Medição escreve apenas em `window.dataLayer` após autorização; nenhum provedor de
analytics adicional está configurado. O Meta Pixel e `fbq trackCustom` dependem
da escolha de marketing. O rodapé reabre as preferências em todas as páginas.
