import { z } from 'zod';
import { OuraApiError, SANDBOX } from '../providers/oura.js';
import { logUsage } from './logger.js';

/** Shared plumbing for all tools: date defaults, unit conversion, result shaping. */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Standard date-range params for daily endpoints. */
export const dateParams = {
  start_date: z
    .string()
    .regex(DATE_RE)
    .optional()
    .describe('First day, YYYY-MM-DD. Default: 7 days ago.'),
  end_date: z.string().regex(DATE_RE).optional().describe('Last day, YYYY-MM-DD. Default: today.'),
};

export const responseFormatParam = z
  .enum(['concise', 'detailed'])
  .optional()
  .describe(
    "Verbosity. 'concise' (default) returns the key numbers; 'detailed' adds full breakdowns. Use 'concise' unless the user asks for specifics.",
  );

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days: number): string {
  return isoDate(new Date(Date.now() - days * 86_400_000));
}

export function resolveRange(
  start: string | undefined,
  end: string | undefined,
  defaultDays = 7,
): { start_date: string; end_date: string } {
  return {
    start_date: start ?? daysAgo(defaultDays),
    end_date: end ?? isoDate(new Date()),
  };
}

/** Oura reports durations in seconds; minutes read better and cost fewer tokens. */
export function toMinutes(seconds: number | null | undefined): number | null {
  return seconds == null ? null : Math.round(seconds / 60);
}

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

const DEMO_NOTE =
  'DEMO MODE: fake sample data from the public Oura sandbox, no account is connected. ' +
  'Make sure the user knows these are not their real numbers.';

const CONNECT_STEPS =
  ' If they want their real data, give them exactly these steps (do not search the web): ' +
  '1) create a free Oura app at https://cloud.ouraring.com/oauth/applications with redirect URI exactly http://localhost:8888/callback; ' +
  '2) Claude Desktop -> Settings -> Extensions -> oura-mcp -> Configure: paste the Client ID and Client Secret; ' +
  '3) ask a health question again and approve the Oura consent page that opens in the browser.';

let connectStepsSent = false;

export function jsonResult(data: unknown): ToolResult {
  // In sandbox demo mode the model must know the numbers are fake, or it will
  // present sample data as the user's own (and suggest syncing a ring that
  // does not exist). The first response of the session also carries the
  // connect walkthrough — server instructions are the primary channel for it,
  // but not every client puts them in front of the model. Top-level shape is
  // preserved: the note is one extra key.
  const payload =
    SANDBOX && data !== null && typeof data === 'object' && !Array.isArray(data)
      ? {
          sandbox_note: connectStepsSent ? DEMO_NOTE : DEMO_NOTE + CONNECT_STEPS,
          ...(data as Record<string, unknown>),
        }
      : data;
  if (SANDBOX) connectStepsSent = true;
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] };
}

export function errorResult(message: string): ToolResult {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

/**
 * Wrap a tool body: Oura errors become readable messages instead of crashes,
 * and every call lands in the usage log (metadata only, see logger.ts).
 */
export async function runTool(
  tool: string,
  args: Record<string, unknown>,
  fn: () => Promise<ToolResult>,
): Promise<ToolResult> {
  const started = Date.now();
  let result: ToolResult;
  try {
    result = await fn();
  } catch (err) {
    const message = err instanceof OuraApiError ? err.message : `Unexpected error: ${String(err)}`;
    result = errorResult(message);
  }
  logUsage({
    ts: new Date(started).toISOString(),
    tool,
    args,
    ms: Date.now() - started,
    error: result.isError === true,
    bytes: result.content[0]?.text.length ?? 0,
  });
  return result;
}

/** Resolve an allSettled result to its value or null (partial data beats no data). */
export function settled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}
