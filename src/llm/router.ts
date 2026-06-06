import { config, LLMProvider as ProviderType } from '../config';
import { logger } from '../utils/logger';
import { LLMProvider, LLMResponse, LLMMessage, LLMConfig } from './types';
import { GeminiProvider } from './gemini';
import { DeepSeekProvider } from './deepseek';
import { OpenAIProvider } from './openai';
import { LLMError } from '../utils/errors';

class LLMRouter {
  private providers: Map<ProviderType, LLMProvider> = new Map();
  private providerOrder: ProviderType[] = [];
  private activeProvider: ProviderType | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (config.llm.gemini.apiKey) {
      this.providers.set('gemini', new GeminiProvider(config.llm.gemini.apiKey));
      this.providerOrder.push('gemini');
    }

    if (config.llm.deepseek.apiKey) {
      this.providers.set('deepseek', new DeepSeekProvider(
        config.llm.deepseek.apiKey,
        config.llm.deepseek.baseUrl
      ));
      this.providerOrder.push('deepseek');
    }

    if (config.llm.openai.apiKey) {
      this.providers.set('openai', new OpenAIProvider(config.llm.openai.apiKey));
      this.providerOrder.push('openai');
    }

    if (this.providerOrder.length === 0) {
      logger.error('No LLM providers configured. Set at least one API key in .env');
      return;
    }

    if (this.providerOrder.includes(config.llm.active)) {
      this.activeProvider = config.llm.active;
    } else {
      this.activeProvider = this.providerOrder[0];
    }

    logger.info(`LLM providers: ${this.providerOrder.join(', ')}`);
    logger.info(`Active LLM: ${this.getActiveProvider()?.displayName || 'NONE'}`);
  }

  getActiveProvider(): LLMProvider | undefined {
    return this.activeProvider ? this.providers.get(this.activeProvider) : undefined;
  }

  async generate(messages: LLMMessage[], llmConfig?: LLMConfig): Promise<LLMResponse> {
    const primary = this.activeProvider;
    if (!primary) {
      throw new LLMError('No LLM provider configured', 'none');
    }

    const primaryProvider = this.providers.get(primary);
    if (!primaryProvider) {
      throw new LLMError(`Provider ${primary} not found`, primary);
    }

    try {
      const response = await primaryProvider.generate(messages, llmConfig);
      this.logTokenUsage(primary, response);
      return response;
    } catch (err) {
      logger.warn(`Primary LLM ${primary} failed:`, err);

      const fallbackProvider = this.providerOrder.find(p => p !== primary);
      if (fallbackProvider) {
        const fallback = this.providers.get(fallbackProvider)!;
        logger.info(`Falling back to ${fallbackProvider}...`);
        const response = await fallback.generate(messages, llmConfig);
        this.logTokenUsage(fallbackProvider, response);
        return response;
      }

      throw err;
    }
  }

  async generateWithVision(
    messages: LLMMessage[],
    imagePath: string,
    llmConfig?: LLMConfig
  ): Promise<LLMResponse> {
    const activeProvider = this.getActiveProvider();
    if (!activeProvider) {
      throw new LLMError('No LLM provider configured', 'none');
    }

    if (activeProvider.supportsVision) {
      try {
        return await activeProvider.generateWithVision(messages, imagePath, llmConfig);
      } catch (err) {
        logger.warn(`Vision with ${activeProvider.name} failed:`, err);
      }
    }

    for (const provider of this.providerOrder) {
      if (provider === this.activeProvider) continue;
      const p = this.providers.get(provider);
      if (p?.supportsVision) {
        logger.info(`Trying vision with ${provider}...`);
        return await p.generateWithVision(messages, imagePath, llmConfig);
      }
    }

    throw new LLMError('No provider with vision support available', 'none');
  }

  switchProvider(name: ProviderType): boolean {
    if (this.providers.has(name)) {
      this.activeProvider = name;
      logger.info(`Switched to ${name}`);
      return true;
    }
    return false;
  }

  listProviders(): { name: string; displayName: string; active: boolean }[] {
    return this.providerOrder.map(name => ({
      name,
      displayName: this.providers.get(name)?.displayName || name,
      active: name === this.activeProvider,
    }));
  }

  private logTokenUsage(provider: ProviderType, response: LLMResponse): void {
    if (response.tokensUsed) {
      logger.info(
        `[TOKENS] ${provider}: ${response.tokensUsed.total} total ` +
        `(${response.tokensUsed.prompt} prompt + ${response.tokensUsed.completion} completion)`
      );
    }
    logger.debug(`[LATENCY] ${provider}: ${response.latencyMs}ms`);
  }
}

export const llmRouter = new LLMRouter();
