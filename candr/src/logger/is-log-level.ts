import { LogLevel } from './log-level.js';
import { type LogLevelName } from './log-level-name.js';

export const isLogLevel = (value: unknown): value is LogLevelName | LogLevel => {
  return (typeof value === 'string' || typeof value === 'number') && value in LogLevel;
};
