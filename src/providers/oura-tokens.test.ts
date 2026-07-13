import { describe, expect, it } from 'vitest';
import { resolveTokensFile } from './oura-tokens.js';

describe('resolveTokensFile', () => {
  it('prefers the explicit env override', () => {
    expect(resolveTokensFile({ OURA_TOKENS_FILE: '/tmp/t.json' }, true, '/home/u')).toBe(
      '/tmp/t.json',
    );
  });

  it('uses data/tokens.json when a data directory exists (VM, docker volume)', () => {
    expect(resolveTokensFile({}, true, '/home/u')).toBe('data/tokens.json');
  });

  it('falls back to the home directory when there is no data dir', () => {
    expect(resolveTokensFile({}, false, '/home/u')).toBe('/home/u/.oura-mcp/tokens.json');
  });
});
