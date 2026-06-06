import { BotPlatform } from './types';
import { logger, createContextLogger } from '../utils/logger';

const platformLogger = createContextLogger('platform');

class PlatformManager {
  private platforms: Map<string, BotPlatform> = new Map();

  register(platform: BotPlatform): void {
    this.platforms.set(platform.name, platform);
    platformLogger.info(`Registered: ${platform.name}`);
  }

  async startAll(): Promise<void> {
    for (const [name, platform] of this.platforms) {
      try {
        await platform.start();
        platformLogger.info(`${name} started successfully`);
      } catch (err: any) {
        platformLogger.error(`Failed to start ${name}: ${err.message}`);
      }
    }

    const running = this.getRunning();
    platformLogger.info(`Platforms running: ${running.length} of ${this.platforms.size}`);
  }

  stopAll(): void {
    for (const [name, platform] of this.platforms) {
      try {
        platform.stop();
        platformLogger.info(`${name} stopped`);
      } catch (err: any) {
        platformLogger.error(`Error stopping ${name}: ${err.message}`);
      }
    }
  }

  get(name: string): BotPlatform | undefined {
    return this.platforms.get(name);
  }

  getAll(): BotPlatform[] {
    return Array.from(this.platforms.values());
  }

  getRunning(): BotPlatform[] {
    return this.getAll().filter(p => p.isRunning());
  }
}

export const platformManager = new PlatformManager();
export type { BotPlatform, BotMessage, PlatformAttachment, MediaType } from './types';
