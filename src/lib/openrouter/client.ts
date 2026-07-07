import { log } from '@/lib/logging';

/**
 * OpenRouter Client
 *
 * Thin wrapper for OpenRouter chat completions.
 * Model routing per task type — see model map below.
 *
 * Key flows:
 *   complete() → POST openrouter.ai/api/v1/chat/completions → return content
 *   getModel() → maps task type to specific model ID
 *
 * @see https://openrouter.ai/docs
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResult {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Model routing per task type — calibrated for cost/quality tradeoff
const MODEL_MAP = {
  risk_narration: 'google/gemini-flash-1.5',
  anomaly_detection: 'anthropic/claude-3-haiku',
  compliance_report: 'anthropic/claude-sonnet-4-5',
  // Discord support bot — free tier for testing
  discord_chat: 'poolside/laguna-m.1:free',
  // Free model for dashboard debug assistant — poolside primary, deepseek fallback
  debug_assistant: 'poolside/laguna-m.1:free',
  debug_assistant_fallback: 'deepseek/deepseek-v4-flash:free',
  // Agent-output content-risk (FME pilot) — cheap, deterministic at temp 0
  content_risk: 'openai/gpt-4o-mini',
  content_risk_fallback: 'google/gemini-flash-1.5',
  website_assessment: 'openai/gpt-oss-120b:free',
} as const;

export type TaskType = keyof typeof MODEL_MAP;

/**
 * Get the OpenRouter model ID for a given task type or fallback.
 */
export function getModel(task: TaskType): string {
  return MODEL_MAP[task];
}

/**
 * Call OpenRouter chat completions with optional fallback model.
 *
 * @param options - Model, messages, and generation params
 * @param fallbackModel - Optional fallback model if primary is unavailable
 * @returns Generated content and token usage
 * @throws {Error} If OPENROUTER_API_KEY is not set or all models fail
 */
export async function complete(options: CompletionOptions, fallbackModel?: string): Promise<CompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const attemptWithModel = async (model: string) => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai',
        'X-Title': 'Kakunin',
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    return {
      content: data.choices[0]?.message?.content ?? '',
      model: data.model,
      usage: data.usage,
    };
  };

  try {
    return await attemptWithModel(options.model);
  } catch (err) {
    if (fallbackModel) {
      log.warn('Primary model unavailable, retrying with fallback', { primary: options.model, fallback: fallbackModel });
      return await attemptWithModel(fallbackModel);
    }
    throw err;
  }
}

/**
 * Stream a chat completion from OpenRouter with optional fallback model.
 *
 * Returns a ReadableStream that emits raw text chunks as they arrive.
 * Caller is responsible for piping to the response.
 *
 * @param options - Model, messages, and generation params
 * @param fallbackModel - Optional fallback model if primary is unavailable
 * @returns ReadableStream of text chunks
 * @throws {Error} If OPENROUTER_API_KEY is not set or all models fail
 */
export async function streamComplete(options: CompletionOptions, fallbackModel?: string): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const attemptStream = async (model: string) => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai',
        'X-Title': 'Kakunin',
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter streaming error ${response.status}: ${errText}`);
    }

    return response;
  };

  let response: Response;
  try {
    response = await attemptStream(options.model);
  } catch (err) {
    if (fallbackModel) {
      log.warn('Primary model unavailable, retrying with fallback', { primary: options.model, fallback: fallbackModel });
      response = await attemptStream(fallbackModel);
    } else {
      throw err;
    }
  }

  const encoder = new TextEncoder();

  // Transform SSE → plain text chunks
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Last element may be incomplete — keep in buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const chunk = parsed.choices?.[0]?.delta?.content ?? '';
              if (chunk) controller.enqueue(encoder.encode(chunk));
            } catch {
              // Skip malformed SSE line
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
