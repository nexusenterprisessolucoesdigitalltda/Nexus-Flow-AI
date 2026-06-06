import { config } from './config';
import { logger, createContextLogger } from './utils/logger';
import { platformManager } from './platform';
import { telegramListener } from './telegram/listener';
import { discordListener } from './discord/listener';
import { skillLoader } from './skills/loader';
import { dbConnection } from './database/connection';
import { ensureDir } from './utils/file';

const mainLogger = createContextLogger('main');

const startTime = Date.now();

function validateApiKeys(): boolean {
  const hasGemini = !!config.llm.gemini.apiKey;
  const hasDeepSeek = !!config.llm.deepseek.apiKey;
  const hasOpenAI = !!config.llm.openai.apiKey;

  if (!hasGemini && !hasDeepSeek && !hasOpenAI) {
    logger.error('No LLM API keys configured. Set at least one of:');
    logger.error('  GEMINI_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY');
    return false;
  }

  return true;
}

async function main(): Promise<void> {
  logger.info('╔══════════════════════════════════════╗');
  logger.info('║        Nexus Flow v1.0.0              ║');
  logger.info('║   Multi-Platform AI Agent            ║');
  logger.info('╚══════════════════════════════════════╝');
  logger.info(`Node.js: ${process.version}`);
  logger.info(`Platform: ${process.platform}`);
  logger.info(`PID: ${process.pid}`);
  logger.info(`Active LLM: ${config.llm.active}`);
  logger.info(`Transcription: ${config.transcription.mode}`);

  if (!validateApiKeys()) {
    process.exit(1);
  }

  ensureDir(config.paths.temp);
  ensureDir(config.paths.data);
  ensureDir(config.paths.logs);

  dbConnection.initialize();
  skillLoader.initialize();

  if (config.telegram.enabled) {
    platformManager.register(telegramListener);
  } else {
    mainLogger.info('Telegram disabled (no TELEGRAM_BOT_TOKEN)');
  }

  if (config.discord.enabled) {
    platformManager.register(discordListener);
  } else {
    mainLogger.info('Discord disabled (no DISCORD_BOT_TOKEN)');
  }

  await platformManager.startAll();

  const running = platformManager.getRunning();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  mainLogger.info(`System ready in ${elapsed}s | Platforms: ${running.length}/${platformManager.getAll().length} | Skills: ${require('./skills/registry').skillRegistry.count()}`);
}

function shutdown(signal: string): void {
  mainLogger.info(`Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);

  try {
    platformManager.stopAll();
    skillLoader.stop();
    dbConnection.close();
    clearTimeout(shutdownTimeout);
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Shutdown error:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
