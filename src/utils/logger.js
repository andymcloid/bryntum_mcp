/**
 * Logger Utility
 *
 * Centralized logging using Pino.
 * Follows Single Responsibility Principle (SRP).
 */
import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logging.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

/**
 * Create a child logger with additional context
 * @param {object} bindings - Additional context to bind to logger
 * @returns {pino.Logger}
 */
export function createLogger(bindings) {
  return logger.child(bindings);
}
