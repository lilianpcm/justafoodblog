// Vale para todos os produtos desta pasta: layout e endereço /shop/<nome-do-arquivo>/
export default {
  layout: "layouts/product.njk",
  type: "product",
  eleventyComputed: {
    layout: (data) => (data.catalog?.products?.[data.page.fileSlug] ? data.layout : false),
    permalink: (data) => (data.catalog?.products?.[data.page.fileSlug] ? `/shop/${data.page.fileSlug}/` : false),
  },
};
