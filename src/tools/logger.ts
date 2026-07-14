import { appendFile, mkdir } from 'node:fs/promises';

/**
 * Usage log for the feedback loop: which tools the client model calls, with what
 * arguments, how fast, and whether they errored. METADATA ONLY — never response
 * bodies or any health values. Lives in data/ (gitignored).
 */

const USAGE_FILE = 'data/usage.jsonl';

export interface UsageRecord {
  ts: string;
  tool: string;
  args: Record<string, unknown>;
  ms: number;
  error: boolean;
  bytes: number;
}

export function logUsage(record: UsageRecord): void {
  // Fire-and-forget: the feedback loop must never slow down or break a tool
  // call. The sync try/catch matters too: on runtimes without a filesystem
  // (Cloudflare Workers), the fs stubs throw synchronously instead of
  // returning a rejected promise.
  try {
    void mkdir('data', { recursive: true })
      .then(() => appendFile(USAGE_FILE, JSON.stringify(record) + '\n'))
      .catch(() => {});
  } catch {
    // No filesystem — skip usage logging.
  }
}
