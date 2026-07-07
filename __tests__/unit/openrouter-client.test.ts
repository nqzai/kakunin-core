import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getModel, complete, streamComplete } from '@/lib/openrouter/client';

describe('openrouter/client', () => {
  describe('getModel', () => {
    it('returns correct model for each task type', () => {
      expect(getModel('risk_narration')).toBe('google/gemini-flash-1.5');
      expect(getModel('anomaly_detection')).toBe('anthropic/claude-3-haiku');
      expect(getModel('compliance_report')).toBe('anthropic/claude-sonnet-4-5');
      expect(getModel('discord_chat')).toBe('poolside/laguna-m.1:free');
      expect(getModel('content_risk')).toBe('openai/gpt-4o-mini');
      expect(getModel('content_risk_fallback')).toBe('google/gemini-flash-1.5');
      expect(getModel('website_assessment')).toBe('openai/gpt-oss-120b:free');
      expect(getModel('debug_assistant')).toBe('poolside/laguna-m.1:free');
      expect(getModel('debug_assistant_fallback')).toBe('deepseek/deepseek-v4-flash:free');
    });
  });

  describe('complete', () => {
    let savedKey: string | undefined;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      savedKey = process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
      if (savedKey !== undefined) {
        process.env.OPENROUTER_API_KEY = savedKey;
      } else {
        delete process.env.OPENROUTER_API_KEY;
      }
      vi.restoreAllMocks();
    });

    it('throws when OPENROUTER_API_KEY is missing', async () => {
      delete process.env.OPENROUTER_API_KEY;
      await expect(
        complete({ model: 'test', messages: [{ role: 'user', content: 'hi' }] }),
      ).rejects.toThrow('OPENROUTER_API_KEY not configured');
    });

    it('returns parsed completion result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello!' } }],
          model: 'test-model',
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
      });

      const result = await complete({
        model: 'test-model',
        messages: [{ role: 'user', content: 'hi' }],
      });

      expect(result.content).toBe('Hello!');
      expect(result.model).toBe('test-model');
      expect(result.usage.total_tokens).toBe(8);
    });

    it('sends correct headers and body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          model: 'm',
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      });

      await complete({
        model: 'my-model',
        messages: [{ role: 'system', content: 'be helpful' }],
        temperature: 0.7,
        maxTokens: 500,
      });

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(opts.method).toBe('POST');
      expect(opts.headers.Authorization).toBe('Bearer test-api-key');
      const body = JSON.parse(opts.body);
      expect(body.model).toBe('my-model');
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(500);
    });

    it('uses default temperature 0.3 and maxTokens 2000', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' } }],
          model: 'm',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }),
      });

      await complete({ model: 'x', messages: [] });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.temperature).toBe(0.3);
      expect(body.max_tokens).toBe(2000);
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
      });

      await expect(
        complete({ model: 'x', messages: [{ role: 'user', content: 'hi' }] }),
      ).rejects.toThrow('OpenRouter API error 429: rate limited');
    });

    it('falls back to fallback model on primary failure', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'down' })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'fallback response' } }],
            model: 'fallback-model',
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        });

      const result = await complete(
        { model: 'primary', messages: [{ role: 'user', content: 'hi' }] },
        'fallback-model',
      );

      expect(result.content).toBe('fallback response');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws if primary fails and no fallback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'server error',
      });

      await expect(
        complete({ model: 'x', messages: [{ role: 'user', content: 'hi' }] }),
      ).rejects.toThrow('OpenRouter API error 500');
    });

    it('returns empty content when choices array has no content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: {} }],
          model: 'm',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }),
      });

      const result = await complete({ model: 'x', messages: [] });
      expect(result.content).toBe('');
    });
  });

  describe('streamComplete', () => {
    let savedKey: string | undefined;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      savedKey = process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
      if (savedKey !== undefined) {
        process.env.OPENROUTER_API_KEY = savedKey;
      } else {
        delete process.env.OPENROUTER_API_KEY;
      }
      vi.restoreAllMocks();
    });

    it('throws when OPENROUTER_API_KEY is missing', async () => {
      delete process.env.OPENROUTER_API_KEY;
      await expect(
        streamComplete({ model: 'test', messages: [{ role: 'user', content: 'hi' }] }),
      ).rejects.toThrow('OPENROUTER_API_KEY not configured');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => 'bad gateway',
      });

      await expect(
        streamComplete({ model: 'x', messages: [{ role: 'user', content: 'hi' }] }),
      ).rejects.toThrow('OpenRouter streaming error 502: bad gateway');
    });

    it('falls back on primary failure', async () => {
      const encoder = new TextEncoder();
      const sseData = 'data: {"choices":[{"delta":{"content":"hi"}}]}\ndata: [DONE]\n';
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        },
      });

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'down' })
        .mockResolvedValueOnce({ ok: true, body: readable });

      const stream = await streamComplete(
        { model: 'primary', messages: [{ role: 'user', content: 'hi' }] },
        'fallback',
      );

      expect(stream).toBeInstanceOf(ReadableStream);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('sends stream:true in request body', async () => {
      const encoder = new TextEncoder();
      const sseData = 'data: [DONE]\n';
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({ ok: true, body: readable });

      await streamComplete({ model: 'test', messages: [] });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.stream).toBe(true);
    });
  });
});
