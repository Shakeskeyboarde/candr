import { LogLevel } from './log-level.js';
import { type LogLevelName } from './log-level-name.js';

export const LOG_LEVEL_NAMES = Object.keys(LogLevel)
  .filter((value): value is LogLevelName => Number.isNaN(Number.parseInt(value)));
