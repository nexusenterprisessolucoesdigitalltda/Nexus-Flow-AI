import { Telegraf, Context } from 'telegraf';
import { config } from '../config';
import { logger, createContextLogger } from '../utils/logger';
import { BotPlatform } from '../platform';
import { authMiddleware, rateLimitMiddleware } from './middleware';
import { handleText } from './handlers/text';
import { handleVoice, handleAudio } from './handlers/audio';
import { handleDocument } from './handlers/document';
import { handlePhoto } from './handlers/image';

const botLogger = createContextLogger('telegram');

class TelegramListener implements BotPlatform {
  readonly name = 'telegram';

  private bot: Telegraf;
  private _isRunning = false;
  private startTime = 0;

  constructor() {
    if (!config.telegram.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new Telegraf(config.telegram.botToken);
    this.registerMiddlewares();
    this.registerHandlers();
    this.registerErrorHandler();
  }

  private registerMiddlewares(): void {
    this.bot.use(authMiddleware);
    this.bot.use(rateLimitMiddleware);
  }

  private registerHandlers(): void {
    this.bot.start((ctx) => {
      const welcome = `Olá ${ctx.from?.first_name || 'usuário'}! Eu sou o Nexus Flow. Use /help para comandos.`;
      return ctx.reply(welcome);
    });

    this.bot.on('text', (ctx) => handleText(ctx));
    this.bot.on('voice', (ctx) => handleVoice(ctx));
    this.bot.on('audio', (ctx) => handleAudio(ctx));
    this.bot.on('document', (ctx) => handleDocument(ctx));
    this.bot.on('photo', (ctx) => handlePhoto(ctx));
  }

  private registerErrorHandler(): void {
    this.bot.catch((err: any, ctx: Context) => {
      botLogger.error(`Telegram error for ${ctx.updateType}:`, err);
      ctx.reply('Ocorreu um erro interno. Tente novamente.').catch(() => {});
    });
  }

  async start(): Promise<void> {
    if (this._isRunning) return;

    try {
      const botInfo = await this.bot.telegram.getMe();
      this.bot.botInfo = botInfo;

      await this.bot.launch({
        dropPendingUpdates: true,
      });

      this._isRunning = true;
      this.startTime = Date.now();

      botLogger.info(`Bot started: @${botInfo.username} (ID: ${botInfo.id})`);
      botLogger.info(`Listening for messages from ${config.telegram.allowedUserIds.length} authorized user(s)...`);
    } catch (err: any) {
      botLogger.error(`Failed to start bot: ${err.message}`);
      throw err;
    }
  }

  stop(): void {
    if (this._isRunning) {
      this.bot.stop();
      this._isRunning = false;
      botLogger.info('Bot stopped');
    }
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  getInfo() {
    return {
      name: 'telegram',
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
    };
  }
}

export const telegramListener = new TelegramListener();
