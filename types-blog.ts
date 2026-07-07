/**
 * Blog Types
 *
 * TypeScript interfaces for blog content from Sanity CMS
 */

export interface Slug {
  current: string;
}

export interface Post {
  _id: string;
  title: string;
  slug: Slug;
  excerpt: string;
  content?: unknown; // RichText or portable text
  publishedAt: string;
  author: string;
  tags?: string[];
  featured?: boolean;
  _createdAt?: string;
  _updatedAt?: string;
}

export interface BlogListQuery {
  posts: Post[];
  total: number;
}
