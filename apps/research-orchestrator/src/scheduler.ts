import { CronJob } from 'cron';

export interface ScheduledStudy {
  id: string;
  cron: string;
  domain: string;
  query: string;
  title: string;
}

const jobs = new Map<string, CronJob>();

export function scheduleStudy(s: ScheduledStudy, run: () => void | Promise<void>): void {
  unscheduleStudy(s.id);
  const job = new CronJob(s.cron, () => { void run(); }, null, true, 'UTC');
  jobs.set(s.id, job);
}

export function unscheduleStudy(id: string): boolean {
  const j = jobs.get(id);
  if (!j) return false;
  j.stop();
  jobs.delete(id);
  return true;
}

export function listSchedules(): ScheduledStudy[] {
  // Caller keeps the array; we just track jobs by id. Schedules are stored in memory + persisted to JSON file by server.ts.
  return [];
}
