/**
 * End-to-end proof that the provenance spine is anchored over HTTP:
 *   - a real digest returns 200 with anchored:true, verified:true
 *   - a bad digest returns 400
 *   - an unreachable TSA returns 502 (never a success)
 *
 * Run: node verify-anchor.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

// 8097 is reserved for oncology-oncono by orchestration/ecosystem.oncology.config.js.
// Using it here would collide with that service the moment it is supervised.
const PORT = 8137;
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const record = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`);
  if (!ok) failures++;
};

function boot(extraEnv) {
  const child = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, ORCHESTRATOR_PORT: String(PORT), ...extraEnv },
    shell: true,
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d.toString()));
  child.stderr.on('data', (d) => (log += d.toString()));
  return { child, getLog: () => log };
}

async function waitUp(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/provenance/anchor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (r.status === 400) return true; // route is live
    } catch {
      /* not up */
    }
    await sleep(600);
  }
  return false;
}

const kill = (child) => {
  try {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } catch {
    /* best effort */
  }
};

async function anchor(body) {
  const r = await fetch(`${BASE}/api/provenance/anchor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

// ── Run A: default TSA
let a = boot({});
try {
  const up = await waitUp();
  record('server boots and the anchor route is live', up, up ? '' : a.getLog().slice(-500));
  if (up) {
    const hash = createHash('sha256').update('spine-live-e2e').digest('hex');

    const good = await anchor({ hash });
    record(
      'real digest -> 200 anchored+verified',
      good.status === 200 && good.body.anchored === true && good.body.verified === true,
      `status=${good.status} anchored=${good.body.anchored} verified=${good.body.verified} genTime=${good.body.genTime} token=${String(good.body.tokenPath).slice(-24)}`
    );

    const bad = await anchor({ hash: 'not-a-digest' });
    record('bad digest -> 400', bad.status === 400, `status=${bad.status} error=${bad.body.error}`);

    const missing = await anchor({});
    record('missing hash -> 400', missing.status === 400, `status=${missing.status}`);
  }
} finally {
  kill(a.child);
  await sleep(800);
}

// ── Run B: unreachable TSA must refuse, not succeed
let b = boot({ RFC3161_TSA_URL: 'http://127.0.0.1:9/none' });
try {
  const up = await waitUp();
  record('server boots with an unreachable TSA configured', up, up ? '' : b.getLog().slice(-500));
  if (up) {
    const hash = createHash('sha256').update('spine-live-e2e-fail').digest('hex');
    const refused = await anchor({ hash });
    record(
      'unreachable TSA -> 502, anchored:false (never a success)',
      refused.status === 502 && refused.body.anchored === false,
      `status=${refused.status} anchored=${refused.body.anchored} error=${String(refused.body.error).slice(0, 90)}`
    );
  }
} finally {
  kill(b.child);
  await sleep(800);
}

console.log(`\n==== ${failures === 0 ? 'ALL PASS' : `${failures} FAILED`} ====`);
process.exit(failures === 0 ? 0 : 1);
