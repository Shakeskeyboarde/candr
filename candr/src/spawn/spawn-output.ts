import { tryJson } from '../util/try-json.js';

export class SpawnOutput {
  readonly #getBuffer: () => Buffer;
  #raw: Buffer | undefined;

  constructor(getBuffer: () => Buffer) {
    this.#getBuffer = getBuffer;
  }

  /**
   * Returns the output as a raw buffer.
   */
  readonly buffer = (): Buffer => {
    if (!this.#raw) {
      this.#raw = this.#getBuffer();
    }

    return this.#raw;
  };

  /**
   * Returns the output as a UTF-8 decoded string, with leading and trailing
   * whitespace removed.
   */
  readonly string = (): string => {
    return this.buffer().toString('utf-8').trim();
  };

  /**
   * Returns the output text as an array of lines, trimming whitespace and
   * removing empty lines.
   */
  readonly lines = (): string[] => {
    return this.buffer()
      .toString('utf-8')
      .split(/\r?\n/u)
      .map((value) => value.trim())
      .filter(Boolean);
  };

  /**
   * Returns the output text decoded as JSON. Returns undefined if JSON
   * parsing fails.
   */
  readonly json = <T>(predicate?: (value: unknown) => value is T): T | undefined => {
    return tryJson(this.buffer().toString('utf-8'), predicate);
  };

  /**
   * Returns the output text decoded as NDJSON (aka: newline delimited JSON).
   * Any lines that fail to parse as JSON are ignored.
   */
  readonly ndjson = <T>(predicate?: (value: unknown) => value is T): T[] => {
    return this.lines().flatMap((line) => {
      const value = tryJson(line, predicate);
      return value === undefined ? [] : [value];
    });
  };
}
