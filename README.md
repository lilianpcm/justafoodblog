# Just A Food Blog — justafoodblog.com

Site estático gerado com o Eleventy (mesma base do exercisenono.com). O conteúdo fica em arquivos `.md`, o gerador monta as páginas e o ramo `deploy` (pasta `_site/`) vai para a Hostinger sozinho pelo Git.

**Regra de ouro:** nada com `[TEXTO ENTRE COLCHETES]` aparece no Google. Página com placeholder sai com `noindex` e fica fora do sitemap, sozinha. A home só vai para o Google quando existir pelo menos 1 página de condição pronta.

Decisões e pendências do site: `C:\PrintableCurator\notas\site_alimentos.md`. Branding: `notas/branding_alimentos.md`.

## Onde fica cada coisa

| Pasta / arquivo | O que é |
| --- | --- |
| `src/conditions/` | Uma página por condição: "Foods to Eat and Avoid with …" → `/<nome-do-arquivo>/` |
| `src/posts/` | Posts de pergunta ligados a uma condição ("Is coffee OK with GERD?") → `/<nome-do-arquivo>/` |
| `src/products/` | Uma página de loja por condição, com todas as listings do Etsy → `/shop/<nome-do-arquivo>/` |
| `src/categories/` | Os 6 grupos de condição (hubs) |
| `src/pages/` | Home, Shop, Recipes, Free printable, About, Editorial policy, Disclaimer, Privacy, Contact |
| `src/assets/img/` | Imagens originais (PNG/JPG). O gerador cria os WebP |
| `src/_data/site.json` | Configurações (Google tag, verificações, blocos da home, mínimos) |
| `src/_data/categories.json` | Os 6 grupos (nome, slug, imagem). As cores ficam em `tokens.json` |
| `src/_data/redirects.csv` | Redirecionamentos do blog de receitas antigo |
| `src/api/` | Free printable com e-mail (PHP + PHPMailer). PDFs em `src/api/files/` (bloqueados) |

O nome do arquivo vira o endereço e **não muda depois de publicado**.

## Página de condição (campos)

- `title`, `description` (até 160 caracteres), `keyword` (uma por página; o build recusa repetida), `condition_name`, `category` (`reflux`, `gut`, `metabolic`, `liver`, `kidney`, `nerves`), `date`/`updated`.
- `answer`: resposta direta de 40–60 palavras (topo da página).
- `sample`: amostra `eat` / `limit` (com `portion`) / `avoid`, **tirada da seleção do pipeline**, nunca de conhecimento geral. `sample_total` = total do food list. `image` opcional por alimento (ilustração do cache).
- `product`: a página de loja da condição (`src/products/`).
- `faq` (q/a) e `sources` (name/url, pelo menos 1). `exercise_links` só para páginas do exercisenono onde o assunto cruza.
- No texto, a linha `<!--cta-->` marca onde entra a caixa do produto.
- O build recusa as palavras relief, heal, detox e cure.

Grupo entra no menu e no Google com `guide_ready: true` + 3 páginas de condição. `/shop/` indexa com 3 páginas de loja prontas (`index: true`); `/recipes/` com 6 receitas.

## Gerar e publicar

```
npm install          # só na primeira vez
npm run build        # gera _site/
npm start            # prévia em http://localhost:8080
```

Publicar = enviar `main` (fonte) e `_site/` para o ramo `deploy`. A Hostinger atualiza o `public_html` pelo webhook. Se uma mudança não aparecer: hPanel > CDN > Limpar cache.

## Free printable (e-mail)

Formulário → `api/free-printable.php` envia o link pelo hello@justafoodblog.com (SMTP da Hostinger) → link pessoal válido 30 dias (`api/download.php`). Dados privados na pasta `justafoodblog-private`, **fora** do `public_html`: `config.php` (senha, criado direto na Hostinger a partir de `src/api/lib/config.example.php`; nunca no GitHub), `subscribers.csv` e `ratelimit.json`.
