type Waiter = {
  resolve: () => void;
  signal?: AbortSignal;
  onAbort?: () => void;
};

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error("Rendering was cancelled.");
}

export class RenderQueue {
  readonly concurrent: number;
  readonly queued: number;
  private active = 0;
  private readonly waiting: Waiter[] = [];

  constructor(concurrent: number, queued: number) {
    if (!Number.isInteger(concurrent) || concurrent < 1 || !Number.isInteger(queued) || queued < 0) {
      throw new Error("Render queue capacity must use positive concurrency and a non-negative queue length.");
    }
    this.concurrent = concurrent;
    this.queued = queued;
  }

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) throw abortError(signal);
    if (this.active < this.concurrent) {
      this.active += 1;
      return this.release;
    }
    if (this.waiting.length >= this.queued) {
      throw new Error("This Mac is already rendering several diagrams. Wait for one to finish, then retry.");
    }
    await new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve, signal };
      waiter.onAbort = () => {
        const index = this.waiting.indexOf(waiter);
        if (index >= 0) this.waiting.splice(index, 1);
        reject(abortError(signal!));
      };
      signal?.addEventListener("abort", waiter.onAbort, { once: true });
      this.waiting.push(waiter);
    });
    return this.release;
  }

  readonly release = (): void => {
    const next = this.waiting.shift();
    if (next) {
      if (next.onAbort) next.signal?.removeEventListener("abort", next.onAbort);
      next.resolve();
      return;
    }
    this.active = Math.max(0, this.active - 1);
  };

  status(): { active: number; waiting: number } {
    return { active: this.active, waiting: this.waiting.length };
  }
}
