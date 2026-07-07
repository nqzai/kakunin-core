import { PostCard } from './PostCard';
import type { Post, ImageData } from '@/types/blog';

export interface PostWithImage extends Post {
  image?: ImageData;
}

interface PostListProps {
  posts: PostWithImage[];
}

export function PostList({ posts }: PostListProps) {
  if (!posts || posts.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-8 py-16 md:px-12 lg:px-16">
        <p className="text-center text-lg text-kakunin-body">
          No posts found. Check back soon!
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-8 py-20 md:px-12 lg:px-16">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            title={post.title}
            excerpt={post.excerpt}
            author={post.author || 'Kakunin Team'}
            publishedAt={post.publishedAt}
            slug={post.slug.current}
            image={post.image}
          />
        ))}
      </div>
    </section>
  );
}
