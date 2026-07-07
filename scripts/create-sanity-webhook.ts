#!/usr/bin/env npx tsx
/**
 * Create Sanity webhook for blog publish events
 * Tries multiple API endpoints to work around Sanity's undocumented webhook API
 *
 * Usage:
 *   npx tsx scripts/create-sanity-webhook.ts
 *
 * Requires env vars:
 *   - NEXT_PUBLIC_SANITY_PROJECT_ID
 *   - SANITY_API_TOKEN
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const token = process.env.SANITY_API_TOKEN;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';

if (!projectId || !token) {
  console.error('❌ Missing env vars: NEXT_PUBLIC_SANITY_PROJECT_ID and/or SANITY_API_TOKEN');
  process.exit(1);
}

const webhookPayload = {
  name: 'Blog Publish → IndexNow',
  description: 'Auto-index blog posts to Bing IndexNow when published',
  url: 'https://kakunin.ai/api/webhooks/sanity/publish',
  events: ['publish'],
  dataset,
  filter: '_type == "blogPost"',
  httpMethod: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

// Try multiple API versions — Sanity docs are unclear on which works for webhooks
const endpoints = [
  `https://api.sanity.io/v2023-12-01/projects/${projectId}/webhooks`,
  `https://api.sanity.io/v1/projects/${projectId}/webhooks`,
  `https://api.sanity.io/v2021-06-07/projects/${projectId}/webhooks`,
];

async function createWebhook() {
  console.log('🔧 Creating Sanity webhook...');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Dataset: ${dataset}`);
  console.log(`   Webhook URL: ${webhookPayload.url}`);
  console.log(`   Filter: ${webhookPayload.filter}`);
  console.log('');

  for (const endpoint of endpoints) {
    console.log(`📍 Trying endpoint: ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(webhookPayload),
      });

      const responseText = await response.text();

      if (response.ok) {
        console.log(`✅ Webhook created successfully!`);
        console.log('');

        try {
          const result = JSON.parse(responseText);
          console.log(`Webhook ID: ${result._id || result.id || 'unknown'}`);
        } catch {
          console.log('Response:', responseText);
        }

        console.log('');
        console.log('🚀 Blog posts will now auto-index to Bing when published.');
        console.log('');
        console.log('Next steps:');
        console.log('1. Publish a test blog post in Sanity');
        console.log('2. Check that Bing IndexNow receives the URL');
        console.log('3. Verify in Bing Search Console within hours');
        return;
      }

      if (response.status === 404) {
        console.log(`   ⚠️  404 — endpoint not found, trying next...`);
        continue;
      }

      console.error(`   ❌ Error ${response.status}:`);
      console.error(`   ${responseText.slice(0, 200)}`);
      console.log('');
    } catch (error) {
      console.error(`   ❌ Network error:`, error instanceof Error ? error.message : error);
      console.log('');
    }
  }

  console.error('');
  console.error('❌ All endpoints failed. Sanity webhook API may not be publicly available.');
  console.error('');
  console.error('📖 Manual setup required:');
  console.error('1. Go to: Sanity Dashboard → Manage → API → Webhooks');
  console.error('2. Click "Create new webhook"');
  console.error('3. URL: https://kakunin.ai/api/webhooks/sanity/publish');
  console.error('4. Event: Published');
  console.error('5. Filter: _type == "blogPost"');
  console.error('6. Method: POST');
  console.error('');
  console.error('See SANITY_WEBHOOK_SETUP.md for full details.');
  process.exit(1);
}

createWebhook();
