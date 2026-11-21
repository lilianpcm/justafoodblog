// Valores calculados para todas as páginas: se pode ser indexada, trilha de navegação, título e categoria.
import { hasPlaceholder } from "../../lib/catalog.js";

const safe = (fn, fallback) => (data) => {
  try {
    const v = fn(data);
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
};

function entry(d) {
  const s = d.page.fileSlug;
  if (d.type === "condition") return d.catalog.conditions.find((p) => p.slug === s);
  if (d.type === "post") return d.catalog.posts.find((p) => p.slug === s);
  if (d.type === "product") return d.catalog.products[s];
  if (d.type === "category") return d.catalog.categories[d.key];
  return undefined;
}

export default {
  // pode aparecer no Google? (sem placeholder, sem rascunho, categoria no ar, etc.)
  indexable: safe((d) => {
    if (d.noindex || d.draft) return false;
    if (["condition", "post", "product", "category"].includes(d.type)) return !!entry(d)?.indexable;
    if (hasPlaceholder(d.title, d.description, d.page.rawInput)) return false;
    if (d.type === "home" && hasPlaceholder(d.site.tagline, d.site.description, d.site.brand_line, d.site.about_blurb, d.site.home)) return false;
    if (d.type === "home" && !d.catalog.conditions.some((c) => c.indexable)) return false; // home só vai ao Google com pelo menos 1 página de condição pronta
    if (d.gate === "products") return d.catalog.counts.indexableProducts >= d.site.min_products_for_catalog;
    if (d.gate === "recipes") return d.catalog.counts.recipes >= d.site.min_recipes_for_hub;
    return true;
  }, false),

  catKey: safe((d) => (d.type === "category" ? d.key : d.category) || "none", "none"),

  crumbs: safe((d) => {
    const home = { name: "Home", url: "/" };
    const here = (name) => ({ name, url: d.page.url });
    if (d.type === "condition") {
      const c = d.catalog.categories[d.category];
      return [home, c.status !== "off" ? { name: c.name, url: c.url } : null, here(d.title)].filter(Boolean);
    }
    if (d.type === "post") {
      const cond = d.catalog.conditions.find((p) => p.slug === d.condition);
      return [home, cond ? { name: cond.condition_name, url: cond.url } : null, here(d.title)].filter(Boolean);
    }
    if (d.type === "product") return [home, { name: "Printables", url: "/shop/" }, here(d.name)];
    if (d.type === "category") return [home, here(d.catalog.categories[d.key].name)];
    if (d.crumb) return [home, here(d.crumb)];
    return [];
  }, []),

  headTitle: safe((d) => {
    const t = d.seo_title || d.title || d.name;
    if (d.type === "home") return t || d.site.name;
    return t ? `${t} | ${d.site.name}` : d.site.name;
  }, ""),

  metaDescription: safe((d) => d.description || d.site.description, ""),
};
