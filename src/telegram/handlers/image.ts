import { Context } from 'telegraf';
import path from 'path';
import { config } from '../../config';
import { logger, createContextLogger } from '../../utils/logger';
import { ensureDir, downloadFile, cleanupTempFile } from '../../utils/file';
import { agentPipeline } from '../../agent';

const imgLogger = createContextLogger('image-handler');

export async function handlePhoto(ctx: Context): Promise<void> {
  const photos = ctx.message && 'photo' in ctx.message ? ctx.message.photo : null;
  if (!photos || photos.length === 0) return;

  const photo = photos[photos.length - 1];
  await ctx.sendChatAction('typing');
  await ctx.reply('🖼️ Analisando imagem...');

  const fileLink = await ctx.telegram.getFileLink(photo.file_id);
  if (!fileLink.href) {
    await ctx.reply('Não foi possível baixar a imagem.');
    return;
  }

  const ext = path.extname(fileLink.href) || '.jpg';
  const tempPath = path.join(config.paths.temp, `img_${Date.now()}${ext}`);
  ensureDir(config.paths.temp);

  try {
    await downloadFile(fileLink.href, tempPath);
    imgLogger.info(`Downloaded image: ${tempPath}`);

    const caption = (ctx.message as any).caption || 'Descreva ou analise esta imagem.';

    const response = await agentPipeline.execute({
      userId: String(ctx.from!.id),
      userMessage: caption,
      mediaType: 'image',
      imagePath: tempPath,
      correlationId: `img_${Date.now()}`,
    });

    await ctx.reply(response);
  } catch (err: any) {
    imgLogger.error(`Image error: ${err.message}`);
    await ctx.reply(`Erro ao processar imagem: ${err.message}`);
  } finally {
    cleanupTempFile(tempPath);
  }
}
