// Páginas de categoria (pilar). Só são geradas quando a categoria tem pelo menos 1 post.
// Com menos de site.min_posts_per_category posts (ou guide_ready: false) saem com noindex e fora do menu.
export default {
  layout: "layouts/category.njk",
  type: "category",
  eleventyComputed: {
    permalink: (data) => {
      const cat = data.catalog?.categories?.[data.key];
      return cat && cat.status !== "off" ? cat.url : false;
    },
  },
};
