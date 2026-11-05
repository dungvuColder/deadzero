import type { AppData } from './types';
import { addDays, dayStart, diffDays, dow, iso, today0 } from './date';
import { myOpenTasks, remaining } from './priority';

export interface PlanSlot { taskId: string; h: number }
export interface Plan {
  /** yyyy-mm-dd → các phiên làm việc gợi ý trong ngày */
  days: Map<string, PlanSlot[]>;
  /** Giờ còn thiếu của từng việc (không xếp kịp trước hạn) */
  short: Map<string, number>;
}

const STEP = 0.5;
const roundStep = (x: number) => Math.round(x / STEP) * STEP;

/**
 * Gợi ý lịch làm (UT-06): xếp giờ còn phải làm vào giờ tự học còn trống mỗi ngày,
 * việc có hạn sớm hơn được xếp trước (Earliest Deadline First).
 * Giờ tự học đã dành cho lộ trình được trừ ra trước.
 */
export function buildPlan(d: AppData, horizonDays = 28): Plan {
  const t0 = today0();
  const now = new Date();
  const tasks = myOpenTasks(d)
    .map(t => {
      const due = new Date(t.dueAt);
      const last = due.getHours() >= 18 ? dayStart(due) : addDays(dayStart(due), -1);
      return { t, last, left: roundStep(remaining(t)) };
    })
    .filter(x => x.left > 0)
    .sort((a, b) => +new Date(a.t.dueAt) - +new Date(b.t.dueAt));

  const days = new Map<string, PlanSlot[]>();
  for (let i = 0; i < horizonDays; i++) {
    const day = addDays(t0, i);
    const goalH = d.goals.reduce((s, g) => s + g.items.filter(it => !it.done && diffDays(it.day, day) === 0).length * g.minutes / 60, 0);
    let cap = Math.max(0, d.me.hours[dow(day)] - goalH);
    // Hôm nay: không xếp quá số giờ còn lại tới 23:00
    if (i === 0) cap = Math.min(cap, Math.max(0, 23 - (now.getHours() + now.getMinutes() / 60)));
    cap = Math.floor(cap / STEP) * STEP;
    const slots: PlanSlot[] = [];
    for (const x of tasks) {
      if (cap <= 0) break;
      if (x.left <= 0 || x.last < day) continue;
      const h = Math.min(x.left, cap);
      slots.push({ taskId: x.t.id, h });
      x.left -= h; cap -= h;
    }
    if (slots.length) days.set(iso(day), slots);
  }
  const short = new Map<string, number>();
  tasks.forEach(x => { if (x.left > 0) short.set(x.t.id, x.left); });
  return { days, short };
}

export const fmtH = (h: number) => (h < 1 ? '30p' : h % 1 ? `${Math.floor(h)}h30` : `${h}h`);
