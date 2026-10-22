import { kaggleAuthHeader, type KaggleCredentials } from './credentials.js';

// ── Kaggle MCP (official remote server) ───────────────────────────────────────
// Kaggle exposes an official remote MCP server at https://www.kaggle.com/mcp
// (HTTP, OAuth/bearer). It covers datasets, models, notebooks, competitions,
// benchmarks and discussions. This module builds the harness config and a static
// catalog; it does not itself speak MCP (the harness does).
// Source: https://www.kaggle.com/docs/mcp (primary, read 2026-10-07).

export const KAGGLE_MCP_URL = 'https://www.kaggle.com/mcp';

export interface KaggleMcpClientConfig {
  mcpServers: {
    kaggle: {
      url?: string;
      command?: string;
      args?: string[];
      headers?: Record<string, string>;
    };
  };
}

/**
 * Build a client config for the Kaggle MCP server. `http` is the native remote
 * transport; `stdio` wraps it for clients that only speak stdio (npx mcp-remote).
 * The bearer header is included only when a credential exists.
 */
export function kaggleMcpConfig(creds: KaggleCredentials | null, opts: { transport?: 'http' | 'stdio' } = {}): KaggleMcpClientConfig {
  const headers = kaggleAuthHeader(creds);
  const auth = headers.Authorization;
  if ((opts.transport ?? 'http') === 'stdio') {
    const args = ['-y', 'mcp-remote', KAGGLE_MCP_URL];
    if (auth) args.push('--header', `Authorization: ${auth}`);
    return { mcpServers: { kaggle: { command: 'npx', args } } };
  }
  return { mcpServers: { kaggle: { url: KAGGLE_MCP_URL, ...(auth ? { headers: { authorization: auth } } : {}) } } };
}

/** Representative tool surface from the docs (not exhaustive). */
export const KAGGLE_MCP_SURFACE: Array<{ domain: string; tools: string[] }> = [
  { domain: 'notebooks', tools: ['search_notebooks', 'download_notebook_output'] },
  { domain: 'datasets', tools: ['list_datasets', 'get_dataset', 'download_dataset'] },
  { domain: 'models', tools: ['list_models', 'get_model', 'download_model'] },
  { domain: 'competitions', tools: ['list_competitions', 'get_competition', 'get_competition_leaderboard'] },
  { domain: 'benchmarks', tools: ['get_benchmark_leaderboard', 'list_benchmark_tasks'] },
  { domain: 'discussions', tools: ['list_discussions'] },
];

export function kaggleMcpToolCount(): number {
  return KAGGLE_MCP_SURFACE.reduce((n, d) => n + d.tools.length, 0);
}