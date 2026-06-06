import { Context } from 'telegraf';
import { config } from '../config';
import { logger } from '../utils/logger';
import { RateLimiter } from '../utils/rate-limiter';
import { AuthenticationError, RateLimitError } from '../utils/errors';

const rateLimiter = new RateLimiter(
  config.security.rateLimitMax,
  config.security.rateLimitWindowMs
);

export async function authMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    logger.warn('Message from unknown user (no user ID)');
    return;
  }

  const userIdStr = String(userId);
  const allowedIds = config.telegram.allowedUserIds;

  if (allowedIds.length > 0 && !allowedIds.includes(userIdStr)) {
    logger.warn(`Unauthorized access from user ${userId}`);
    try {
      await ctx.reply('⛔ Acesso não autorizado.');
    } catch {
      // Ignore reply errors for unauthorized users
    }
    return;
  }

  return next();
}

export async function rateLimitMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  const userId = String(ctx.from?.id || 'unknown');

  try {
    rateLimiter.check(userId);
    return next();
  } catch (err) {
    if (err instanceof RateLimitError) {
      try {
        await ctx.reply(err.message);
      } catch {
        // Ignore
      }
      return;
    }
    throw err;
  }
}
