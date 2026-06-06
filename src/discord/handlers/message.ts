import { Message, Attachment } from 'discord.js';
import path from 'path';
import { config } from '../../config';
import { agentPipeline } from '../../agent';
import { conversationRepo } from '../../database';
import { skillLoader } from '../../skills';
import { logger, createContextLogger } from '../../utils/logger';
import { ensureDir, downloadFile, cleanupTempFile, extractTextFromFile, truncateContent, sanitizeFileName } from '../../utils/file';
import { RateLimiter } from '../../utils/rate-limiter';
import { RateLimitError } from '../../utils/errors';

const discordLogger = createContextLogger('discord');
const rateLimiter = new RateLimiter(config.security.rateLimitMax, config.security.rateLimitWindowMs);

function isAllowed(userId: string): boolean {
  const allowedIds = config.discord.allowedUserIds;
  return allowedIds.length === 0 || allowedIds.includes(userId);
}

const HELP_TEXT = `
**Nexus Flow - Comandos**

\`!start\` - Iniciar o assistente
\`!clear\` - Limpar histórico
\`!stats\` - Estatísticas
\`!help\` - Ajuda
\`!reload\` - Recarregar skills

**Mídia suportada:**
- Documentos: PDF, TXT, MD, XLSX, CSV, DOCX
- Imagens: Análise visual
- Áudio/Voz: Transcrição automática

Envie arquivos ou áudios diretamente no chat!
`.trim();

const SUPPORTED_EXTENSIONS = ['.pdf', '.md', '.txt', '.xlsx', '.xls', '.csv', '.docx', '.json'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export async function handleDiscordMessage(message: Message): Promise<void> {
  if (message.author.bot) return;

  const userId = message.author.id;
  const userName = message.author.username;

  if (!isAllowed(userId)) {
    discordLogger.warn(`Unauthorized: ${userName} (${userId})`);
    return;
  }

  try {
    rateLimiter.check(userId);
  } catch (err) {
    if (err instanceof RateLimitError) {
      await message.reply(err.message);
    }
    return;
  }

  const text = message.content;
  const prefix = config.discord.commandPrefix;

  if (text.startsWith(prefix)) {
    const command = text.slice(prefix.length).split(' ')[0].toLowerCase();

    if (command === 'start') {
      await message.reply(`Olá ${userName}! Eu sou o Nexus Flow, seu assistente pessoal IA.`);
      return;
    }

    if (command === 'clear') {
      const count = conversationRepo.clearHistory(userId);
      await message.reply(`Histórico limpo (${count} mensagens).`);
      return;
    }

    if (command === 'stats') {
      const stats = conversationRepo.getStats(userId);
      await message.reply(
        `📊 **Estatísticas**\nMensagens: ${stats.total}\nÚltima: ${stats.lastMessage ? new Date(stats.lastMessage).toLocaleString('pt-BR') : 'N/A'}`
      );
      return;
    }

    if (command === 'help') {
      await message.reply(HELP_TEXT);
      return;
    }

    if (command === 'reload') {
      await message.reply('🔄 Recarregando skills...');
      skillLoader.reloadAll();
      await message.reply('✅ Skills recarregadas.');
      return;
    }
  }

  const attachment = message.attachments.first();

  if (attachment) {
    await handleAttachment(message, attachment, text);
    return;
  }

  if (text && !text.startsWith(prefix)) {
    await message.channel.sendTyping();
    const response = await agentPipeline.execute({
      userId,
      userMessage: text,
      mediaType: 'text',
      correlationId: `discord_txt_${Date.now()}`,
    });
    await message.reply(response);
  }
}

async function handleAttachment(message: Message, attachment: Attachment, caption: string): Promise<void> {
  const ext = path.extname(attachment.name || '').toLowerCase();
  const tempPath = path.join(config.paths.temp, `discord_${Date.now()}_${sanitizeFileName(attachment.name || 'file')}`);
  ensureDir(config.paths.temp);

  try {
    await downloadFile(attachment.url, tempPath);
    discordLogger.info(`Downloaded: ${attachment.name} (${ext})`);

    if (IMAGE_EXTENSIONS.includes(ext)) {
      await message.channel.sendTyping();
      await message.reply('🖼️ Analisando imagem...');
      const response = await agentPipeline.execute({
        userId: message.author.id,
        userMessage: caption || 'Descreva ou analise esta imagem.',
        mediaType: 'image',
        imagePath: tempPath,
        correlationId: `discord_img_${Date.now()}`,
      });
      await message.reply(response);

    } else if (AUDIO_EXTENSIONS.includes(ext)) {
      await message.channel.sendTyping();
      await message.reply('🎤 Processando áudio...');
      await processDiscordAudio(message, tempPath);

    } else if (SUPPORTED_EXTENSIONS.includes(ext)) {
      await message.channel.sendTyping();
      await message.reply(`📄 Extraindo: ${attachment.name}...`);
      const content = await extractTextFromFile(tempPath);
      const truncated = truncateContent(content, 15000);
      const response = await agentPipeline.execute({
        userId: message.author.id,
        userMessage: caption || `Analise o arquivo: ${attachment.name}`,
        mediaContext: truncated,
        mediaType: 'document',
        correlationId: `discord_doc_${Date.now()}`,
      });
      await message.reply(response);

    } else {
      await message.reply(`Formato não suportado: ${ext}`);
    }
  } catch (err: any) {
    discordLogger.error(`Attachment error: ${err.message}`);
    await message.reply(`Erro: ${err.message}`);
  } finally {
    cleanupTempFile(tempPath);
  }
}

async function processDiscordAudio(message: Message, audioPath: string): Promise<void> {
  const fs = require('fs');

  const transcribeWithOpenAI = async () => {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: config.llm.openai.apiKey || config.llm.deepseek.apiKey });
    const file = fs.createReadStream(audioPath);
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'pt',
      response_format: 'text',
    });
    return transcription || '';
  };

  const transcribeWithWhisper = async () => {
    const { execSync } = require('child_process');
    const result = execSync(
      `python -m whisper "${audioPath}" --model base --language pt --output_format txt`,
      { timeout: 180000 }
    );
    const outputTxt = audioPath.replace(/\.[^.]+$/, '.txt');
    if (fs.existsSync(outputTxt)) {
      const text = fs.readFileSync(outputTxt, 'utf-8').trim();
      fs.unlinkSync(outputTxt);
      if (text) return text;
    }
    return result.toString().trim();
  };

  let transcript: string;
  try {
    transcript = config.transcription.mode === 'local'
      ? await transcribeWithWhisper()
      : await transcribeWithOpenAI();
  } catch {
    transcript = config.transcription.mode === 'local'
      ? await transcribeWithOpenAI()
      : await transcribeWithWhisper();
  }

  if (!transcript || transcript.length < 2) {
    await message.reply('Não foi possível transcrever o áudio.');
    return;
  }

  discordLogger.info(`Transcribed audio: "${transcript.slice(0, 80)}..."`);

  const response = await agentPipeline.execute({
    userId: message.author.id,
    userMessage: transcript,
    mediaContext: `[Transcrição: ${transcript}]`,
    mediaType: 'audio',
    correlationId: `discord_audio_${Date.now()}`,
  });

  await message.reply(response);
}
