import path from 'node:path';

import { supportsColor } from 'chalk';
import { execa, ExecaError, type Options } from 'execa';

import { Logger } from '../logger/logger.js';
import { escapeArgs } from './escape-args.js';
import { type SpawnArgs } from './spawn-args.js';
import { SpawnError } from './spawn-error.js';
import { type SpawnOptions } from './spawn-options.js';
import { SpawnOutput } from './spawn-output.js';
import { type SpawnResult } from './spawn-result.js';

export const spawn = async (
  command: string,
  args: SpawnArgs = [],
  {
    cwd,
    env,
    path: envPath = [],
    stdin = 'ignore',
    stdout = 'pipe',
    stderr = stdout,
    shell = false,
    failureSetExit = false,
    failureResolve = false,
    nonZeroResolve = failureResolve,
    nonZeroPrint = false,
    errorResolve = failureResolve,
  }: SpawnOptions = {},
): Promise<SpawnResult> => {
  const chunks: { buffer: Buffer; stream: 'stdout' | 'stderr' }[] = [];

  const flatArgs = (Array.isArray(args) ? args : [args])
    .flatMap(function _recurse(this: void, arg): string[] {
      if (arg == null || arg === false) return [];
      if (Array.isArray(arg)) return arg.flatMap(_recurse);
      if (typeof arg === 'object') return Object.entries(arg).flatMap(([key, value]) => {
        if (value === true) return [key];
        if (value == null || value === false) return [];
        if (Array.isArray(value)) return _recurse(value).flatMap((value0) => [key, value0]);
        return [key, String(value)];
      });
      return [String(arg)];
    });

  const [stdinType, input] = stdin === 'ignore' || stdin === 'inherit'
    ? [stdin] as const
    : ['pipe', 'text' in stdin
      ? stdin.text
      : stdin] as const;

  const [stdoutType, stdoutCallback, stdoutStream] = typeof stdout === 'string'
    ? [stdout] as const
    : typeof stdout === 'function'
      ? ['pipe', stdout] as const
      : ['pipe', undefined, 'write' in stdout
        ? stdout
        : stdout.getStdout?.()] as const;

  const [stderrType, stderrCallback, stderrStream] = typeof stderr === 'string'
    ? [stderr] as const
    : typeof stderr === 'function'
      ? ['pipe', stderr] as const
      : ['pipe', undefined, 'write' in stderr
        ? stderr
        : stderr.getStderr?.()] as const;

  const execaOptions: Options = {
    cwd,
    env: {
      FORCE_COLOR: process.env.FORCE_COLOR ?? (
        supportsColor && (stdout === 'inherit' || stdout instanceof Logger)
          ? '1'
          : undefined
      ),
      ...env,
      PATH: [...envPath, process.env.PATH].filter(Boolean).join(path.delimiter),
    },
    extendEnv: true,
    input,
    stdio: [stdinType, stdoutType, stderrType],
    shell,
    encoding: 'buffer',
    // Candr sets up the PATH so that only project root binaries are available.
    preferLocal: false,
    reject: false,
  };

  const promise = execa(command, shell ? escapeArgs(flatArgs) : flatArgs, execaOptions);

  if (stdoutStream) promise.stdout?.pipe(stdoutStream);
  if (stderrStream) promise.stderr?.pipe(stderrStream);

  promise.stdout?.on('data', (buffer: Buffer) => {
    stdoutCallback?.(buffer);
    chunks.push({ buffer, stream: 'stdout' });
  });

  promise.stderr?.on('data', (buffer) => {
    stderrCallback?.(buffer);
    chunks.push({ buffer, stream: 'stderr' });
  });

  const result = await promise;

  if (result instanceof ExecaError) {
    if (failureSetExit)
      process.exitCode ||= result.exitCode || 1;

    if (result.exitCode != null && result.exitCode !== 0) {
      if (nonZeroPrint) {
        chunks.forEach(({ buffer, stream }) => process[stream].write(buffer));
      }

      if (!nonZeroResolve) {
        throw new SpawnError(result.cause, result.code, result.exitCode, result.signal);
      }
    }
    else if (!errorResolve) {
      throw new SpawnError(result.cause, result.code, result.exitCode, result.signal);
    }
  }

  return {
    stdout: new SpawnOutput(() => Buffer.concat(chunks
      .filter(({ stream }) => stream === 'stdout')
      .map(({ buffer }) => buffer))),
    stderr: new SpawnOutput(() => Buffer.concat(chunks
      .filter(({ stream }) => stream === 'stderr')
      .map(({ buffer }) => buffer))),
    all: new SpawnOutput(() => Buffer.concat(chunks
      .map(({ buffer }) => buffer))),
    ok: !result.failed,
    exitCode: result.exitCode,
    signal: result.signal,
    error: result.cause,
  };
};
