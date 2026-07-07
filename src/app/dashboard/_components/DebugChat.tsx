'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DebugChatProps {
  enabled: boolean;
}

/**
 * Floating debug chat panel — bottom-right of dashboard.
 * Streams responses from /api/dashboard/debug via plain-text chunked transfer.
 * Only renders when debug_chat_enabled feature flag is true for this tenant.
 */
export function DebugChat({ enabled }: DebugChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    setInput('');

    const nextMessages: Message[] = [
      ...messages,
      { role: 'user', content: userContent },
    ];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setLoading(true);

    try {
      const resp = await fetch('/api/dashboard/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json() as { error?: string };
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `⚠ ${errData.error ?? 'Unknown error'}` },
        ]);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + chunk },
          ];
        });
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: '⚠ Connection error. Try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send]
  );

  if (!enabled) return null;

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          className="debug-chat-trigger"
          onClick={() => setOpen(true)}
          title="Debug Assistant"
          aria-label="Open debug assistant"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 9h8M8 13h6" />
            <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7l-4 4V6Z" />
          </svg>
          <span>Debug</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="debug-chat-panel" role="dialog" aria-label="Debug assistant">
          {/* Header */}
          <div className="debug-chat-header">
            <div className="debug-chat-title">
              <span className="debug-chat-status-dot" />
              <span>Debug Assistant</span>
              <span className="debug-chat-model">laguna-m.1</span>
            </div>
            <div className="debug-chat-header-actions">
              {messages.length > 0 && (
                <button
                  className="debug-chat-clear"
                  onClick={() => setMessages([])}
                  title="Clear conversation"
                >
                  Clear
                </button>
              )}
              <button
                className="debug-chat-close"
                onClick={() => setOpen(false)}
                aria-label="Close debug assistant"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="debug-chat-messages" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="debug-chat-empty">
                <p>Ask about errors in your integration:</p>
                <ul>
                  <li>Certificate issuance failures</li>
                  <li>Risk score spikes</li>
                  <li>API 4xx/5xx errors</li>
                  <li>Quota limit hits</li>
                </ul>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`debug-chat-msg debug-chat-msg--${msg.role}`}
                >
                  {msg.role === 'assistant' && !msg.content && loading ? (
                    <span className="debug-chat-thinking">
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    <span className="debug-chat-content">{msg.content}</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="debug-chat-footer">
            <input
              ref={inputRef}
              className="debug-chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the error or paste a code snippet…"
              disabled={loading}
              maxLength={2000}
            />
            <button
              className="debug-chat-send"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
