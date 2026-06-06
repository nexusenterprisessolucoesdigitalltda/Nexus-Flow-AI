import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { LLMProvider, LLMMessage, LLMConfig, LLMResponse } from './types';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { LLMError } from '../utils/errors';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly displayName = 'Google Gemini';
  readonly supportsVision = true;
  readonly supportsStreaming = true;

  private client: GoogleGenerativeAI;
  private defaultModel = 'gemini-1.5-flash';

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(messages: LLMMessage[], config?: LLMConfig): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelName = config?.model || this.defaultModel;

    return withRetry(async () => {
      const model = this.client.getGenerativeModel({ model: modelName });

      const systemPrompt = messages.find(m => m.role === 'system')?.content as string || '';

      const history = messages
        .filter(m => m.role !== 'system')
        .slice(0, -1)
        .map(m => ({
          role: m.role === 'assistant' ? 'model' as const : 'user' as const,
          parts: [{ text: typeof m.content === 'string' ? m.content : m.content.map(p => p.text || '').join(' ') }],
        }));

      const lastMsg = messages[messages.length - 1];
      const lastText = typeof lastMsg.content === 'string'
        ? lastMsg.content
        : lastMsg.content.map(p => p.text || '').join(' ');

      const chat = model.startChat({
        history,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: config?.temperature ?? 0.7,
          maxOutputTokens: config?.maxTokens ?? 2048,
        },
      });

      const result = await chat.sendMessage(lastText);
      const response = result.response;
      const text = response.text();

      return {
        content: text,
        model: modelName,
        provider: this.name,
        latencyMs: Date.now() - startTime,
      };
    }, {
      maxAttempts: 3,
      baseDelayMs: 2000,
      retryable: (err) => {
        const msg = err.message.toLowerCase();
        return msg.includes('rate') || msg.includes('timeout') || msg.includes('429') || msg.includes('503');
      },
    }).catch(err => {
      throw new LLMError(`Gemini generation failed: ${err.message}`, this.name);
    });
  }

  async generateWithVision(messages: LLMMessage[], imagePath: string, config?: LLMConfig): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelName = config?.model || this.defaultModel;

    return withRetry(async () => {
      const model = this.client.getGenerativeModel({ model: modelName });

      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');
      const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

      const systemPrompt = messages.find(m => m.role === 'system')?.content as string || '';
      const lastMsg = messages[messages.length - 1];
      const text = typeof lastMsg.content === 'string' ? lastMsg.content : 'Analyze this image';

      const result = await model.generateContent([
        { text: systemPrompt ? `${systemPrompt}\n\n${text}` : text },
        { inlineData: { mimeType, data: base64Image } },
      ]);

      const response = result.response;

      return {
        content: response.text(),
        model: modelName,
        provider: this.name,
        latencyMs: Date.now() - startTime,
      };
    }, {
      maxAttempts: 2,
      baseDelayMs: 2000,
    }).catch(err => {
      throw new LLMError(`Gemini vision failed: ${err.message}`, this.name);
    });
  }
}
