/**
 * AgentMail Client
 *
 * Thin wrapper for the AgentMail REST API.
 * Base URL: https://api.agentmail.to/v0
 *
 * Key flows:
 *   provisionInbox() → POST /inboxes → returns email address
 *   sendReply()      → POST /inboxes/:id/messages/:id/reply
 *
 * @see https://docs.agentmail.to
 */

const BASE_URL = 'https://api.agentmail.to/v0';

function getApiKey(): string {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) throw new Error('AGENTMAIL_API_KEY not configured');
  return key;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AgentMail API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

export interface InboxResponse {
  pod_id: string;
  inbox_id: string;
  email: string;
  display_name: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProvisionInboxOptions {
  /** Idempotency key — use agent ID to prevent double-provisioning on retry */
  clientId: string;
  displayName: string;
  /** Optional username prefix — defaults to auto-generated */
  username?: string;
}

/**
 * Provision a new AgentMail inbox for an AI agent.
 * Uses agent ID as client_id for idempotency — safe to retry.
 *
 * @returns Inbox details including the email address to store on the agent record
 */
export async function provisionInbox(options: ProvisionInboxOptions): Promise<InboxResponse> {
  return request<InboxResponse>('/inboxes', {
    method: 'POST',
    body: JSON.stringify({
      display_name: options.displayName,
      client_id: options.clientId,
      ...(options.username ? { username: options.username } : {}),
    }),
  });
}

export interface SendReplyOptions {
  inboxId: string;
  messageId: string;
  text: string;
  html?: string;
}

/**
 * Send a reply to an inbound message via AgentMail.
 * Auto-sets In-Reply-To and References headers for proper threading.
 */
export async function sendReply(options: SendReplyOptions): Promise<{ message_id: string; thread_id: string }> {
  return request(`/inboxes/${options.inboxId}/messages/${options.messageId}/reply`, {
    method: 'POST',
    body: JSON.stringify({
      text: options.text,
      ...(options.html ? { html: options.html } : {}),
    }),
  });
}
