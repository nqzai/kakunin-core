'use client';

import { useEffect } from 'react';
import { buildTools } from '@/lib/webmcp/tools';
import { log } from '@/lib/logging';

/**
 * Registers Kakunin tools with navigator.modelContext (WebMCP).
 * Browser-only — only runs where the API exists.
 * Exposes: verify_agent_scope, check_risk_score, audit_log_append
 * Auth: uses Supabase session cookie via /api/webmcp/* routes
 */
export function WebMCPProvider() {
  useEffect(() => {

    const nav = navigator as Navigator & {
      modelContext?: {
        provideContext: (ctx: {
          name: string;
          tools: Array<{
            name: string;
            description: string;
            inputSchema: Record<string, unknown>;
            execute: (input: unknown) => Promise<unknown>;
          }>;
        }) => Promise<void>;
      };
    };

    if (!nav.modelContext?.provideContext) return;

    const tools = buildTools();

    nav.modelContext
      .provideContext({ name: 'kakunin', tools })
      .catch((err: unknown) => {
        log.warn('[webmcp] provideContext failed', { error: err instanceof Error ? err.message : String(err) });
      });
  }, []);

  return null;
}
