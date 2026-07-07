const apiKey = process.env.PLANE_API_KEY;
const workspaceSlug = 'kakunin';
const projectId = 'ab9b6f45-8219-40cf-a03b-2f93313f2464';
const baseUrl = 'https://api.plane.so';

const issuesToCreate = [
  {
    moduleId: 'e80c38e6-740b-4cf7-84d2-9c6f6dca15c7', // Module 1
    moduleName: 'Module 1: Customer Personas & Alignment (ICP)',
    name: 'KAK-M1.6: Define Persona - API Platform Engineer Alex (The Gatekeeper)',
    description_html: '<p><strong>Persona</strong>: Lead API / Platform Architect at high-scale API provider (Stripe, Twilio).</p><p><strong>Pain Points</strong>: Resource exhaustion from rogue loops, credential sharing, lack of transaction attribution.</p><p><strong>Value Proposition</strong>: Edge-level certificate validation and OAuth-like scope verification at the gateway.</p>',
    priority: 'high'
  },
  {
    moduleId: 'e80c38e6-740b-4cf7-84d2-9c6f6dca15c7', // Module 1
    moduleName: 'Module 1: Customer Personas & Alignment (ICP)',
    name: 'KAK-M1.7: Define Persona - Infrastructure Partner Ian (The Enabler)',
    description_html: '<p><strong>Persona</strong>: Cloud Platform Architect / DevRel Lead (Supabase, Vercel).</p><p><strong>Pain Points</strong>: Secret leaks in LLM code, lack of dynamic database RLS mapping for non-deterministic agent actions.</p><p><strong>Value Proposition</strong>: Pre-built adapters/middleware automatically mapping active agent session certificates to native Postgres database security rules (RLS).</p>',
    priority: 'high'
  },
  {
    moduleId: 'e80c38e6-740b-4cf7-84d2-9c6f6dca15c7', // Module 1
    moduleName: 'Module 1: Customer Personas & Alignment (ICP)',
    name: 'KAK-M1.8: Establish Open-Source Trust Standards & DID Method Draft',
    description_html: '<p><strong>Objective</strong>: Draft and publish a public specification defining the <code>did:kakunin</code> method. Outline how LLM weight hashes and system prompts are cryptographically bound to agent identities to build industry-wide trust.</p>',
    priority: 'high'
  },
  {
    moduleId: '8430615d-1292-4532-b412-ff661ea0edf4', // Module 4
    moduleName: 'Module 4: Inbound Marketing & DevRel',
    name: 'KAK-M4.4: Build Gateway Verification Edge Plugin (Cloudflare/Kong)',
    description_html: '<p><strong>Objective</strong>: Develop a lightweight edge middleware/plugin for Cloudflare Workers and Kong API Gateway that validates incoming agent certificates at the border before routing requests to internal service APIs.</p>',
    priority: 'high'
  },
  {
    moduleId: 'a692631b-0ab7-4c58-9f03-4b868692d39a', // Module 6
    moduleName: 'Module 6: Discovery Platforms & Directory Integrations',
    name: 'KAK-M6.5: Build Supabase RLS Dynamic Certificate Integration Adapter',
    description_html: '<p><strong>Objective</strong>: Build a dynamic adapter package that parses Kakunin agent certificates and dynamically configures Supabase Postgres Row-Level Security (RLS) policies for active sessions.</p>',
    priority: 'high'
  }
];

async function runSync() {
  console.log('=== STARTING SYNC FOR NEW STRATEGIC WORK ITEMS ===\n');

  for (const item of issuesToCreate) {
    console.log(`Processing: "${item.name}" for ${item.moduleName}`);
    const issueUrl = `${baseUrl}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/`;
    try {
      // 1. Create the work item
      const createRes = await fetch(issueUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: item.name,
          description_html: item.description_html,
          priority: item.priority,
          is_draft: false
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error(`  - Failed to create issue (HTTP ${createRes.status}): ${errText}`);
        continue;
      }

      const issueData = await createRes.json();
      console.log(`  - Created work item: "${item.name}" (ID: ${issueData.id})`);

      // 2. Link the work item to the respective Module
      const linkUrl = `${baseUrl}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${item.moduleId}/module-issues/`;
      const linkRes = await fetch(linkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          issues: [issueData.id]
        })
      });

      if (linkRes.ok) {
        console.log(`    Successfully linked to Module`);
      } else {
        const errText = await linkRes.text();
        console.error(`    Failed to link (HTTP ${linkRes.status}): ${errText}`);
      }
    } catch (err) {
      console.error(`  - Error processing issue:`, err.message);
    }
  }

  console.log('\n=== ALL NEW STRATEGIC OPERATIONS COMPLETED ===');
}

runSync();
