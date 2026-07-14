import { describe, expect, it } from 'vitest';
import { connectSteps, setSetupKind } from './setup-guide.js';

describe('connectSteps', () => {
  it('gives extension users the Configure-dialog path, not env vars', () => {
    setSetupKind('extension');
    const steps = connectSteps();
    expect(steps).toContain('Extensions -> oura-mcp -> Configure');
    expect(steps).not.toContain('Cloudflare');
  });

  it('gives worker users the Cloudflare + /oauth/start path, not extension config', () => {
    setSetupKind('worker');
    const steps = connectSteps();
    expect(steps).toContain('Cloudflare Worker');
    expect(steps).toContain('/oauth/start');
    expect(steps).not.toContain('Extensions -> oura-mcp -> Configure');
  });

  it('defaults self-hosters to get-token', () => {
    setSetupKind('selfhost');
    expect(connectSteps()).toContain('npm run get-token');
  });
});
