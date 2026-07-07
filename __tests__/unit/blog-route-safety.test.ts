import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('blog route safety', () => {
  it('does not allow file-based blog post routes outside the slug route', () => {
    const blogDir = join(process.cwd(), 'src', 'app', 'blog');
    const entries = readdirSync(blogDir).filter((entry) => {
      const full = join(blogDir, entry);
      return statSync(full).isDirectory();
    });

    expect(entries).toEqual(['[slug]', 'non-human-identity-scholarship']);
  });
});
