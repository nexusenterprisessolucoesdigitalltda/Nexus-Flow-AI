import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger';
import { ConfigurationError } from './utils/errors';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export type LLMProvider = 'gemini' | 'deepseek' | 'openai';
export type TranscriptionMode = 'local' | 'openai';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface ConfigSchema {
  telegram: {
    enabled: boolean;
    botToken: string;
    allowedUserIds: string[];
  };
  discord: {
    enabled: boolean;
    botToken: string;
    allowedUserIds: string[];
    commandPrefix: string;
  };
  llm: {
    active: LLMProvider;
    gemini: { apiKey: string };
    deepseek: { apiKey: string; baseUrl: string };
    openai: { apiKey: string };
  };
  transcription: {
    mode: TranscriptionMode;
  };
  agent: {
    maxHistory: number;
    maxResponseTokens: number;
    temperature: number;
  };
  paths: {
    skills: string;
    temp: string;
    data: string;
    logs: string;
  };
  security: {
    rateLimitMax: number;
    rateLimitWindowMs: number;
    maxFileSize: number;
  };
}

function readEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new ConfigurationError(`Environment variable ${key} is required but not set`);
  }
  return value;
}

function loadConfig(): ConfigSchema {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const discordToken = process.env.DISCORD_BOT_TOKEN || '';

  const config: ConfigSchema = {
    telegram: {
      enabled: !!telegramToken,
      botToken: telegramToken,
      allowedUserIds: (process.env.ALLOWED_USER_IDS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    },
    discord: {
      enabled: !!discordToken,
      botToken: discordToken,
      allowedUserIds: (process.env.DISCORD_ALLOWED_USER_IDS || process.env.ALLOWED_USER_IDS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      commandPrefix: process.env.DISCORD_COMMAND_PREFIX || '!',
    },
    llm: {
      active: (process.env.ACTIVE_LLM || 'gemini') as LLMProvider,
      gemini: { apiKey: readEnv('GEMINI_API_KEY') },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseUrl: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1',
      },
      openai: { apiKey: process.env.OPENAI_API_KEY || '' },
    },
    transcription: {
      mode: (process.env.TRANSCRIPTION_MODE || 'openai') as TranscriptionMode,
    },
    agent: {
      maxHistory: parseInt(process.env.AGENT_MAX_HISTORY || '20', 10),
      maxResponseTokens: parseInt(process.env.AGENT_MAX_TOKENS || '2048', 10),
      temperature: parseFloat(process.env.AGENT_TEMPERATURE || '0.7'),
    },
    paths: {
      skills: path.join(process.cwd(), 'agents', 'skills'),
      temp: path.join(process.cwd(), 'temp'),
      data: path.join(process.cwd(), 'data'),
      logs: path.join(process.cwd(), 'logs'),
    },
    security: {
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    },
  };

  const llmProviders: LLMProvider[] = ['gemini', 'deepseek', 'openai'];
  if (!llmProviders.includes(config.llm.active)) {
    throw new ConfigurationError(`Invalid ACTIVE_LLM: ${config.llm.active}. Options: ${llmProviders.join(', ')}`);
  }

  const transcriptionModes: TranscriptionMode[] = ['local', 'openai'];
  if (!transcriptionModes.includes(config.transcription.mode)) {
    throw new ConfigurationError(`Invalid TRANSCRIPTION_MODE: ${config.transcription.mode}`);
  }

  if (!config.telegram.enabled && !config.discord.enabled) {
    throw new ConfigurationError(
      'No platform configured. Set TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN, or both.'
    );
  }

  return config;
}

let config: ConfigSchema;

try {
  config = loadConfig();
  logger.info('Configuration loaded successfully');
  logger.info(`Active LLM: ${config.llm.active}`);
  logger.info(`Transcription: ${config.transcription.mode}`);

  const platforms = [];
  if (config.telegram.enabled) platforms.push('Telegram');
  if (config.discord.enabled) platforms.push('Discord');
  logger.info(`Platforms: ${platforms.join(' + ') || 'NONE'}`);

  const userSource = config.discord.enabled ? 'Discord' : 'Telegram';
  const ids = config.discord.enabled ? config.discord.allowedUserIds : config.telegram.allowedUserIds;
  logger.info(`Allowed users (${userSource}): ${ids.length > 0 ? ids.join(', ') : 'NONE (disabled)'}`);
} catch (err) {
  if (err instanceof ConfigurationError) {
    logger.error(`Configuration error: ${err.message}`);
  } else {
    logger.error('Unexpected configuration error:', err);
  }
  process.exit(1);
}

export { config };
export type { ConfigSchema };
