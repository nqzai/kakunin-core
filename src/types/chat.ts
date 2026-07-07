export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  source: 'discord' | 'web' | 'api' | 'email';
  user_id?: string;
  thread_id?: string;
  agent_id?: string;
}

export interface ChatRequestBody {
  conversation_id?: string;
  messages: ChatMessage[];
  context?: ChatContext;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model_used: string;
  needs_human_review: boolean;
  escalation_reason?: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  source: 'discord' | 'web' | 'api' | 'email';
  external_thread_id?: string;
  user_id?: string;
  agent_id?: string;
  status: 'active' | 'resolved' | 'escalated' | 'archived';
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  tenant_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_in?: number;
  tokens_out?: number;
  model_used?: string;
  needs_human_review: boolean;
  escalation_reason?: string;
  created_at: string;
}
