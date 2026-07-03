import { existsSync } from 'node:fs';

let loaded = false;

/** Load .env once, if present. Node 22 built-in, no dotenv dependency. */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name} (see .env.example)`);
  }
  return value;
}
