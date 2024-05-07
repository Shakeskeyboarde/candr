import stream from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

const pendingFlushes = new Set<() => void>();

process.setMaxListeners(process.getMaxListeners() + 1);
process.on('exit', () => {
  for (const flush of pendingFlushes) {
    flush();
  }
});

export class LogWritable extends stream.Writable {
  readonly #prefix: string;
  readonly #writable: stream.Writable;
  readonly #decoder = new StringDecoder();
  #buffer = '';
  #timeout: NodeJS.Timeout | undefined;

  constructor(prefix: string, writable: stream.Writable) {
    super({ decodeStrings: true });
    this.#prefix = prefix;
    this.#writable = writable;
  }

  override _write(chunk: any, _: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#buffer += this.#decoder.write(chunk);
    clearTimeout(this.#timeout);
    this.#timeout = setTimeout(this.flush, 10);
    pendingFlushes.add(this.flush);
    callback();
  }

  override _final(callback: stream.TransformCallback): void {
    clearTimeout(this.#timeout);
    pendingFlushes.delete(this.flush);
    this.flush();
    callback();
  }

  flush = (): void => {
    clearTimeout(this.#timeout);
    pendingFlushes.delete(this.flush);

    const flushed = (this.#buffer + this.#decoder.end())
      // Omit blank lines.
      .replaceAll(/(?<=^|\n)\s*(?:\n|$)|[\r\n]+$/gu, '');

    this.#buffer = '';

    if (flushed) {
      const text = flushed
        // Prefix non-blank lines.
        .replaceAll(/(?<=^|\n)/gu, this.#prefix);

      this.#writable.write(text + '\n');
    }
  };
}
