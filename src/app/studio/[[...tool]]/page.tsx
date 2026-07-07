'use client';

import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity.config';

// Force dynamic — Studio must not be statically generated
export const dynamic = 'force-dynamic';

export default function StudioPage() {
  return <NextStudio config={config} />;
}
