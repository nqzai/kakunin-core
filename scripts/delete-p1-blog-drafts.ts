import { sanityClient } from '../src/lib/sanity/client.js';

const draftIds = [
  'pNaApvmgigXZY78h7nyn9h', // Know Your Agent
  'pNaApvmgigXZY78h7nynDB', // MiCA Case Study
];

async function deleteDrafts() {
  for (const id of draftIds) {
    try {
      await sanityClient.delete(id);
      console.log(`✅ Deleted draft: ${id}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${id}:`, error);
    }
  }
}

deleteDrafts().catch(console.error);
