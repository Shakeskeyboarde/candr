import type stream from 'node:stream';

import { type Logger } from '../logger/logger.js';

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  path?: (string | null | undefined | false | 0 | 0n)[];
  stdin?: 'inherit' | 'ignore' | Uint8Array | stream.Readable | { text: string };
  stdout?:
    | 'inherit'
    | 'ignore'
    | 'pipe'
    | ((chunk: Buffer) => void)
    | NodeJS.WritableStream
    | Partial<Pick<Logger, 'getStdout' | 'getStderr'>>;
  stderr?:
    | 'inherit'
    | 'ignore'
    | 'pipe'
    | ((chunk: Buffer) => void)
    | NodeJS.WritableStream
    | Partial<Pick<Logger, 'getStdout' | 'getStderr' >>;
  shell?: boolean;
  /**
   * Default value for `nonZeroResolve` and `errorResolve`.
   */
  failureResolve?: boolean;
  /**
   * Set the process exit code if the spawned process fails for any reason.
   */
  failureSetExit?: boolean;
  /**
   * Do not throw an error if the process exits with a non-zero exit code.
   */
  nonZeroResolve?: boolean;
  /**
   * Print all output to the console if the process exits with a non-zero exit
   * code.
   */
  nonZeroPrint?: boolean;
  /**
   * Do not throw an error if spawning the process throws an error.
   */
  errorResolve?: boolean;
}
