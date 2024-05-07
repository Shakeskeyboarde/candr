import { isLogLevel } from './is-log-level.js';
import { LogLevel } from './log-level.js';

export const getLogLevel = (level: LogLevel | string | undefined): LogLevel | null => {
  if (!isLogLevel(level)) return LogLevel.info;
  if (typeof level === 'string') return LogLevel[level];

  return level;
};
