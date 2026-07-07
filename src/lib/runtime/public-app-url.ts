export function getPublicAppUrl(): string {
  const explicit = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (explicit) {
    return explicit;
  }

  const vercelUrl = normalizeBaseUrl(process.env.VERCEL_URL);
  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }

  const publicVercelUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_VERCEL_URL);
  if (publicVercelUrl) {
    return publicVercelUrl.startsWith('http') ? publicVercelUrl : `https://${publicVercelUrl}`;
  }

  return 'https://www.kakunin.ai';
}

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}
