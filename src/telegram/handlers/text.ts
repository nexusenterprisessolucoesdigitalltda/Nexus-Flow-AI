import { Context } from 'telegraf';
import { agentPipeline } from '../../agent';
import { conversationRepo } from '../../database';
import { skillLoader } from '../../skills';
import { logger } from '../../utils/logger';

const HELP_TEXT = `
*Nexus Flow - Comandos*

/start - Iniciar o assistente
/clear - Limpar histórico da conversa
/stats - Ver estatísticas da conversa
/help - Mostrar esta ajuda
/reload - Recarregar skills (admin)

*Mídia suportada:*
📄 Documentos: PDF, TXT, MD, XLSX, CSV, DOCX, JSON
🖼️ Imagens: Análise visual
🎤 Áudio/Voz: Transcrição automática

*Dica:* Envie arquivos ou áudios diretamente no chat!
`.trim();

export async function handleText(ctx: Context): Promise<void> {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  if (!text) return;

  const userId = String(ctx.from!.id);

  if (text === '/start') {
    await ctx.replyWithMarkdown(
      `Olá! Eu sou o *Nexus Flow*, seu assistente pessoal IA.\n\n` +
      `Estou pronto para ajudar com texto, documentos, imagens e áudio.\n` +
      `Use /help para ver todos os comandos.`
    );
    return;
  }

  if (text === '/clear') {
    const count = conversationRepo.clearHistory(userId);
    await ctx.reply(`🗑️ Histórico limpo (${count} mensagens removidas).`);
    return;
  }

  if (text === '/stats') {
    const stats = conversationRepo.getStats(userId);
    await ctx.reply(
      `📊 *Estatísticas da conversa*\n\n` +
      `Total de mensagens: ${stats.total}\n` +
      `Última mensagem: ${stats.lastMessage ? new Date(stats.lastMessage).toLocaleString('pt-BR') : 'N/A'}`
    );
    return;
  }

  if (text === '/help') {
    await ctx.replyWithMarkdown(HELP_TEXT);
    return;
  }

  if (text === '/reload') {
    await ctx.reply('🔄 Recarregando skills...');
    try {
      skillLoader.reloadAll();
      await ctx.reply('✅ Skills recarregadas com sucesso.');
    } catch (err: any) {
      await ctx.reply(`❌ Erro ao recarregar: ${err.message}`);
    }
    return;
  }

  await ctx.sendChatAction('typing');

  const response = await agentPipeline.execute({
    userId,
    userMessage: text,
    mediaType: 'text',
    correlationId: `txt_${Date.now()}`,
  });

  await ctx.reply(response);
}
