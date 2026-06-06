export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | LLMContentPart[];
}

export interface LLMContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
}

export interface LLMConfig {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface LLMProvider {
  readonly name: string;
  readonly displayName: string;
  readonly supportsVision: boolean;
  readonly supportsStreaming: boolean;

  generate(messages: LLMMessage[], config?: LLMConfig): Promise<LLMResponse>;
  generateWithVision(messages: LLMMessage[], imagePath: string, config?: LLMConfig): Promise<LLMResponse>;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
}
