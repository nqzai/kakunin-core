import { source } from '@/lib/source';
import { customDocsSlugs } from '../custom-pages';
import { getDocsMetadata, renderDocsPage } from '../shared';

interface Props {
  params: Promise<{ slug: string[] }>;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return renderDocsPage(slug);
}

export function generateStaticParams() {
  const sourceParams = source
    .generateParams()
    .filter((params) => Array.isArray(params.slug) && params.slug.length > 0);

  const customParams = customDocsSlugs.map((slug) => ({ slug: [slug] }));

  return [...sourceParams, ...customParams];
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return getDocsMetadata(slug);
}
