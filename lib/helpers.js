// Funções de apoio dos templates: imagens, ícones, links do Etsy, CSS e .htaccess.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const SRC = path.resolve("src");
const IMG_DIR = path.join(SRC, "assets", "img");

// ---------------------------------------------------------------- imagens
// Cada imagem de src/assets/img/ sai em WebP, em vários tamanhos, com nome descritivo
// (bom para o Google Imagens) + um código curto que muda se a imagem mudar (cache longo).
const META = new Map(); // caminho relativo -> { width, height, hash }
const jobs = new Map(); // arquivo de saída -> { rel, width, format }

export async function scanImages() {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of walk(IMG_DIR)) {
    if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
    const buf = fs.readFileSync(file);
    const m = await sharp(buf).metadata();
    const rel = path.relative(IMG_DIR, file).split(path.sep).join("/");
    META.set(rel, { width: m.width, height: m.height, hash: crypto.createHash("md5").update(buf).digest("hex").slice(0, 6) });
  }
}

function variants(rel, widths, format) {
  const m = META.get(rel);
  if (!m) throw new Error(`\n\nImagem não encontrada: src/assets/img/${rel}\n`);
  let ws = widths.filter((w) => w <= m.width);
  if (!ws.length || Math.max(...widths) > m.width) ws.push(m.width); // nunca amplia além do original
  ws = [...new Set(ws)].sort((x, y) => x - y);
  const base = path.basename(rel, path.extname(rel));
  return ws.map((w) => {
    const name = `${base}-${m.hash}-${w}.${format === "jpeg" ? "jpg" : format}`;
    jobs.set(name, { rel, width: w, format });
    return { url: `/assets/img/${name}`, width: w, height: Math.round((m.height * w) / m.width) };
  });
}

/** Grava as imagens pedidas pelos templates (com cache em .cache/img para não refazer). */
export async function writeImages() {
  const cache = path.resolve(".cache", "img");
  const out = path.resolve("_site", "assets", "img");
  fs.mkdirSync(cache, { recursive: true });
  fs.mkdirSync(out, { recursive: true });
  for (const [name, job] of jobs) {
    const cached = path.join(cache, name);
    if (!fs.existsSync(cached)) {
      let pipe = sharp(path.join(IMG_DIR, job.rel)).resize({ width: job.width });
      pipe = job.format === "jpeg" ? pipe.flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }) : pipe.webp({ quality: 80 });
      await pipe.toFile(cached);
    }
    fs.copyFileSync(cached, path.join(out, name));
  }
  return jobs.size;
}

const attr = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** <img> responsivo em WebP, com width/height e lazy loading. */
export function img(rel, alt, o = {}) {
  const widths = o.widths || [320, 480, 720, 1080];
  const meta = variants(rel, widths, "webp");
  const big = meta[meta.length - 1];
  const small = meta[0];
  const a = [
    `src="${small.url}"`,
    `srcset="${meta.map((m) => `${m.url} ${m.width}w`).join(", ")}"`,
    `sizes="${o.sizes || "(min-width: 760px) 680px, 92vw"}"`,
    `width="${big.width}"`,
    `height="${big.height}"`,
    `alt="${attr(alt)}"`,
    o.eager ? `fetchpriority="high"` : `loading="lazy"`,
    `decoding="async"`,
  ];
  if (o.cls) a.push(`class="${o.cls}"`);
  if (o.extra) a.push(o.extra);
  return `<img ${a.join(" ")}>`;
}

/** URL da maior versão WebP (sitemap de imagens, schema). */
export function imgUrl(rel, widths = [320, 480, 720, 1080]) {
  const meta = variants(rel, widths, "webp");
  return meta[meta.length - 1].url;
}

/** URL de um JPEG de 1200px (Open Graph, Pinterest, RSS). */
export function shareUrl(rel) {
  const meta = variants(rel, [1200], "jpeg");
  return meta[meta.length - 1].url;
}

// ---------------------------------------------------------------- ícones (Lucide)
const iconCache = new Map();
export function icon(name, cls = "") {
  if (!iconCache.has(name)) {
    const file = path.resolve("node_modules/lucide-static/icons", `${name}.svg`);
    if (!fs.existsSync(file)) throw new Error(`\n\nÍcone Lucide "${name}" não existe. Veja os nomes em lucide.dev/icons\n`);
    const svg = fs
      .readFileSync(file, "utf8")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+class="[^"]*"/, "")
      .replace(/\s+/g, " ")
      .trim();
    iconCache.set(name, svg);
  }
  return iconCache.get(name).replace("<svg ", `<svg class="icon ${cls}" aria-hidden="true" focusable="false" `);
}

// ---------------------------------------------------------------- Etsy
export function etsyUrl(site, url, campaign, content) {
  const base = /^https?:\/\//.test(url || "") ? url : site.shop_url;
  const u = new URL(base);
  u.searchParams.set("utm_source", site.utm.source);
  u.searchParams.set("utm_medium", site.utm.medium);
  u.searchParams.set("utm_campaign", campaign || "site");
  if (content) u.searchParams.set("utm_content", content);
  return u.toString();
}

// ---------------------------------------------------------------- datas
export const isoDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : "");
export const longDate = (d) => (d instanceof Date ? d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "");
export const rfc822 = (d) => (d instanceof Date ? d.toUTCString() : "");

// ---------------------------------------------------------------- CSS (tokens + arquivos)
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

export function buildCss() {
  const tokens = JSON.parse(fs.readFileSync(path.join(SRC, "_data", "tokens.json"), "utf8"));
  const cats = JSON.parse(fs.readFileSync(path.join(SRC, "_data", "categories.json"), "utf8"));
  const color = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value]));
  const vars = [];
  for (const [k, v] of Object.entries(color)) if (!k.startsWith("figure-")) vars.push(`--${k}:${v}`);
  for (const t of [...tokens.spacing.tokens, ...tokens.radius.tokens]) vars.push(`--${t.name}:${t.value}`);
  vars.push(`--font-sans:${tokens.type.families.sans}`, `--font-display:${tokens.type.families.display}`);
  let css = `:root{${vars.join(";")};--accent:var(--navy);--pill:var(--paper-alt);--on-accent:#FFFFFF;--label-bg:var(--navy);--label-ink:#FFFFFF}\n`;
  const navy = color.navy;
  for (const c of cats) {
    const accent = color[`${c.key}-accent`];
    const pill = color[`${c.key}-pill`];
    // texto sobre a cor de destaque: branco ou navy, o que tiver mais contraste
    const onAccent = contrast("#FFFFFF", accent) >= contrast(navy, accent) ? "#FFFFFF" : navy;
    // etiqueta pequena: usa o destaque só se o texto passar de 4,5:1; senão usa a cor da pílula com texto escuro
    const labelOk = contrast(onAccent, accent) >= 4.5;
    const ink = color[`${c.key}-ink`];
    css += `[data-category="${c.key}"]{--accent:${accent};--pill:${pill};--pill-ink:${ink};--on-accent:${onAccent};--label-bg:${labelOk ? accent : pill};--label-ink:${labelOk ? onAccent : ink}}\n`;
  }
  const dir = path.join(SRC, "assets", "css");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".css")).sort()) css += fs.readFileSync(path.join(dir, f), "utf8") + "\n";
  css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  return { content: css, hash: crypto.createHash("md5").update(css).digest("hex").slice(0, 8) };
}

export function buildJs() {
  const content = fs.readFileSync(path.join(SRC, "assets", "js", "site.js"), "utf8");
  return { content, hash: crypto.createHash("md5").update(content).digest("hex").slice(0, 8) };
}

// ---------------------------------------------------------------- redirecionamentos (.htaccess)
export function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const cells = [];
    let cur = "";
    let quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) {
        cells.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ""])));
}

export function redirectRules(rows) {
  const out = [];
  const pending = [];
  const errors = [];
  for (const r of rows) {
    const status = (r.status || "").toLowerCase();
    if (!r.old_path?.startsWith("/")) {
      errors.push(`redirects.csv: "${r.old_path}" precisa começar com "/".`);
      continue;
    }
    // o Apache compara com o caminho já decodificado (%20 vira espaço)
    const decoded = decodeURIComponent(r.old_path.slice(1)).replace(/\/$/, ""); // a barra final vira opcional no "/?$"
    const pattern = decoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\ ");
    if (status === "301") {
      if (!r.new_path?.startsWith("/")) errors.push(`redirects.csv: a linha "${r.old_path}" é 301 mas está sem "new_path" (ex.: /stretching/).`);
      else out.push(`RewriteRule ^${pattern}/?$ ${r.new_path} [R=301,L]`);
    } else if (status === "410") out.push(`RewriteRule ^${pattern}/?$ - [G,L]`);
    else if (status === "pending" || status === "") pending.push(r.old_path);
    else errors.push(`redirects.csv: status "${r.status}" não existe. Use 301, 410 ou pending.`);
  }
  if (errors.length) throw new Error(`\n\nERROS NO MAPA DE REDIRECIONAMENTOS:\n\n - ${errors.join("\n - ")}\n`);
  return { rules: out, pending, targets: rows.filter((r) => (r.status || "") === "301").map((r) => r.new_path) };
}
