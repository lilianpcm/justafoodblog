// Vale para todos os posts desta pasta (perguntas ligadas a uma condição): layout e endereço /<nome-do-arquivo>/
export default {
  layout: "layouts/post.njk",
  type: "post",
  eleventyComputed: {
    // rascunho: sem layout (nao renderiza a pagina nem quebra o build)
    layout: (data) => (data.catalog?.posts?.find?.((p) => p.slug === data.page.fileSlug) ? data.layout : false),
    permalink: (data) => {
      const post = data.catalog?.posts?.find?.((p) => p.slug === data.page.fileSlug);
      return post ? post.url : false;
    },
  },
};
