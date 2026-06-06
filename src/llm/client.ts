export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | LLMContentPart[];
}

export interface LLMContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface LLMConfig {
  temperature?: number;
  maxTokens?: number;
}

export interface LLMClient {
  name: string;
  generate(messages: LLMMessage[], config?: LLMConfig): Promise<string>;
  generateWithVision(messages: LLMMessage[], imagePath: string, config?: LLMConfig): Promise<string>;
}
