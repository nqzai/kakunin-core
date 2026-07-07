/**
 * AgentMail inbox provider — primary implementation of IInboxProvider.
 *
 * Wraps lib/agentmail/client.ts behind the IInboxProvider interface so the
 * provision-inbox worker does not depend directly on AgentMail internals.
 * Swap to a different provider by changing INBOX_PROVIDER env var.
 */

import { provisionInbox } from '@/lib/agentmail/client';
import type { IInboxProvider, InboxProvisionResult } from './types';
import { log } from '@/lib/logging';

export class AgentMailProvider implements IInboxProvider {
  async provision(agentId: string, agentName: string): Promise<InboxProvisionResult> {
    // agentId used as client_id — AgentMail deduplicates on this field
    const inbox = await provisionInbox({
      clientId: agentId,
      displayName: agentName,
    });

    log.info('[inbox.agentmail] Inbox provisioned', { agentId, address: inbox.email });

    return {
      address: inbox.email,
      inboxId: inbox.inbox_id,
      provider: 'agentmail',
    };
  }

  async deprovision(agentId: string, inboxId?: string): Promise<void> {
    if (!inboxId) {
      log.warn('[inbox.agentmail] deprovision called without inboxId — skipping', { agentId });
      return;
    }

    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) return;

    try {
      await fetch(`https://api.agentmail.to/v0/inboxes/${inboxId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      log.info('[inbox.agentmail] Inbox deprovisioned', { agentId, inboxId });
    } catch (err) {
      // Best-effort — log but don't throw
      log.error('[inbox.agentmail] deprovision failed', {
        agentId,
        inboxId,
        error: (err as Error).message,
      });
    }
  }
}
