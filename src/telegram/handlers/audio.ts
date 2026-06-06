import { Context } from 'telegraf';
import path from 'path';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { createContextLogger } from '../../utils/logger';
import { ensureDir, downloadFile, cleanupTempFile } from '../../utils/file';
import { agentPipeline } from '../../agent';
import { TranscriptionError } from '../../utils/errors';

const audioLogger = createContextLogger('audio-handler');

async function transcribeWithWhisper(audioPath: string): Promise<string> {
  const { execSync } = require('child_process');

  try {
    audioLogger.info('Transcribing with local Whisper...');
    const result = execSync(
      `python -m whisper "${audioPath}" --model base --language pt --output_format txt`,
      { timeout: 180000, maxBuffer: 10 * 1024 * 1024 }
    );

    const outputTxt = audioPath.replace(/\.[^.]+$/, '.txt');
    const fs = require('fs');
    if (fs.existsSync(outputTxt)) {
      const text = fs.readFileSync(outputTxt, 'utf-8').trim();
      fs.unlinkSync(outputTxt);
      if (text) return text;
    }

    return result.toString().trim();
  } catch (err: any) {
    audioLogger.warn(`Local Whisper failed: ${err.message}`);
    throw err;
  }
}

async function transcribeWithOpenAI(audioPath: string): Promise<string> {
  const OpenAI = require('openai');
  const apiKey = config.llm.openai.apiKey;

  if (!apiKey) {
    throw new TranscriptionError(
      'OpenAI API key required for transcription. Set OPENAI_API_KEY or use TRANSCRIPTION_MODE=local'
    );
  }

  audioLogger.info('Transcribing with OpenAI Whisper API...');
  const openai = new OpenAI({ apiKey });
  const fs = require('fs');
  const file = fs.createReadStream(audioPath);

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'pt',
    response_format: 'text',
  });

  return transcription || '';
}

async function processAudioFile(ctx: Context, fileId: string, fileName: string): Promise<void> {
  await ctx.sendChatAction('typing');
  await ctx.reply('🎤 Processando áudio...');

  const fileLink = await ctx.telegram.getFileLink(fileId);
  if (!fileLink.href) {
    await ctx.reply('Não foi possível baixar o áudio.');
    return;
  }

  const ext = path.extname(fileLink.href) || path.extname(fileName) || '.ogg';
  const tempPath = path.join(config.paths.temp, `audio_${Date.now()}${ext}`);
  ensureDir(config.paths.temp);

  try {
    await downloadFile(fileLink.href, tempPath);
    audioLogger.info(`Downloaded: ${tempPath} (${fileName})`);

    let transcript: string;
    try {
      if (config.transcription.mode === 'local') {
        transcript = await transcribeWithWhisper(tempPath);
      } else {
        transcript = await transcribeWithOpenAI(tempPath);
      }
    } catch {
      audioLogger.info('Primary transcription failed, trying fallback...');
      transcript = config.transcription.mode === 'local'
        ? await transcribeWithOpenAI(tempPath)
        : await transcribeWithWhisper(tempPath);
    }

    if (!transcript || transcript.length < 2) {
      await ctx.reply('Não foi possível transcrever o áudio. O conteúdo pode estar inaudível.');
      return;
    }

    audioLogger.info(`Transcribed: "${transcript.slice(0, 100)}..."`);

    const response = await agentPipeline.execute({
      userId: String(ctx.from!.id),
      userMessage: transcript,
      mediaContext: `[Transcrição de áudio: ${transcript}]`,
      mediaType: 'audio',
      correlationId: `audio_${Date.now()}`,
    });

    await ctx.reply(response);
  } catch (err: any) {
    audioLogger.error(`Audio processing error: ${err.message}`);
    await ctx.reply(`Erro ao processar áudio: ${err.message}`);
  } finally {
    cleanupTempFile(tempPath);
  }
}

export async function handleVoice(ctx: Context): Promise<void> {
  const voice = ctx.message && 'voice' in ctx.message ? ctx.message.voice : null;
  if (!voice) return;
  await processAudioFile(ctx, voice.file_id, `voice_${voice.file_unique_id}.ogg`);
}

export async function handleAudio(ctx: Context): Promise<void> {
  const audio = ctx.message && 'audio' in ctx.message ? ctx.message.audio : null;
  if (!audio) return;
  await processAudioFile(ctx, audio.file_id, audio.file_name || `audio_${audio.file_unique_id}.mp3`);
}
