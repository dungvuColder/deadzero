import type { AppData, Level, Task } from './types';
import { addDays, dayStart, diffDays, dow, mondayOf, today0 } from './date';

/** Giờ còn phải làm */
export const remaining = (t: Task) => t.est * (1 - t.progress / 100);

export const myOpenTasks = (d: AppData) =>
  d.tasks.filter(t => t.status !== 'done' && t.assignees.includes(d.me.id));

/** Ngày cuối có thể làm: hạn sau 18:00 thì làm được trong ngày hạn, sớm hơn thì phải xong từ hôm trước */
const lastWorkDay = (t: Task) => {
  const due = new Date(t.dueAt);
  return due.getHours() >= 18 ? dayStart(due) : addDays(dayStart(due), -1);
};

export interface Analysis { r: number; level: Level; start: Date; need: number }

export function levelOf(r: number): Level {
  return r >= 1 ? 'late' : r >= 0.6 ? 'high' : r >= 0.3 ? 'mid' : 'low';
}

/** Ngày nên bắt đầu: ngày mà từ đó đến hạn vừa đủ giờ tự học, trừ 1 ngày dự phòng (UT-03) */
export function startDay(t: Task, hours: number[]) {
  const t0 = today0();
  const need = remaining(t);
  if (need <= 0) return t0;
  let d = lastWorkDay(t), sum = 0;
  while (d >= t0) { sum += hours[dow(d)]; if (sum >= need) break; d = addDays(d, -1); }
  const s = addDays(d, -1);
  return s < t0 ? t0 : s;
}

/**
 * Hệ số gấp r (UT-01): giờ còn phải làm ÷ giờ tự học còn trống trước hạn,
 * sau khi đã trừ giờ dành cho các nhiệm vụ có hạn sớm hơn.
 */
export function analyse(d: AppData): Map<string, Analysis> {
  const t0 = today0();
  const hours = d.me.hours;
  const open = myOpenTasks(d).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
  const out = new Map<string, Analysis>();
  let earlier = 0;
  for (const t of open) {
    const need = remaining(t);
    const last = lastWorkDay(t);
    let avail = 0;
    for (let x = new Date(t0); x <= last; x = addDays(x, 1)) avail += hours[dow(x)];
    const free = avail - earlier;
    const r = new Date(t.dueAt) < new Date() ? 9 : need / Math.max(free, 0.01);
    out.set(t.id, { r, level: levelOf(r), start: startDay(t, hours), need });
    earlier += need;
  }
  return out;
}

export function ranked(d: AppData) {
  const A = analyse(d);
  return myOpenTasks(d)
    .map(task => ({ task, ...A.get(task.id)! }))
    .sort((a, b) => b.r - a.r || +new Date(a.task.dueAt) - +new Date(b.task.dueAt));
}

export interface DayLoad { d: Date; h: number; cap: number; past: boolean; tasks: { id: string; h: number }[] }
export interface WeekLoad { start: Date; days: DayLoad[]; need: number; cap: number; pct: number; tasks: Map<string, number> }

/** Tải công việc theo tuần (UT-04): rải giờ còn lại của mỗi việc đều từ ngày nên bắt đầu tới hạn, cộng buổi tự học */
export function weekLoads(d: AppData, weeks = 8): WeekLoad[] {
  const A = analyse(d);
  const t0 = today0();
  const map = new Map<number, DayLoad['tasks']>();
  const add = (day: Date, id: string, h: number) => {
    const k = dayStart(day).getTime();
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push({ id, h });
  };
  for (const t of myOpenTasks(d)) {
    const a = A.get(t.id)!;
    let last = lastWorkDay(t);
    if (last < a.start) last = a.start;
    const days: Date[] = [];
    for (let x = new Date(a.start); x <= last; x = addDays(x, 1)) days.push(new Date(x));
    days.forEach(x => add(x, t.id, a.need / days.length));
  }
  for (const g of d.goals) for (const i of g.items) {
    if (!i.done && diffDays(i.day, t0) >= 0) add(new Date(i.day), 'goal:' + g.id, g.minutes / 60);
  }
  const w0 = mondayOf(t0);
  const res: WeekLoad[] = [];
  for (let w = 0; w < weeks; w++) {
    const days: DayLoad[] = [];
    let need = 0, cap = 0;
    const tasks = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const day = addDays(w0, w * 7 + i);
      const items = map.get(day.getTime()) || [];
      const h = items.reduce((s, x) => s + x.h, 0);
      const c = d.me.hours[i];
      const past = day < t0;
      days.push({ d: day, h, cap: c, past, tasks: items });
      if (!past) {
        need += h; cap += c;
        items.forEach(x => { if (!x.id.startsWith('goal:')) tasks.set(x.id, (tasks.get(x.id) || 0) + x.h); });
      }
    }
    res.push({ start: addDays(w0, w * 7), days, need, cap, pct: cap ? need / cap : 0, tasks });
  }
  return res;
}

export const LEVEL_LABEL: Record<Level, string> = { late: 'Nguy cơ trễ', high: 'Cao', mid: 'Vừa', low: 'Thấp' };
export const LEVEL_DOT: Record<Level, string> = { late: 'bg-urgent', high: 'bg-high', mid: 'bg-mid', low: 'bg-low' };
export const round1 = (x: number) => Math.round(x * 10) / 10;
