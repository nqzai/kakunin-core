import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  slug: string;
  image?: {
    url: string;
    alt?: string;
  };
}

export function PostCard({
  title,
  excerpt,
  author,
  publishedAt,
  slug,
  image,
}: PostCardProps) {
  const relativeDate = formatDistanceToNow(new Date(publishedAt), {
    addSuffix: true,
  });

  return (
    <Link href={`/blog/${slug}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:ring-1 hover:ring-kakunin-accent">
        {/* Image or Placeholder */}
        <div className="relative h-48 w-full overflow-hidden bg-kakunin-subtle-bg">
          {image?.url ? (
            <Image
              src={image.url}
              alt={image.alt || title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-kakunin-subtle-bg to-kakunin-border">
              <svg
                className="h-12 w-12 text-kakunin-meta opacity-30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-3 p-6">
          {/* Title */}
          <h3 className="line-clamp-2 text-xl font-600 leading-tight text-kakunin-heading transition-colors duration-200 group-hover:text-kakunin-accent">
            {title}
          </h3>

          {/* Excerpt */}
          <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-kakunin-body">
            {excerpt}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-3 border-t border-kakunin-border pt-4">
            <div className="flex-1">
              <p className="text-xs font-500 text-kakunin-heading">{author}</p>
              <p className="text-xs text-kakunin-meta">{relativeDate}</p>
            </div>
            <span className="text-sm font-500 text-kakunin-accent transition-colors duration-200 group-hover:text-kakunin-accent-dark">
              →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
