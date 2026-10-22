import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveKaggleCredentials, kaggleAuthHeader, kaggleCredentialsStatus } from './credentials.js';

const dirs: string[] = [];
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaggle-cred-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('kaggle credentials', () => {
  it('prefers an env token, then env username+key', () => {
    expect(resolveKaggleCredentials({ env: { KAGGLE_API_TOKEN: 'tok' } as NodeJS.ProcessEnv })).toMatchObject({ kind: 'bearer', token: 'tok', source: 'env-token' });
    expect(resolveKaggleCredentials({ env: { KAGGLE_USERNAME: 'u', KAGGLE_KEY: 'k' } as NodeJS.ProcessEnv })).toMatchObject({ kind: 'basic', username: 'u', source: 'env-username-key' });
  });

  it('reads kaggle.json and access_token from the config dir', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'kaggle.json'), JSON.stringify({ username: 'djoochie', key: 'secretkey' }));
    expect(resolveKaggleCredentials({ env: {} as NodeJS.ProcessEnv, configDir: dir })).toMatchObject({ kind: 'basic', username: 'djoochie', source: 'file-kaggle-json' });
    fs.rmSync(path.join(dir, 'kaggle.json'));
    fs.writeFileSync(path.join(dir, 'access_token'), '\uFEFFoauthtoken\n');
    expect(resolveKaggleCredentials({ env: {} as NodeJS.ProcessEnv, configDir: dir })).toMatchObject({ kind: 'bearer', token: 'oauthtoken', source: 'file-access-token' });
  });

  it('returns null when nothing is configured', () => {
    expect(resolveKaggleCredentials({ env: {} as NodeJS.ProcessEnv, configDir: tempDir() })).toBeNull();
  });

  it('builds the right auth header and never exposes the secret in status', () => {
    const basic = kaggleAuthHeader({ kind: 'basic', username: 'u', key: 'k', source: 'env-username-key' });
    expect(basic.Authorization).toBe(`Basic ${Buffer.from('u:k').toString('base64')}`);
    expect(kaggleAuthHeader({ kind: 'bearer', token: 't', source: 'env-token' }).Authorization).toBe('Bearer t');
    expect(kaggleAuthHeader(null)).toEqual({});

    const status = kaggleCredentialsStatus({ kind: 'basic', username: 'u', key: 'k', source: 'env-username-key' });
    expect(status).toEqual({ configured: true, kind: 'basic', source: 'env-username-key', username: 'u' });
    expect(JSON.stringify(status)).not.toContain('"k"');
    expect(kaggleCredentialsStatus(null)).toEqual({ configured: false });
  });
});