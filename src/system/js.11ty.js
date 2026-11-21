// Gera /assets/js/site.<código>.js
export default class {
  data() {
    return { permalink: (data) => `/assets/js/site.${data.assets.js.hash}.js`, eleventyExcludeFromCollections: true };
  }
  render(data) {
    return data.assets.js.content;
  }
}
