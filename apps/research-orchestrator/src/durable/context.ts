// ── Durable execution: the context contract ──────────────────────────────────
// A durable workflow may only take side effects through ctx.task(name, input),
// and may only wait through ctx.sleepFor(ms). Every task result is journalled;
// on replay the completed tasks are served from the journal and their side
// effects are NOT re-run. This is the determinism rule Hatchet enforces, and it
// maps 1:1 onto Hatchet's model: a "task" here is a registered child task that
// Hatchet spawns and checkpoints (ctx.spawnChild), and sleepFor is durable.
//
// The implementation of each task lives in a TaskRegistry keyed by name, so the
// workflow body never closes over side effects — it names them.

export type DurableEventKind = 'task' | 'sleep';

export interface DurableEvent {
  kind: DurableEventKind;
  name: string;
  /** Present for `task` events. */
  result?: unknown;
  /** Present for `sleep` events. */
  ms?: number;
}

export interface DurableContext {
  /** Run a side-effecting step once; replay serves the recorded result. */
  task<T>(name: string, input: unknown): Promise<T>;
  /** Durable sleep: the run is evicted and costs no worker capacity while it waits. */
  sleepFor(ms: number): Promise<void>;
}

export type TaskImpl = (input: unknown) => Promise<unknown> | unknown;
export type TaskRegistry = Record<string, TaskImpl>;

/** Thrown when a replay reaches a step that does not match the journal. */
export class NonDeterminismError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonDeterminismError';
  }
}

/** Thrown to simulate a process death mid-run in tests. */
export class SimulatedCrash extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimulatedCrash';
  }
}

export interface MemoryContextOptions {
  /** The task implementations this run may call. */
  registry: TaskRegistry;
  /** Throw a SimulatedCrash after this many task results have been journalled. */
  crashAfterTasks?: number;
  /** Replay from a recorded journal instead of executing side effects. */
  replayFrom?: DurableEvent[];
  onSleep?: (ms: number) => void;
}

export class MemoryDurableContext implements DurableContext {
  private readonly events: DurableEvent[] = [];
  private readonly registry: TaskRegistry;
  private readonly replaying: DurableEvent[] | null;
  private readonly crashAfterTasks: number;
  private readonly onSleep?: (ms: number) => void;
  private cursor = 0;
  private taskCount = 0;

  constructor(opts: MemoryContextOptions) {
    this.registry = opts.registry;
    this.replaying = opts.replayFrom ?? null;
    this.crashAfterTasks = opts.crashAfterTasks ?? Number.POSITIVE_INFINITY;
    this.onSleep = opts.onSleep;
  }

  async task<T>(name: string, input: unknown): Promise<T> {
    const index = this.cursor;
    const journaled = this.replaying?.[index];
    if (journaled) {
      if (journaled.kind !== 'task' || journaled.name !== name) {
        throw new NonDeterminismError(
          `at step ${index}: journal has ${journaled.kind}/${journaled.name}, replay called task/${name}`,
        );
      }
      this.cursor += 1;
      this.events.push(journaled);
      return journaled.result as T;
    }

    const impl = this.registry[name];
    if (!impl) throw new Error(`no task registered under '${name}'`);
    const result = await impl(input);
    this.events.push({ kind: 'task', name, result });
    this.cursor += 1;
    this.taskCount += 1;
    if (this.taskCount >= this.crashAfterTasks) {
      throw new SimulatedCrash(`simulated crash after ${this.taskCount} task(s)`);
    }
    return result as T;
  }

  async sleepFor(ms: number): Promise<void> {
    const index = this.cursor;
    const journaled = this.replaying?.[index];
    if (journaled) {
      if (journaled.kind !== 'sleep') {
        throw new NonDeterminismError(`at step ${index}: journal has ${journaled.kind}, replay called sleep`);
      }
      this.cursor += 1;
      this.events.push(journaled);
      return;
    }
    this.onSleep?.(ms);
    this.events.push({ kind: 'sleep', name: 'sleepFor', ms });
    this.cursor += 1;
  }

  /** The append-only journal produced by this run (or consumed on replay). */
  get journal(): DurableEvent[] {
    return [...this.events];
  }
}
