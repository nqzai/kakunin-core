/**
 * IInboxProvider — abstraction over AI agent email inbox services.
 *
 * Implemented by AgentMailProvider (primary) and ResendProvider (fallback).
 * Active provider is selected by INBOX_PROVIDER env var.
 *
 * @see lib/inbox/index.ts for factory
 * @see RA-62 — AgentMail dependency risk mitigation
 */

export interface InboxProvisionResult {
  /** Full email address, e.g. my-agent@acme.kyc-ai.to */
  address: string;
  /** Provider-internal inbox identifier, if any */
  inboxId?: string;
  /** Which provider fulfilled the request */
  provider: 'agentmail' | 'resend' | 'null';
}

export interface IInboxProvider {
  /**
   * Provision an inbox for an AI agent.
   * Must be idempotent — retrying with the same agentId must not create duplicates.
   *
   * @param agentId   UUID of the agent (used as idempotency key)
   * @param agentName Human-readable display name
   * @returns Email address and provider metadata
   * @throws Error if provisioning fails — caller handles retry via QStash
   */
  provision(agentId: string, agentName: string): Promise<InboxProvisionResult>;

  /**
   * Deprovision (delete) the inbox when an agent is retired.
   * Best-effort — callers should not throw on failure.
   *
   * @param agentId UUID of the agent
   * @param inboxId Provider-internal inbox ID, if previously stored
   */
  deprovision(agentId: string, inboxId?: string): Promise<void>;
}
