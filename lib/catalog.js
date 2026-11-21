// Lê os arquivos de conteúdo (condições, posts, páginas de loja, categorias), confere se
// estão completos e monta o "catálogo" que os templates usam para ligar tudo.
// Se algo estiver errado, o build para com uma mensagem em português.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const SRC = path.resolve("src");
const IMG = path.join(SRC, "assets", "img");

// Um placeholder é um texto entre colchetes começando em MAIÚSCULAS: [POST TITLE]
export const PLACEHOLDER = /\[[A-Z][A-Z0-9 ]{2,}[^\]]*\](?!\()/;
export const hasPlaceholder = (...parts) => PLACEHOLDER.test(parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p ?? ""))).join("\n"));

// Palavras proibidas no site (branding_alimentos.md: sem promessas)
const PROMISES = /\b(relief|relieve|heal|healing|detox|cure|cures|cured)\b/i;

const json = (f) => JSON.parse(fs.readFileSync(path.join(SRC, "_data", f), "utf8"));

function loadDir(dir) {
  const full = path.join(SRC, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort()
    .map((f) => {
      const parsed = matter(fs.readFileSync(path.join(full, f), "utf8"));
      return { file: `${dir}/${f}`, slug: f.replace(/\.md$/, ""), data: parsed.data, body: parsed.content };
    });
}

const isText = (v) => typeof v === "string" && v.trim().length > 0;
const isList = (v) => Array.isArray(v) && v.length > 0;

export function buildCatalog() {
  const site = json("site.json");
  const cats = json("categories.json");
  const catKeys = cats.map((c) => c.key);
  const errors = [];
  const warnings = [];
  const err = (file, msg) => errors.push(`${file}: ${msg}`);
  const showDrafts = !!process.env.DRAFTS;
  const usedSlugs = new Map(); // condições e posts dividem a raiz do site (/<slug>/)

  const needText = (item, fields) => {
    for (const f of fields) {
      const v = item.data[f];
      if (Array.isArray(v)) err(item.file, `o campo "${f}" precisa estar entre aspas (ex.: ${f}: "[TEXTO]"). Sem aspas, os colchetes viram lista.`);
      else if (!isText(v)) err(item.file, `falta o campo "${f}".`);
    }
  };
  const needList = (item, fields) => {
    for (const f of fields) if (!isList(item.data[f])) err(item.file, `o campo "${f}" precisa ter pelo menos 1 item.`);
  };
  const needCategory = (item) => {
    if (!catKeys.includes(item.data.category)) err(item.file, `categoria "${item.data.category}" não existe. Use uma destas: ${catKeys.join(", ")}.`);
  };
  const needSources = (item) => {
    needList(item, ["sources"]);
    for (const s of item.data.sources || []) if (!isText(s?.name) || !isText(s?.url)) err(item.file, `cada fonte em "sources" precisa de "name" e "url".`);
  };
  const needImage = (item, rel, label) => {
    if (!isText(rel)) return err(item.file, `falta a imagem "${label}".`);
    if (!fs.existsSync(path.join(IMG, rel))) err(item.file, `a imagem "${rel}" (${label}) não existe em src/assets/img/.`);
  };
  const needFaq = (item) => {
    for (const q of item.data.faq || []) if (!isText(q?.q) || !isText(q?.a)) err(item.file, `cada item de "faq" precisa de "q" (pergunta) e "a" (resposta).`);
  };
  const needDates = (item) => {
    if (!(item.data.date instanceof Date)) err(item.file, `falta a data ("date"), no formato 2026-11-30.`);
    if (item.data.updated && !(item.data.updated instanceof Date)) err(item.file, `"updated" precisa estar no formato 2026-11-30.`);
  };
  const noPromises = (item) => {
    const { sources, ...rest } = item.data;
    const m = (JSON.stringify(rest) + "\n" + item.body).match(PROMISES);
    if (m) err(item.file, `usa a palavra "${m[0]}". O site não faz promessas (relief, heal, detox, cure): reescreva em tom factual.`);
  };
  const claimSlug = (item) => {
    if (usedSlugs.has(item.slug)) err(item.file, `o endereço /${item.slug}/ já é usado por ${usedSlugs.get(item.slug)}.`);
    usedSlugs.set(item.slug, item.file);
  };
  const keywords = new Map();
  const claimKeyword = (item) => {
    if (!isText(item.data.keyword)) return;
    const k = item.data.keyword.trim().toLowerCase();
    if (!hasPlaceholder(k) && keywords.has(k)) err(item.file, `a keyword "${item.data.keyword}" já é usada em ${keywords.get(k)}. Cada página precisa de uma keyword só dela.`);
    keywords.set(k, item.file);
  };
  const longDescription = (item) => {
    const d = item.data.description;
    if (isText(d) && !hasPlaceholder(d) && d.length > 160) warnings.push(`${item.file}: a "description" tem ${d.length} caracteres (o ideal é até 160).`);
  };

  // ---------- páginas de loja (uma por condição) ----------
  const products = {};
  for (const it of loadDir("products")) {
    const d = it.data;
    needText(it, ["name", "condition_name", "etsy_url", "description"]);
    needCategory(it);
    needList(it, ["listings"]);
    needFaq(it);
    noPromises(it);
    needImage(it, d.cover, "cover");
    for (const l of d.listings || []) {
      if (!isText(l?.name) || !isText(l?.etsy_url)) err(it.file, `cada item de "listings" precisa de "name" e "etsy_url".`);
      if (l?.image) needImage(it, l.image, `listings: ${l.name}`);
      if (!isList(l?.includes)) err(it.file, `a listing "${l?.name}" precisa de "includes" (o que vem no arquivo).`);
    }
    if (d.draft && !showDrafts) continue;
    const placeholder = hasPlaceholder(d, it.body);
    products[it.slug] = { ...d, slug: it.slug, url: `/shop/${it.slug}/`, placeholder, indexable: d.index === true && !placeholder, conditions: [] };
  }

  // ---------- páginas de condição ("Foods to eat and avoid with ...") ----------
  const conditions = [];
  for (const it of loadDir("conditions")) {
    const d = it.data;
    if (d.type) err(it.file, `não use o campo "type" na página de condição.`);
    needText(it, ["title", "description", "keyword", "condition_name", "answer", "card_image"]);
    needCategory(it);
    needDates(it);
    needSources(it);
    needList(it, ["faq"]);
    needFaq(it);
    noPromises(it);
    claimSlug(it);
    claimKeyword(it);
    longDescription(it);
    needImage(it, d.card_image, "card_image");
    const s = d.sample || {};
    for (const col of ["eat", "limit", "avoid"]) {
      if (!isList(s[col])) err(it.file, `"sample.${col}" precisa ter pelo menos 1 alimento (amostra tirada da seleção do pipeline).`);
      for (const f of s[col] || []) {
        if (!isText(f?.name)) err(it.file, `cada alimento em "sample.${col}" precisa de "name".`);
        if (col === "limit" && !isText(f?.portion)) err(it.file, `"${f?.name}" (sample.limit) precisa de "portion", como no food list.`);
        if (f?.image) needImage(it, f.image, `sample.${col}: ${f.name}`);
      }
    }
    if (d.sample_total && !Number.isInteger(d.sample_total)) err(it.file, `"sample_total" precisa ser um número inteiro (total de alimentos do food list).`);
    if (!isText(d.product)) err(it.file, `falta o campo "product" (a página de loja desta condição).`);
    else if (!products[d.product]) err(it.file, `cita a página de loja "${d.product}", que não existe em src/products/.`);
    for (const x of d.exercise_links || []) if (!isText(x?.name) || !isText(x?.url) || !x.url.startsWith("https://www.exercisenono.com/")) err(it.file, `"exercise_links" só aceita páginas do exercisenono (name + url https://www.exercisenono.com/...).`);
    if (d.draft && !showDrafts) continue;
    let placeholder = hasPlaceholder(d, it.body);
    const prod = products[d.product];
    if (prod) {
      prod.conditions.push(it.slug);
      if (prod.placeholder) placeholder = true; // CTA com placeholder não vai para o Google
    }
    conditions.push({ ...d, slug: it.slug, file: it.file, url: `/${it.slug}/`, placeholder, indexable: !placeholder && d.index !== false });
  }

  // ---------- posts (perguntas: "Is coffee OK with GERD?") ----------
  const posts = [];
  for (const it of loadDir("posts")) {
    const d = it.data;
    needText(it, ["title", "description", "keyword", "condition"]);
    needCategory(it);
    needDates(it);
    needSources(it);
    needFaq(it);
    noPromises(it);
    claimSlug(it);
    claimKeyword(it);
    longDescription(it);
    if (d.draft && !showDrafts) continue;
    posts.push({ ...d, slug: it.slug, file: it.file, url: `/${it.slug}/`, placeholder: hasPlaceholder(d, it.body) });
  }
  for (const p of posts) {
    const cond = conditions.find((c) => c.slug === p.condition);
    if (!cond) err(p.file, `"condition" cita a página "${p.condition}", que não existe em src/conditions/.`);
    else if (cond.placeholder) p.placeholder = true;
    p.indexable = !p.placeholder && p.index !== false;
  }

  // ---------- receitas (só contagem por enquanto; as páginas entram depois) ----------
  const recipes = loadDir("recipes").filter((it) => !(it.data.draft && !showDrafts));

  for (const slug of site.home?.popular || []) if (!conditions.find((x) => x.slug === slug)) warnings.push(`site.json: "home.popular" cita a página "${slug}", que não existe (ou é rascunho).`);
  if (site.home?.printable_of_the_week && !products[site.home.printable_of_the_week]) warnings.push(`site.json: "home.printable_of_the_week" cita a página de loja "${site.home.printable_of_the_week}", que não existe.`);
  for (const c of conditions) for (const r of c.related || []) if (!conditions.find((x) => x.slug === r)) err(c.file, `"related" cita a página "${r}", que não existe.`);
  const byDate = (a, b) => ((b.updated || b.date)?.getTime?.() || 0) - ((a.updated || a.date)?.getTime?.() || 0);
  conditions.sort(byDate);
  posts.sort(byDate);

  // ---------- categorias (os 6 grupos de condição) ----------
  const pages = Object.fromEntries(loadDir("categories").map((it) => [it.data.key, it]));
  const categories = {};
  for (const c of cats) {
    const page = pages[c.key];
    if (!page) {
      err(`categories/${c.slug}.md`, `falta o arquivo da categoria "${c.name}".`);
      continue;
    }
    needText(page, ["title", "description", "intro"]);
    noPromises(page);
    const count = conditions.filter((p) => p.category === c.key).length;
    const ready = page.data.guide_ready === true;
    const status = count === 0 ? "off" : count >= site.min_conditions_per_category && ready ? "live" : "soft";
    const placeholder = hasPlaceholder(page.data, page.body);
    categories[c.key] = { ...c, ...page.data, url: `/${c.slug}/`, conditionCount: count, status, placeholder, indexable: status === "live" && !placeholder };
    if (usedSlugs.has(c.slug)) err(usedSlugs.get(c.slug), `o endereço /${c.slug}/ é o da categoria "${c.name}".`);
  }

  if (errors.length) {
    throw new Error(`\n\nERROS NO CONTEÚDO — corrija e gere o site de novo:\n\n - ${errors.join("\n - ")}\n`);
  }

  const productList = Object.values(products);
  const catList = cats.map((c) => categories[c.key]);
  return {
    categories,
    catList,
    liveCats: catList.filter((c) => c.status === "live"),
    conditions,
    posts,
    recipes,
    products,
    productList,
    warnings,
    counts: {
      indexableProducts: productList.filter((p) => p.indexable).length,
      recipes: recipes.length,
    },
  };
}
