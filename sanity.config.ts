import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { colorInput } from '@sanity/color-input';
import { schemaTypes } from './src/sanity/schemaTypes';

export default defineConfig({
  name: 'kakunin',
  title: 'Kakunin Blog',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  plugins: [
    structureTool(),
    // Vision = GROQ query playground — useful for debugging
    visionTool(),
    // Color input for callout boxes, colored cards, etc.
    colorInput(),
  ],
  schema: {
    types: schemaTypes,
  },
});
