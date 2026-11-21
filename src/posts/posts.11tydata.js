// Vale para todos os posts desta pasta (perguntas ligadas a uma condição): layout e endereço /<nome-do-arquivo>/
export default {
  layout: "layouts/post.njk",
  type: "post",
  eleventyComputed: {
    permalink: (data) => {
      const post = data.catalog?.posts?.find?.((p) => p.slug === data.page.fileSlug);
      return post ? post.url : false;
    },
  },
};
