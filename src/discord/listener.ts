import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import { config } from '../config';
import { logger, createContextLogger } from '../utils/logger';
import { BotPlatform } from '../platform';
import { handleDiscordMessage } from './handlers/message';

const discordLogger = createContextLogger('discord');

class DiscordListener implements BotPlatform {
  readonly name = 'discord';

  private client: Client;
  private _isRunning = false;
  private startTime = 0;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
      ],
    });

    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.client.once('ready', () => {
      this._isRunning = true;
      this.startTime = Date.now();

      if (this.client.user) {
        this.client.user.setPresence({
          activities: [{ name: 'Nexus Flow', type: ActivityType.Playing }],
          status: 'online',
        });

        discordLogger.info(`Bot logged in as ${this.client.user.tag}`);
        discordLogger.info(`Servers: ${this.client.guilds.cache.size}`);
      }
    });

    this.client.on('messageCreate', (message) => {
      handleDiscordMessage(message).catch((err) => {
        discordLogger.error('Message handler error:', err);
      });
    });

    this.client.on('error', (err) => {
      discordLogger.error('Client error:', err);
    });

    this.client.on('warn', (warning) => {
      discordLogger.warn('Client warning:', warning);
    });
  }

  async start(): Promise<void> {
    if (this._isRunning) return;

    try {
      await this.client.login(config.discord.botToken);
      discordLogger.info('Discord bot connecting...');
    } catch (err: any) {
      discordLogger.error(`Failed to login: ${err.message}`);
      throw err;
    }
  }

  stop(): void {
    if (this._isRunning) {
      this.client.destroy();
      this._isRunning = false;
      discordLogger.info('Discord bot stopped');
    }
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  getInfo() {
    return {
      name: 'discord',
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
    };
  }
}

export const discordListener = new DiscordListener();
