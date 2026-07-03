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
  // Fire-and-forget: the feedback loop must never slow down or break a tool call.
  void mkdir('data', { recursive: true })
    .then(() => appendFile(USAGE_FILE, JSON.stringify(record) + '\n'))
    .catch(() => {});
}
