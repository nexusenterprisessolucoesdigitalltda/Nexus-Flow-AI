import { config } from '../config';
import { conversationRepo } from '../database';
import { llmRouter } from '../llm';
import { LLMMessage } from '../llm/types';
import { skillRegistry, SkillContext } from '../skills';
import { logger, createContextLogger } from '../utils/logger';

const SYSTEM_PROMPT = `You are Nexus Flow, a personal AI assistant.

You are helpful, concise, and friendly. Respond in the same language the user writes to you.

Available skills:
{skills_list}

When a user's request matches a skill pattern, use the skill's output to inform your response.`;

export interface AgentContext {
  userId: string;
  userMessage: string;
  mediaContext?: string;
  mediaType?: 'document' | 'image' | 'audio' | 'text';
  imagePath?: string;
  correlationId: string;
}

export interface PipelineMiddleware {
  name: string;
  before?: (ctx: AgentContext) => Promise<AgentContext>;
  after?: (ctx: AgentContext, response: string) => Promise<string>;
}

class AgentPipeline {
  private middlewares: PipelineMiddleware[] = [];
  private readonly agentLogger = createContextLogger('agent');

  use(middleware: PipelineMiddleware): void {
    this.middlewares.push(middleware);
    this.agentLogger.debug(`Middleware registered: ${middleware.name}`);
  }

  async execute(context: AgentContext): Promise<string> {
    const log = this.agentLogger.child({ correlationId: context.correlationId });

    log.info(`Processing message from ${context.userId}: "${context.userMessage.slice(0, 80)}..."`);

    let ctx = context;

    for (const mw of this.middlewares) {
      if (mw.before) {
        ctx = await mw.before(ctx);
      }
    }

    try {
      let response: string;

      if (ctx.mediaType === 'image' && ctx.imagePath) {
        response = await this.processWithVision(ctx, log);
      } else {
        response = await this.processStandard(ctx, log);
      }

      for (const mw of this.middlewares) {
        if (mw.after) {
          response = await mw.after(ctx, response);
        }
      }

      return response;
    } catch (err: any) {
      log.error(`Pipeline error: ${err.message}`);
      return `Desculpe, ocorreu um erro ao processar sua mensagem. Detalhes: ${err.message}`;
    }
  }

  private async processStandard(ctx: AgentContext, log: any): Promise<string> {
    const history = conversationRepo.getHistory(ctx.userId, config.agent.maxHistory);

    const skillsList = skillRegistry.getAll()
      .map(s => `- ${s.name}: ${s.description}`)
      .join('\n') || 'No skills currently loaded.';

    const systemPrompt = SYSTEM_PROMPT.replace('{skills_list}', skillsList);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
    ];

    let finalContent = ctx.userMessage;
    if (ctx.mediaContext) {
      finalContent = `${ctx.userMessage}\n\n---\nContent from ${ctx.mediaType || 'attachment'}:\n${ctx.mediaContext}\n---`;
    }

    const skillMatch = skillRegistry.findMatch(finalContent);
    if (skillMatch) {
      log.info(`Skill matched: ${skillMatch.skill.name}`);

      const skillCtx: SkillContext = {
        userId: ctx.userId,
        message: finalContent,
        matchedParams: skillMatch.params,
        attachment: ctx.mediaContext ? {
          type: (ctx.mediaType || 'document') as 'document' | 'image' | 'audio',
          content: ctx.mediaContext.slice(0, 1000),
        } : undefined,
      };

      try {
        const skillResult = await skillMatch.skill.execute(skillCtx);
        finalContent = `${finalContent}\n\n[Skill "${skillMatch.skill.name}" executed]:\n${skillResult}`;
      } catch (skillErr: any) {
        log.error(`Skill execution error: ${skillMatch.skill.name} - ${skillErr.message}`);
      }
    }

    messages.push({ role: 'user', content: finalContent });

    conversationRepo.addMessage({
      userId: ctx.userId,
      role: 'user',
      content: ctx.userMessage,
      skillUsed: skillMatch?.skill.name,
    });

    const llmConfig = {
      temperature: config.agent.temperature,
      maxTokens: config.agent.maxResponseTokens,
    };

    const llmResponse = await llmRouter.generate(messages, llmConfig);

    conversationRepo.addMessage({
      userId: ctx.userId,
      role: 'assistant',
      content: llmResponse.content,
      modelUsed: llmResponse.model,
      tokensUsed: llmResponse.tokensUsed?.total,
    });

    log.info(`Response generated: ${llmResponse.latencyMs}ms, ${llmResponse.model}`);

    return llmResponse.content;
  }

  private async processWithVision(ctx: AgentContext, log: any): Promise<string> {
    const history = conversationRepo.getHistory(ctx.userId, config.agent.maxHistory);

    const messages: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT.replace('{skills_list}', '') },
      ...history.map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: ctx.userMessage },
    ];

    conversationRepo.addMessage({
      userId: ctx.userId,
      role: 'user',
      content: `${ctx.userMessage} [Image attached]`,
    });

    const llmResponse = await llmRouter.generateWithVision(messages, ctx.imagePath!, {
      temperature: config.agent.temperature,
      maxTokens: config.agent.maxResponseTokens,
    });

    conversationRepo.addMessage({
      userId: ctx.userId,
      role: 'assistant',
      content: llmResponse.content,
      modelUsed: llmResponse.model,
      tokensUsed: llmResponse.tokensUsed?.total,
    });

    log.info(`Vision response: ${llmResponse.latencyMs}ms`);

    return llmResponse.content;
  }
}

export const agentPipeline = new AgentPipeline();
