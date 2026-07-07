import { getDocsMetadata, renderDocsPage } from './shared';

export default async function DocsHomePage() {
  return renderDocsPage(['index']);
}

export async function generateMetadata() {
  return getDocsMetadata(['index']);
}
