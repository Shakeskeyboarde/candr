import { type SpawnOutput } from './spawn-output.js';

export interface SpawnResult {
  readonly stdout: SpawnOutput;
  readonly stderr: SpawnOutput;
  readonly all: SpawnOutput;
  readonly ok: boolean;
  readonly exitCode: number | undefined;
  readonly signal: NodeJS.Signals | undefined;
  readonly error: unknown;
}
