#!/usr/bin/env npx tsx
/**
 * Set up Sanity webhook for blog publish events
 * Uses Sanity Management API to create webhook
 *
 * Usage:
 *   npx tsx scripts/setup-sanity-webhook.ts <projectId> <token> <dataset>
 *
 * Example:
 *   npx tsx scripts/setup-sanity-webhook.ts "3wz2eknt" "skxxx..." "production"
 */

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    'Usage: npx tsx scripts/setup-sanity-webhook.ts <projectId> <token> <dataset>'
  );
  console.error('Get projectId from: Sanity dashboard → Settings');
  console.error(
    'Get token from: Sanity dashboard → Manage → API → Tokens (Editor role)'
  );
  process.exit(1);
}

const [projectId, token, dataset] = args;

async function createWebhook() {
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

  const apiUrl = `https://api.sanity.io/v1/projects/${projectId}/webhooks`;

  console.log('Creating Sanity webhook...');
  console.log('Project ID:', projectId);
  console.log('Dataset:', dataset);
  console.log('Webhook URL:', webhookPayload.url);
  console.log('Filter:', webhookPayload.filter);
  console.log('');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Error (${response.status}):`);
      console.error(responseText);
      process.exit(1);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Invalid JSON response:', responseText);
      process.exit(1);
    }

    console.log('✅ Webhook created successfully!');
    console.log('Webhook ID:', result._id || result.id || 'unknown');
    console.log('');
    console.log('Blog posts will now auto-index to Bing when published.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Publish a test blog post in Sanity');
    console.log('2. Check logs at https://kakunin.ai/api/internal/indexnow');
    console.log('3. Verify in Bing Search Console that URLs are indexed');
  } catch (error) {
    console.error('Failed to create webhook:', error);
    process.exit(1);
  }
}

createWebhook();
