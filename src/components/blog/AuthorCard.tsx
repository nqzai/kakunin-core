/**
 * AuthorCard — Blog post byline
 *
 * Slim author name + publish date. Rendered on blog post detail pages.
 * Minimal design — name + date only. No avatars or bios yet.
 */

interface AuthorCardProps {
  author: string;
  publishedAt: string;
}

export function AuthorCard({ author, publishedAt }: AuthorCardProps) {
  const date = new Date(publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      style={{
        borderTop: '1px solid var(--paper-edge)',
        paddingTop: '32px',
        marginTop: '48px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: '4px',
          }}
        >
          {author}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--ink-2)',
          }}
        >
          Published {date}
        </div>
      </div>
    </div>
  );
}
