import { describe, it, expect } from 'vitest';
import { kaggleMcpConfig, kaggleMcpToolCount, KAGGLE_MCP_URL, KAGGLE_MCP_SURFACE } from './mcp.js';

describe('kaggle mcp config', () => {
  it('builds an http config with no auth when unconfigured', () => {
    expect(kaggleMcpConfig(null)).toEqual({ mcpServers: { kaggle: { url: KAGGLE_MCP_URL } } });
  });

  it('includes the bearer header only when a credential exists', () => {
    const cfg = kaggleMcpConfig({ kind: 'bearer', token: 't', source: 'env-token' });
    expect(cfg.mcpServers.kaggle.headers).toEqual({ authorization: 'Bearer t' });
  });

  it('builds a stdio config via npx mcp-remote', () => {
    const cfg = kaggleMcpConfig({ kind: 'bearer', token: 't', source: 'env-token' }, { transport: 'stdio' });
    expect(cfg.mcpServers.kaggle.command).toBe('npx');
    expect(cfg.mcpServers.kaggle.args).toContain('mcp-remote');
    expect(cfg.mcpServers.kaggle.args).toContain(KAGGLE_MCP_URL);
    expect(cfg.mcpServers.kaggle.args).toEqual(expect.arrayContaining(['--header', 'Authorization: Bearer t']));
  });

  it('exposes a non-empty tool catalog', () => {
    expect(kaggleMcpToolCount()).toBeGreaterThan(0);
    expect(KAGGLE_MCP_SURFACE.some((d) => d.domain === 'benchmarks')).toBe(true);
  });
});