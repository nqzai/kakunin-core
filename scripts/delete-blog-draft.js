const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function deleteDraft() {
  try {
    const result = await sanityClient.delete('Mr76tkuXwTbhEkBXAUt3Vs');
    console.log('✅ Draft deleted:', result);
  } catch (error) {
    console.error('❌ Failed to delete:', error.message);
    process.exit(1);
  }
}

deleteDraft();
