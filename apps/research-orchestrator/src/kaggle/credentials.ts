import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ── Kaggle credentials ────────────────────────────────────────────────────────
// Kaggle supports a legacy username+key (env or ~/.kaggle/kaggle.json) and a
// modern OAuth token (~/.kaggle/access_token or KAGGLE_API_TOKEN). Resolution is
// never network-bound and never logs a secret value — callers get the shape and
// the source, and the header builder is the only place the secret is touched.

export type KaggleCredentialSource = 'env-username-key' | 'env-token' | 'file-kaggle-json' | 'file-access-token';

export interface KaggleCredentials {
  kind: 'basic' | 'bearer';
  username?: string;
  key?: string;
  token?: string;
  source: KaggleCredentialSource;
}

export interface ResolveKaggleOptions {
  env?: NodeJS.ProcessEnv;
  home?: string;
  configDir?: string;
}

/** env (token, then username+key) wins; else access_token, else kaggle.json. */
export function resolveKaggleCredentials(opts: ResolveKaggleOptions = {}): KaggleCredentials | null {
  const env = opts.env ?? process.env;
  const token = (env.KAGGLE_API_TOKEN ?? '').trim();
  if (token) return { kind: 'bearer', token, source: 'env-token' };
  const u = (env.KAGGLE_USERNAME ?? '').trim();
  const k = (env.KAGGLE_KEY ?? '').trim();
  if (u && k) return { kind: 'basic', username: u, key: k, source: 'env-username-key' };

  const home = opts.home ?? os.homedir();
  const configDir = opts.configDir ?? (env.KAGGLE_CONFIG_DIR || (home ? path.join(home, '.kaggle') : ''));
  if (!configDir) return null;

  const candidates: Array<{ p: string; src: KaggleCredentialSource }> = [
    { p: path.join(configDir, 'kaggle.json'), src: 'file-kaggle-json' },
    { p: path.join(configDir, 'access_token'), src: 'file-access-token' },
  ];
  for (const { p, src } of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '').trim();
      if (!raw) continue;
      if (src === 'file-kaggle-json') {
        const j = JSON.parse(raw) as { username?: string; key?: string };
        if (j.username && j.key) return { kind: 'basic', username: j.username, key: j.key, source: src };
      } else {
        return { kind: 'bearer', token: raw, source: src };
      }
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** The ONLY place a Kaggle secret is turned into a header. Never log the result. */
export function kaggleAuthHeader(creds: KaggleCredentials | null): Record<string, string> {
  if (!creds) return {};
  if (creds.kind === 'bearer' && creds.token) return { Authorization: `Bearer ${creds.token}` };
  if (creds.kind === 'basic' && creds.username && creds.key) {
    return { Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.key}`).toString('base64')}` };
  }
  return {};
}

/** Redacted descriptor safe to return from an HTTP endpoint. */
export function kaggleCredentialsStatus(creds: KaggleCredentials | null): { configured: boolean; kind?: string; source?: string; username?: string } {
  if (!creds) return { configured: false };
  return { configured: true, kind: creds.kind, source: creds.source, ...(creds.username ? { username: creds.username } : {}) };
}