const fs = require('fs');
const path = require('path');

const apiKey = process.env.PLANE_API_KEY;
const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;
const projectId = process.env.PLANE_PROJECT_ID;
const baseUrl = process.env.PLANE_BASE_URL || 'https://api.plane.so';

const markdownPath = path.join(__dirname, '../Marketing/marketing_backlog.md');
if (!fs.existsSync(markdownPath)) {
  console.error(`Error: Backlog file not found at ${markdownPath}`);
  process.exit(1);
}

const content = fs.readFileSync(markdownPath, 'utf8');

// Parse issues from markdown
const issues = [];
const taskBlocks = content.split(/\n\*\s+\*\*Task /);

for (let i = 1; i < taskBlocks.length; i++) {
  const block = taskBlocks[i];
  
  // Extract key/id (e.g. KAK-M1: EU AI Act Whitepaper)
  const firstLineEnd = block.indexOf('\n');
  if (firstLineEnd === -1) continue;
  const firstLine = block.substring(0, firstLineEnd).trim();
  const idMatch = firstLine.match(/^(KAK-M\d+):\s*(.*)/);
  if (!idMatch) continue;
  const taskId = idMatch[1];
  
  // Extract fields using matches
  const titleMatch = block.match(/\*\s+\*\*Title\*\*:\s*(.*)/i);
  const descMatch = block.match(/\*\s+\*\*Description\*\*:\s*(.*)/i);
  const priorityMatch = block.match(/\*\s+\*\*Priority\*\*:\s*(.*)/i);
  const stateMatch = block.match(/\*\s+\*\*State\*\*:\s*(.*)/i);
  const labelsMatch = block.match(/\*\s+\*\*Labels\*\*:\s*(.*)/i);
  
  const title = titleMatch ? titleMatch[1].trim() : `${taskId}: ${idMatch[2].trim()}`;
  const description = descMatch ? descMatch[1].trim() : '';
  const priority = priorityMatch ? priorityMatch[1].trim().toLowerCase() : 'medium';
  const state = stateMatch ? stateMatch[1].trim() : 'Backlog';
  const labels = labelsMatch ? labelsMatch[1].split(',').map(l => l.trim()) : [];
  
  issues.push({
    taskId,
    title,
    description,
    priority,
    state,
    labels
  });
}

console.log(`[Plane Sync] Parsed ${issues.length} tasks from marketing_backlog.md:\n`);
issues.forEach(issue => {
  console.log(`- [${issue.taskId}] ${issue.title}`);
  console.log(`  Priority: ${issue.priority} | State: ${issue.state} | Labels: ${issue.labels.join(', ')}`);
  console.log(`  Description: ${issue.description}\n`);
});

if (!apiKey || !workspaceSlug || !projectId) {
  console.log('----------------------------------------------------');
  console.log('                 DRY RUN COMPLETE                   ');
  console.log('----------------------------------------------------');
  console.log('To synchronize these issues with your Plane.so account,');
  console.log('please set the following environment variables:');
  console.log('  export PLANE_API_KEY="your-api-key"');
  console.log('  export PLANE_WORKSPACE_SLUG="your-workspace-slug"');
  console.log('  export PLANE_PROJECT_ID="your-project-id"');
  console.log('\nThen run:');
  console.log('  node scripts/plane-sync.js');
  console.log('----------------------------------------------------\n');
  process.exit(0);
}

console.log(`[Plane Sync] Starting sync for ${issues.length} issues...`);

async function sync() {
  for (const issue of issues) {
    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/`;
    console.log(`[Plane Sync] Pushing task ${issue.taskId}...`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: issue.title,
          description: issue.description,
          priority: issue.priority,
          is_draft: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Plane Sync] Success! Created ${issue.taskId} in Plane. ID: ${data.id}`);
      } else {
        const errText = await response.text();
        console.error(`[Plane Sync] Failed to sync ${issue.taskId} (HTTP ${response.status}): ${errText}`);
      }
    } catch (err) {
      console.error(`[Plane Sync] Error syncing ${issue.taskId}:`, err.message);
    }
  }
  console.log('[Plane Sync] Sync operations completed.');
}

sync();
