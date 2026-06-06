import { Context } from 'telegraf';
import path from 'path';
import { config } from '../../config';
import { logger, createContextLogger } from '../../utils/logger';
import { ensureDir, downloadFile, cleanupTempFile, extractTextFromFile, truncateContent, sanitizeFileName } from '../../utils/file';
import { agentPipeline } from '../../agent';

const docLogger = createContextLogger('document-handler');

const SUPPORTED_EXTENSIONS = ['.pdf', '.md', '.txt', '.xlsx', '.xls', '.csv', '.docx', '.json'];

export async function handleDocument(ctx: Context): Promise<void> {
  const doc = ctx.message && 'document' in ctx.message ? ctx.message.document : null;
  if (!doc) return;

  const fileName = doc.file_name || 'unknown';
  const ext = path.extname(fileName).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    await ctx.reply(
      `📄 Formato não suportado: ${ext}\n` +
      `Aceitos: ${SUPPORTED_EXTENSIONS.join(', ')}`
    );
    return;
  }

  await ctx.sendChatAction('typing');
  await ctx.reply(`📄 Recebido: ${fileName}. Extraindo conteúdo...`);

  const fileLink = await ctx.telegram.getFileLink(doc.file_id);
  if (!fileLink.href) {
    await ctx.reply('Não foi possível baixar o arquivo.');
    return;
  }

  const safeName = sanitizeFileName(fileName);
  const tempPath = path.join(config.paths.temp, `doc_${Date.now()}_${safeName}`);
  ensureDir(config.paths.temp);

  try {
    await downloadFile(fileLink.href, tempPath);
    docLogger.info(`Downloaded: ${fileName} (${ext})`);

    const content = await extractTextFromFile(tempPath);

    if (!content || content.trim().length < 5) {
      await ctx.reply('O arquivo parece estar vazio ou não foi possível extrair conteúdo.');
      return;
    }

    const truncated = truncateContent(content, config.security.maxFileSize);
    docLogger.info(`Extracted ${content.length} chars from ${fileName}`);

    const userCaption = (ctx.message as any).caption || `Analise o arquivo: ${fileName}`;

    const response = await agentPipeline.execute({
      userId: String(ctx.from!.id),
      userMessage: userCaption,
      mediaContext: truncated,
      mediaType: 'document',
      correlationId: `doc_${Date.now()}`,
    });

    await ctx.reply(response);
  } catch (err: any) {
    docLogger.error(`Document error: ${err.message}`);
    await ctx.reply(`Erro ao processar ${fileName}: ${err.message}`);
  } finally {
    cleanupTempFile(tempPath);
  }
}
