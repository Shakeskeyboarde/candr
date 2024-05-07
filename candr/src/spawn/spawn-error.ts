export class SpawnError extends Error {
  readonly code?: string;

  constructor(
    cause: unknown,
    code: string | undefined,
    exitCode: number | undefined,
    signal: NodeJS.Signals | undefined,
  ) {
    super(
      signal
        ? `spawned process ${signal}`
        : exitCode
          ? `spawned process exit code ${exitCode}`
          : cause instanceof Error
            ? cause.message
            : 'spawned process error',
      { cause },
    );

    this.code = code;
  }
}
