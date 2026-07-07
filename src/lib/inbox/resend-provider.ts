/**
 * Resend fallback inbox provider.
 *
 * When AgentMail is unavailable (INBOX_PROVIDER=resend), this provider
 * assigns a deterministic alias address on Kakunin's own domain:
 *   agent-{agentId-prefix}@mail.kakunin.ai
 *
 * Inbound delivery uses Resend's inbound routing — all mail to @mail.kakunin.ai
 * is forwarded to the tenant's registered email and optionally to a webhook.
 *
 * No external API call on provision — address is deterministic from agentId.
 * This means provisioning always succeeds (no third-party dependency).
 *
 * Limitations vs AgentMail:
 *   - No per-agent threaded inbox UI
 *   - Autonomous reply not supported
 *   - All agents on one domain share inbound routing rules
 *
 * Activate with: INBOX_PROVIDER=resend
 */

import type { IInboxProvider, InboxProvisionResult } from './types';
import { log } from '@/lib/logging';

const FALLBACK_DOMAIN = process.env.RESEND_INBOUND_DOMAIN ?? 'mail.kakunin.ai';

export class ResendProvider implements IInboxProvider {
  async provision(agentId: string, agentName: string): Promise<InboxProvisionResult> {
    // Deterministic alias — first 12 chars of agent UUID
    // e.g. agent-3f7a2b1c4d5e@mail.kakunin.ai
    const prefix = agentId.replace(/-/g, '').slice(0, 12);
    const address = `agent-${prefix}@${FALLBACK_DOMAIN}`;

    log.info('[inbox.resend] Fallback inbox assigned', {
      agentId,
      agentName,
      address,
    });

    return {
      address,
      inboxId: undefined,
      provider: 'resend',
    };
  }

  async deprovision(agentId: string): Promise<void> {
    // Alias-based — nothing to delete. Inbound routing rules are shared.
    log.info('[inbox.resend] deprovision no-op for alias-based inbox', { agentId });
  }
}
