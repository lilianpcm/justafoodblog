// Dados estruturados (JSON-LD) de cada tipo de página.
// Decisões: sem Product (o site não vende e o preço muda no Etsy). FAQPage fica porque sai dos mesmos dados.
import { shareUrl, isoDate, etsyUrl } from "./helpers.js";

const abs = (site, url) => (String(url).startsWith("http") ? url : site.url + url);

function org(site) {
  return {
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    url: `${site.url}/`,
    logo: { "@type": "ImageObject", url: abs(site, "/assets/brand/just-a-food-blog-512.png") },
    sameAs: [site.shop_url],
  };
}

function breadcrumbs(site, crumbs) {
  if (!crumbs?.length) return null;
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(site, c.url) })),
  };
}

function faq(items) {
  if (!items?.length) return null;
  return { "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}

export function schemaFor(data) {
  const { site, catalog, page } = data;
  if (!page?.url) return ""; // página não publicada (rascunho ou categoria sem posts)
  const url = abs(site, page.url);
  const graph = [];
  const add = (n) => n && graph.push(n);
  const kind = data.schema || data.type;

  if (kind === "home") {
    add(org(site));
    add({ "@type": "WebSite", "@id": `${site.url}/#website`, url: `${site.url}/`, name: site.name, inLanguage: site.lang, publisher: { "@id": `${site.url}/#organization` } });
  }

  const cites = (data.sources || []).map((src) => ({ "@type": "CreativeWork", name: src.name, url: src.url }));

  if (kind === "condition") {
    // Decisão (Lilian, 21/11): sem autoria pessoal; a credibilidade vem das fontes citadas.
    const images = [data.og_image ? abs(site, shareUrl(data.og_image)) : null, data.card_image ? abs(site, shareUrl(data.card_image)) : null].filter(Boolean);
    add(org(site));
    add({
      "@type": "MedicalWebPage",
      "@id": `${url}#page`,
      url,
      mainEntityOfPage: url,
      headline: data.title,
      name: data.title,
      description: data.description,
      abstract: data.answer,
      inLanguage: site.lang,
      datePublished: isoDate(data.date),
      dateModified: isoDate(data.updated || data.date),
      author: { "@id": `${site.url}/#organization` },
      publisher: { "@id": `${site.url}/#organization` },
      isPartOf: { "@id": `${site.url}/#website` },
      about: { "@type": "MedicalCondition", name: data.condition_name },
      audience: { "@type": "PeopleAudience", audienceType: "Patient" },
      image: images.length ? images : undefined,
      citation: cites,
    });
    add(faq(data.faq));
  }

  if (kind === "post") {
    add(org(site));
    add({
      "@type": "Article",
      "@id": `${url}#article`,
      mainEntityOfPage: url,
      headline: data.title,
      description: data.description,
      inLanguage: site.lang,
      datePublished: isoDate(data.date),
      dateModified: isoDate(data.updated || data.date),
      author: { "@id": `${site.url}/#organization` },
      publisher: { "@id": `${site.url}/#organization` },
      image: data.og_image ? [abs(site, shareUrl(data.og_image))] : undefined,
      citation: cites,
    });
    add(faq(data.faq));
  }

  if (kind === "category") {
    add(org(site));
    add({ "@type": "CollectionPage", "@id": `${url}#page`, url, name: data.title, description: data.description, inLanguage: site.lang, isPartOf: { "@id": `${site.url}/#website` } });
    add(faq(data.faq));
  }

  if (kind === "product") {
    // página de apresentação: quem vende é o Etsy, por isso não há Product/Offer
    const p = catalog.products[page.fileSlug];
    add({ "@type": "WebPage", "@id": `${url}#page`, url, name: data.title || data.name, description: data.description, inLanguage: site.lang, significantLink: p ? etsyUrl(site, p.etsy_url, p.slug, "schema") : undefined });
    add(faq(data.faq));
  }

  add(breadcrumbs(site, data.crumbs));
  if (!graph.length) return "";
  const jsonText = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${jsonText}</script>`;
}
