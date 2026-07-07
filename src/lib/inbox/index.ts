/**
 * Inbox provider factory.
 *
 * Selects the active IInboxProvider based on INBOX_PROVIDER env var.
 * Defaults to 'agentmail' — falls back to 'resend' if env var is 'resend'.
 *
 * Usage:
 *   import { getInboxProvider } from '@/lib/inbox';
 *   const provider = getInboxProvider();
 *   const result = await provider.provision(agentId, agentName);
 */

import { AgentMailProvider } from './agentmail-provider';
import { ResendProvider } from './resend-provider';
import type { IInboxProvider } from './types';

export type { IInboxProvider, InboxProvisionResult } from './types';

type ProviderName = 'agentmail' | 'resend';

/**
 * Returns the active IInboxProvider singleton.
 * Instantiated fresh per call (lightweight — no persistent connections).
 */
export function getInboxProvider(): IInboxProvider {
  const name = (process.env.INBOX_PROVIDER ?? 'agentmail') as ProviderName;

  switch (name) {
    case 'resend':
      return new ResendProvider();
    case 'agentmail':
    default:
      return new AgentMailProvider();
  }
}
