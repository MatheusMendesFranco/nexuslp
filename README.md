# Nexus — Home viva refinada

Site institucional da Nexus Soluções Digitais, com fundo animado em Canvas2D, transições ligadas à rolagem, layout responsivo e contato via WhatsApp.

**Site publicado:** https://nexus-home-viva-refinada.slbr-nexus.chatgpt.site

## Abrir localmente

O projeto usa HTML, CSS e JavaScript, sem instalação de dependências ou etapa de build.

1. Extraia o ZIP ou clone este repositório.
2. Na pasta do projeto, execute:

```sh
python3 -m http.server 8080 --directory dist
```

3. Abra http://localhost:8080 no navegador.

Também é possível abrir `dist/index.html` diretamente para visualizar a página.

## Hospedar

Em uma hospedagem estática, publique **o conteúdo de `dist/`** na raiz do site, mantendo as pastas `css/`, `js/` e `fonts/`. Na Hostinger, esse conteúdo vai em `public_html/`.

O arquivo `.openai/hosting.json` mantém a configuração e a identidade do Site original no ChatGPT. Ele não é necessário em outras hospedagens.

## Estrutura

- `dist/index.html`: conteúdo, navegação, metadados e CTAs.
- `dist/css/`: cores, tipografia, layout responsivo e estilos de animação.
- `dist/js/interactions.js`: interatividade, formações do fundo e renderização Canvas2D.
- `dist/fonts/`: fonte Inter local e sua licença SIL Open Font License.
- `design/`: registros dos ajustes recentes e seus limites de verificação.

## Versão exportada

Código da versão 5 publicada no Sites: copy revisada em linguagem simples e seção sobre a Nexus dedicada ao que entregamos. O design, as animações e a correção de renderização no smartphone foram preservados.

Commit de origem: `067f70dabf78fc2501f30420d31e76c28c1078ea`.

Atualizado em 20/10/2026. Os arquivos do site são idênticos aos desse commit; este README e o `.gitignore` foram acrescentados para facilitar o uso do repositório.
