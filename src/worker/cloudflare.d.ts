/**
 * Minimal ambient types for the Cloudflare Workers runtime — just the surface
 * this project touches. Deliberately hand-rolled instead of depending on
 * @cloudflare/workers-types: the full package's globals collide with
 * @types/node in one tsconfig, and wrangler's own build (CI dry-run) is the
 * real validator of runtime API usage.
 */
declare module 'cloudflare:workers' {
  export interface DurableObjectStorage {
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<boolean>;
  }

  export interface DurableObjectContext {
    storage: DurableObjectStorage;
  }

  export abstract class DurableObject<Env = unknown> {
    protected ctx: DurableObjectContext;
    protected env: Env;
    constructor(ctx: DurableObjectContext, env: Env);
  }
}
