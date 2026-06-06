import OpenAI from 'openai';
import fs from 'fs';
import { LLMProvider, LLMMessage, LLMConfig, LLMResponse } from './types';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { LLMError } from '../utils/errors';

export class DeepSeekProvider implements LLMProvider {
  readonly name = 'deepseek';
  readonly displayName = 'DeepSeek';
  readonly supportsVision = true;
  readonly supportsStreaming = false;

  private client: OpenAI;

  constructor(apiKey: string, baseURL: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async generate(messages: LLMMessage[], config?: LLMConfig): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelName = config?.model || 'deepseek-chat';

    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: typeof m.content === 'string' ? m.content : m.content.map(p => p.text || '').join(' '),
        })),
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 2048,
      });

      const choice = response.choices[0]?.message;

      return {
        content: choice?.content || '',
        model: modelName,
        provider: this.name,
        tokensUsed: response.usage ? {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens,
        } : undefined,
        latencyMs: Date.now() - startTime,
      };
    }, {
      maxAttempts: 3,
      baseDelayMs: 2000,
      retryable: (err) => {
        const msg = err.message.toLowerCase();
        return msg.includes('rate') || msg.includes('timeout') || msg.includes('429');
      },
    }).catch(err => {
      throw new LLMError(`DeepSeek generation failed: ${err.message}`, this.name);
    });
  }

  async generateWithVision(messages: LLMMessage[], imagePath: string, config?: LLMConfig): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelName = config?.model || 'deepseek-vision';

    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const lastMsg = messages[messages.length - 1];
    const text = typeof lastMsg.content === 'string' ? lastMsg.content : 'Analyze this image';

    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          ...messages.filter(m => m.role === 'system').map(m => ({
            role: 'system' as const,
            content: typeof m.content === 'string' ? m.content : '',
          })),
          {
            role: 'user',
            content: [
              { type: 'text', text },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
          },
        ],
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 2048,
      });

      const choice = response.choices[0]?.message;

      return {
        content: choice?.content || '',
        model: modelName,
        provider: this.name,
        latencyMs: Date.now() - startTime,
      };
    }, {
      maxAttempts: 2,
      baseDelayMs: 2000,
    }).catch(err => {
      throw new LLMError(`DeepSeek vision failed: ${err.message}`, this.name);
    });
  }
}
