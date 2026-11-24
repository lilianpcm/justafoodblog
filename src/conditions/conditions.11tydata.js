// Vale para todas as páginas de condição desta pasta: layout e endereço /<nome-do-arquivo>/
export default {
  layout: "layouts/condition.njk",
  type: "condition",
  eleventyComputed: {
    // rascunho: sem layout (nao renderiza a pagina nem quebra o build)
    layout: (data) => (data.catalog?.conditions?.find?.((p) => p.slug === data.page.fileSlug) ? data.layout : false),
    permalink: (data) => {
      const c = data.catalog?.conditions?.find?.((p) => p.slug === data.page.fileSlug);
      return c ? c.url : false; // rascunho (draft: true) não é publicado
    },
  },
};
