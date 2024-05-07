export class AsyncThrottle {
  #timestamp = 0;
  #delayMs = 0;
  #pending = 0;

  get delayMs(): number {
    return this.#delayMs;
  }

  set delayMs(value: number) {
    this.#delayMs = Math.max(0, value || 0);
  }

  async promise(): Promise<void> {
    const remaining = (this.#timestamp + (this.delayMs * ++this.#pending)) - Date.now();

    this.#timestamp = Date.now();

    if (remaining <= 0) return;

    return await new Promise((resolve) => {
      setTimeout(() => {
        --this.#pending;
        resolve();
      }, remaining);
    });
  }
}
