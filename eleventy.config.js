// Configuração do Eleventy para o site Just A Food Blog.
import fs from "node:fs";
import path from "node:path";
import { buildCatalog } from "./lib/catalog.js";
import { schemaFor } from "./lib/schema.js";
import * as h from "./lib/helpers.js";

export default async function (eleventyConfig) {
  await h.scanImages();
  const site = JSON.parse(fs.readFileSync("src/_data/site.json", "utf8"));
  const catalog = buildCatalog(); // confere o conteúdo; para com erro em português se algo faltar
  const assets = { css: h.buildCss(), js: h.buildJs() };
  const redirects = h.redirectRules(h.parseCsv(fs.readFileSync("src/_data/redirects.csv", "utf8")));

  eleventyConfig.addGlobalData("catalog", catalog);
  eleventyConfig.addGlobalData("assets", assets);
  eleventyConfig.addGlobalData("redirects", redirects);
  eleventyConfig.addGlobalData("buildDate", new Date());

  // disponíveis dentro dos componentes (macros)
  for (const [name, value] of Object.entries({
    site,
    catalog,
    icon: h.icon,
    img: h.img,
    imgUrl: h.imgUrl,
    shareUrl: h.shareUrl,
    etsy: (url, campaign, content) => h.etsyUrl(site, url, campaign, content),
    longDate: h.longDate,
    isoDate: h.isoDate,
  })) eleventyConfig.addNunjucksGlobal(name, value);

  eleventyConfig.addFilter("longDate", h.longDate);
  eleventyConfig.addFilter("isoDate", h.isoDate);
  eleventyConfig.addFilter("rfc822", h.rfc822);
  eleventyConfig.addFilter("pad2", (n) => String(n).padStart(2, "0"));
  eleventyConfig.addFilter("xml", (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[^\x00-\x7F]/gu, (c) => "&#" + c.codePointAt(0) + ";"));
  // ^ acentos e travessões viram códigos (&#8212;): o feed e o sitemap ficam certos mesmo se o servidor não avisar que o arquivo é UTF-8
  eleventyConfig.addFilter("firstOfCategory", (list, key) => (list || []).find((x) => x.category === key) || {});
  eleventyConfig.addFilter("sitemapImages", (item) => {
    const d = item.data;
    const out = [];
    if (d.type === "condition") out.push(d.card_image, ...["eat", "limit", "avoid"].flatMap((k) => (d.sample?.[k] || []).map((f) => f.image)));
    if (d.type === "product") out.push(d.cover, ...(d.listings || []).map((l) => l.image));
    return [...new Set(out.filter(Boolean))].map((rel) => h.imgUrl(rel));
  });
  eleventyConfig.addShortcode("schema", function () {
    return schemaFor(this.ctx);
  });

  eleventyConfig.addPassthroughCopy({ "src/assets/fonts": "assets/fonts", "src/assets/brand": "assets/brand", "src/api": "api", "src/free": "free" });
  eleventyConfig.addPassthroughCopy({ "src/assets/brand/favicon.ico": "favicon.ico" });
  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  // começa sempre de uma pasta _site limpa (sem arquivos velhos de builds anteriores)
  eleventyConfig.on("eleventy.before", () => fs.rmSync("_site", { recursive: true, force: true }));

  eleventyConfig.on("eleventy.after", async () => {
    await h.writeImages();
    // destino de cada 301 precisa existir no site gerado
    const missing = redirects.targets.filter((t) => !fs.existsSync(path.join("_site", t, "index.html")) && !fs.existsSync(path.join("_site", t)));
    if (missing.length) {
      console.error(`\nERRO em redirects.csv — estes destinos (new_path) não existem no site:\n - ${missing.join("\n - ")}\n`);
      process.exitCode = 1;
    }
    for (const w of catalog.warnings) console.warn(`AVISO: ${w}`);
    const ph = [...catalog.conditions, ...catalog.posts, ...catalog.productList, ...catalog.catList.filter((c) => c.status !== "off")].filter((x) => x.placeholder);
    if (ph.length) console.warn(`\nAVISO: ${ph.length} página(s) de conteúdo ainda têm [PLACEHOLDER] e saem com noindex e fora do sitemap:\n - ${ph.map((x) => x.url).join("\n - ")}`);
    if (redirects.pending.length) console.warn(`AVISO: ${redirects.pending.length} URL(s) antiga(s) em redirects.csv ainda estão como "pending" (dão 404).`);
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md", "11ty.js"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
