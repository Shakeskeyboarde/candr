import { type LogLevelName } from '../logger/log-level-name.js';

export interface GlobalOptions {
  readonly filter: readonly string[];
  readonly filterAllowRoot: boolean;
  readonly parallel: boolean;
  readonly stream: boolean;
  readonly concurrency: number | 'auto';
  readonly delay: number;
  readonly logLevel: LogLevelName;
  readonly color: boolean;
}
