import { groq } from 'next-sanity';

export const BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    author,
    image,
    content
  }
`;

export const BLOG_POST_QUERY = groq`
  *[_type == "blogPost" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    author,
    image,
    tags,
    content,
    "relatedPosts": *[
      _type == "blogPost" &&
      !(_id in path("drafts.**")) &&
      slug.current != ^.slug.current &&
      count(tags[@ in ^.tags]) > 0
    ] | order(count(tags[@ in ^.tags]) desc, publishedAt desc) [0..2] {
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      author,
      image
    }
  }
`;

export const BLOG_SLUGS_QUERY = groq`
  *[_type == "blogPost" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    "slug": slug.current,
    publishedAt
  }
`;
