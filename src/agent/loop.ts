import { config } from '../config';
import { db } from '../database/manager';
import { llmRouter } from '../llm/router';
import { LLMMessage } from '../llm/client';
import { skillRegistry } from '../skills/registry';
import { logger } from '../utils/logger';

const SYSTEM_PROMPT = `You are Sunday Claw, a personal AI assistant. You help the user with their tasks.

You have access to skills that can help with specific tasks. When a skill matches the user's request, you should use it.
Be helpful, concise, and friendly. Respond in the same language the user writes to you.

Available skills: {skills_list}`;

export async function processMessage(
  userId: string,
  userMessage: string,
  mediaContext?: string
): Promise<string> {
  try {
    const history = db.getHistory(userId, config.agent.maxHistory);

    const skillsList = skillRegistry.getAll()
      .map(s => `- ${s.name}: ${s.description} (pattern: ${s.pattern})`)
      .join('\n');

    const systemPrompt = SYSTEM_PROMPT.replace('{skills_list}', skillsList || 'No skills loaded');

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    ];

    let finalMessage = userMessage;
    if (mediaContext) {
      finalMessage = `${userMessage}\n\n[Media Content]:\n${mediaContext}`;
    }

    const skillMatch = skillRegistry.findMatch(finalMessage);
    if (skillMatch) {
      logger.info(`Skill matched: ${skillMatch.skill.name}`);
      try {
        const skillResult = await skillMatch.skill.execute(skillMatch.params, { userId, message: finalMessage });
        const skillContext = `[Skill "${skillMatch.skill.name}" was executed and returned]:\n${skillResult}`;
        messages.push({ role: 'user', content: `${finalMessage}\n\n${skillContext}` });
      } catch (skillErr) {
        logger.error(`Skill execution error: ${skillMatch.skill.name}`, skillErr);
        messages.push({ role: 'user', content: finalMessage });
      }
    } else {
      messages.push({ role: 'user', content: finalMessage });
    }

    db.addMessage(userId, 'user', finalMessage, skillMatch?.skill.name);

    const client = llmRouter.getClient();
    let response: string;

    response = await client.generate(messages);

    db.addMessage(userId, 'assistant', response);

    return response;
  } catch (err) {
    logger.error('Agent loop error:', err);
    return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
  }
}

export async function processMessageWithImage(
  userId: string,
  userMessage: string,
  imagePath: string
): Promise<string> {
  try {
    const history = db.getHistory(userId, config.agent.maxHistory);

    const messages: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT.replace('{skills_list}', '') },
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: userMessage },
    ];

    db.addMessage(userId, 'user', `${userMessage} [Image attached]`);

    const client = llmRouter.getClient();
    const response = await client.generateWithVision(messages, imagePath);

    db.addMessage(userId, 'assistant', response);
    return response;
  } catch (err) {
    logger.error('Agent loop (vision) error:', err);
    return 'Desculpe, ocorreu um erro ao processar a imagem.';
  }
}
