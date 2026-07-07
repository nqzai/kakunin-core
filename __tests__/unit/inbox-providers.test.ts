import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/agentmail/client', () => ({
  provisionInbox: vi.fn(),
}));

vi.mock('@/lib/logging', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('ResendProvider', () => {
  let ResendProvider: typeof import('@/lib/inbox/resend-provider').ResendProvider;

  beforeEach(async () => {
    const mod = await import('@/lib/inbox/resend-provider');
    ResendProvider = mod.ResendProvider;
  });

  it('generates deterministic address from agentId', async () => {
    const provider = new ResendProvider();
    const result = await provider.provision('3f7a2b1c-4d5e-6f78-9012-abcdef123456', 'Test Agent');
    expect(result.address).toBe('agent-3f7a2b1c4d5e@mail.kakunin.ai');
    expect(result.provider).toBe('resend');
    expect(result.inboxId).toBeUndefined();
  });

  it('produces same address on retry (idempotent)', async () => {
    const provider = new ResendProvider();
    const id = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';
    const first = await provider.provision(id, 'Agent 1');
    const second = await provider.provision(id, 'Agent 2');
    expect(first.address).toBe(second.address);
  });

  it('deprovision is a no-op', async () => {
    const provider = new ResendProvider();
    await expect(provider.deprovision('any-id')).resolves.toBeUndefined();
  });
});

describe('AgentMailProvider', () => {
  let AgentMailProvider: typeof import('@/lib/inbox/agentmail-provider').AgentMailProvider;
  let provisionInboxMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const clientMod = await import('@/lib/agentmail/client');
    provisionInboxMock = clientMod.provisionInbox as ReturnType<typeof vi.fn>;
    provisionInboxMock.mockReset();

    const mod = await import('@/lib/inbox/agentmail-provider');
    AgentMailProvider = mod.AgentMailProvider;
  });

  it('calls provisionInbox with agentId as clientId', async () => {
    provisionInboxMock.mockResolvedValueOnce({
      pod_id: 'pod-1',
      inbox_id: 'inbox-1',
      email: 'bot@kyc-ai.to',
      display_name: 'Bot',
      client_id: 'agent-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    const provider = new AgentMailProvider();
    const result = await provider.provision('agent-1', 'Bot');

    expect(provisionInboxMock).toHaveBeenCalledWith({
      clientId: 'agent-1',
      displayName: 'Bot',
    });
    expect(result.address).toBe('bot@kyc-ai.to');
    expect(result.inboxId).toBe('inbox-1');
    expect(result.provider).toBe('agentmail');
  });

  it('deprovision skips when inboxId missing', async () => {
    const provider = new AgentMailProvider();
    await expect(provider.deprovision('agent-1')).resolves.toBeUndefined();
  });

  it('deprovision calls DELETE on agentmail API', async () => {
    const savedKey = process.env.AGENTMAIL_API_KEY;
    process.env.AGENTMAIL_API_KEY = 'test-key';

    const mockFetch = vi.fn().mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new AgentMailProvider();
    await provider.deprovision('agent-1', 'inbox-42');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.agentmail.to/v0/inboxes/inbox-42',
      expect.objectContaining({ method: 'DELETE' }),
    );

    vi.restoreAllMocks();
    if (savedKey !== undefined) {
      process.env.AGENTMAIL_API_KEY = savedKey;
    } else {
      delete process.env.AGENTMAIL_API_KEY;
    }
  });

  it('deprovision swallows errors', async () => {
    const savedKey = process.env.AGENTMAIL_API_KEY;
    process.env.AGENTMAIL_API_KEY = 'test-key';

    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('network fail'));
    vi.stubGlobal('fetch', mockFetch);

    const provider = new AgentMailProvider();
    await expect(provider.deprovision('agent-1', 'inbox-42')).resolves.toBeUndefined();

    vi.restoreAllMocks();
    if (savedKey !== undefined) {
      process.env.AGENTMAIL_API_KEY = savedKey;
    } else {
      delete process.env.AGENTMAIL_API_KEY;
    }
  });
});

describe('getInboxProvider factory', () => {
  let savedProvider: string | undefined;

  beforeEach(() => {
    savedProvider = process.env.INBOX_PROVIDER;
  });

  afterEach(() => {
    if (savedProvider !== undefined) {
      process.env.INBOX_PROVIDER = savedProvider;
    } else {
      delete process.env.INBOX_PROVIDER;
    }
  });

  it('defaults to AgentMailProvider', async () => {
    delete process.env.INBOX_PROVIDER;
    const { getInboxProvider } = await import('@/lib/inbox');
    const { AgentMailProvider } = await import('@/lib/inbox/agentmail-provider');
    const provider = getInboxProvider();
    expect(provider).toBeInstanceOf(AgentMailProvider);
  });

  it('returns ResendProvider when INBOX_PROVIDER=resend', async () => {
    process.env.INBOX_PROVIDER = 'resend';
    const { getInboxProvider } = await import('@/lib/inbox');
    const { ResendProvider } = await import('@/lib/inbox/resend-provider');
    const provider = getInboxProvider();
    expect(provider).toBeInstanceOf(ResendProvider);
  });
});
