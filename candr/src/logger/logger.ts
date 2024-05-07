import type stream from 'node:stream';

import chalk from 'chalk';

import { getLogLevel } from './get-log-level.js';
import { LogLevel } from './log-level.js';
import { type LogLevelName } from './log-level-name.js';
import { LogWritable } from './log-writable.js';
import { type LoggerOptions } from './logger-options.js';

const LOG_LEVEL_VAR = 'CANDR_LOG_LEVEL';

export class Logger implements LoggerOptions {
  readonly #stdout: LogWritable;
  readonly #stderr: LogWritable;
  readonly #prefix: string;

  readonly tag: string;

  constructor({ tag = '' }: LoggerOptions = {}) {
    this.tag = tag;
    this.#prefix = tag && chalk.dim(`[${tag.trim()}] `);
    this.#stdout = new LogWritable(this.#prefix, process.stdout);
    this.#stderr = new LogWritable(this.#prefix, process.stderr);
  }

  readonly info = (message: string): void => {
    if (Logger.#level <= LogLevel.info) {
      this.#stdout.write(message + '\n');
    }
  };

  readonly warn = (message: string): void => {
    if (Logger.#level <= LogLevel.warn) {
      this.#stderr.write(chalk.yellow(`<warn> ${message}`) + '\n');
    }
  };

  readonly error = (message: unknown): void => {
    if (Logger.#level <= LogLevel.error) {
      this.#stderr.write(chalk.red(message instanceof Error
        ? process.env.DEBUG && message.stack
          ? message.stack
          : `<error> ${message.message}`
        : `<error> ${message}`) + '\n');
    }
  };

  readonly getStdout = (): stream.Writable => {
    return new LogWritable(this.#prefix, process.stdout);
  };

  readonly getStderr = (): stream.Writable => {
    return new LogWritable(this.#prefix, process.stderr);
  };

  readonly flush = (): void => {
    this.#stdout.flush();
    this.#stderr.flush();
  };

  static #level = getLogLevel(process.env[LOG_LEVEL_VAR]) ?? LogLevel.info;

  static get level(): LogLevelName {
    return LogLevel[Logger.#level] as LogLevelName;
  }

  static readonly setLevel = (level: LogLevel | LogLevelName): void => {
    const value = getLogLevel(level) ?? LogLevel.info;

    if (value != null) {
      process.env[LOG_LEVEL_VAR] = LogLevel[this.#level = value];
    }
  };
}
