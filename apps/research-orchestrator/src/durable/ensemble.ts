import type { DurableContext, TaskRegistry } from './context.js';
import type { NotebookCell } from '../kaggle/recourse.js';

// ── Durable workflow: the tumour-immune ODE ensemble ─────────────────────────
// The real job the daemon submits to the Kaggle lane via Recourse, expressed as
// a durable workflow. The GPU-bound submit and the queue read are child tasks
// (spawned and checkpointed by the engine); the wait between them is a durable
// sleep, so a sleeping run holds no worker slot.

export interface EnsembleInput {
  seeds: number[];
}

export interface EnsembleSnapshot {
  ok: boolean;
  meanFinal: number | null;
  nSeeds: number;
}

export interface EnsemblePorts {
  submit: (job: { seeds: number[]; cells: NotebookCell[] }) => Promise<{ externalId: string; status: string }>;
  read: (externalId: string) => Promise<EnsembleSnapshot>;
}

export interface EnsembleResult {
  externalId: string;
  status: string;
  snapshot: EnsembleSnapshot;
  meanFinal: number | null;
}

/** Fixed task names; the registry and the workflow must agree on these. */
export const SUBMIT_ENSEMBLE = 'submit-ensemble';
export const READ_ENSEMBLE = 'read-ensemble';

/**
 * Deterministic notebook cells for a seed ensemble. Pure — no clock, no random
 * state outside the seeds — so it is safe to call between durable checkpoints.
 */
export function ensembleCells(seeds: number[]): NotebookCell[] {
  const seedList = seeds.join(',');
  const source = [
    'import json as _rc_json, numpy as np',
    'from scipy.integrate import solve_ivp',
    `seeds=[${seedList}]`,
    'def rhs(t,y,p):',
    '    T,N=y; a,K,c,e,C,f,g,h=p',
    '    return [a*T*(1-T/K)-c*N*T, e*C-f*N+g*T*N/(h+T)]',
    'base=np.array([0.35,1000,0.002,0.2,100,0.15,0.02,200],dtype=float)',
    'finals=[]',
    'for s in seeds:',
    '    rng=np.random.default_rng(int(s))',
    '    p=list(base*np.exp(rng.normal(0.0,0.1,size=base.shape)))',
    '    sol=solve_ivp(rhs,[0.0,60.0],[10.0,5.0],args=(p,),t_eval=np.linspace(0,60,200),method="LSODA")',
    '    finals.append(float(sol.y[0][-1]) if sol.success and np.isfinite(sol.y[0][-1]) else float("nan"))',
    'finals=[f for f in finals if np.isfinite(f)]',
    'result={"ok":len(finals)>0,"model":"tumor-immune-ode-ensemble","nSeeds":len(finals),'
      + '"meanFinal":round(float(np.mean(finals)),4) if finals else None}',
  ].join('\n');
  return [
    { type: 'code', source },
    { type: 'code', source: 'print("__RECOURSE_RESULT__ " + _rc_json.dumps(result))\n' },
  ];
}

/** The task implementations, keyed by the names the workflow calls. */
export function ensembleRegistry(ports: EnsemblePorts): TaskRegistry {
  return {
    [SUBMIT_ENSEMBLE]: (input) => {
      const { seeds } = input as { seeds: number[] };
      return ports.submit({ seeds, cells: ensembleCells(seeds) });
    },
    [READ_ENSEMBLE]: (input) => {
      const { externalId } = input as { externalId: string };
      return ports.read(externalId);
    },
  };
}

/**
 * The durable body. Deterministic between checkpoints: it only names tasks
 * (journalled/checkpointed) and sleeps durably. Nothing here touches the outside.
 */
export async function ensembleWorkflow(ctx: DurableContext, input: EnsembleInput): Promise<EnsembleResult> {
  const handle = await ctx.task<{ externalId: string; status: string }>(SUBMIT_ENSEMBLE, { seeds: input.seeds });
  // Give the remote kernel time to run. Durable: no worker capacity is held.
  await ctx.sleepFor(5000);
  const snapshot = await ctx.task<EnsembleSnapshot>(READ_ENSEMBLE, { externalId: handle.externalId });
  return {
    externalId: handle.externalId,
    status: handle.status,
    snapshot,
    meanFinal: snapshot.meanFinal,
  };
}
