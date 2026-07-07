import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    // Syntax highlighting via Shiki (bundled in fumadocs-mdx)
    remarkPlugins: [],
    rehypePlugins: [],
  },
});
