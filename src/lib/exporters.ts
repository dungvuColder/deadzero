import type { AppData } from './types';
import { addDays, fromIsoDate } from './date';

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');

/** Lịch học cả kỳ, lịch thi và hạn nộp → file .ics để nhập vào Google Calendar (HP-14) */
export function buildIcs(d: AppData) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DeadZero//VI', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:DeadZero'];
  const stamp = icsDate(new Date());
  const ev = (uid: string, start: Date, end: Date, title: string, extra: string[] = []) =>
    L.push('BEGIN:VEVENT', `UID:${uid}@deadzero`, `DTSTAMP:${stamp}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${icsText(title)}`, ...extra, 'END:VEVENT');
  const sem = fromIsoDate(d.me.semesterStart);
  for (const c of d.classes) {
    for (const s of c.sessions) {
      const day = addDays(sem, s.wd);
      const start = new Date(day); start.setHours(6 + s.from, 0, 0, 0);
      const end = new Date(day); end.setHours(6 + s.to, 50, 0, 0);
      ev(`s-${s.id}`, start, end, c.name, [`LOCATION:${icsText(s.room)}`, `RRULE:FREQ=WEEKLY;COUNT=${d.me.semesterWeeks}`]);
    }
    if (c.exam) {
      const start = new Date(c.exam.at);
      ev(`e-${c.id}`, start, new Date(start.getTime() + 90 * 60e3), `Thi: ${c.name}`, [`LOCATION:${icsText(c.exam.room)}`]);
    }
  }
  for (const t of d.tasks) {
    if (t.status === 'done' || !t.assignees.includes(d.me.id)) continue;
    const due = new Date(t.dueAt);
    ev(`t-${t.id}`, new Date(due.getTime() - 30 * 60e3), due, `Hạn: ${t.title}`,
      ['BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(t.title)}`, 'END:VALARM']);
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}

export function downloadIcs(d: AppData) {
  download('deadzero.ics', buildIcs(d), 'text/calendar;charset=utf-8');
}

export interface ContributionRow { name: string; leader: boolean; n: number; d: number; hours: number; share: number; rate: number | null; left: number }

/** Bảng đóng góp nhóm → CSV (mở bằng Excel, có BOM để giữ dấu tiếng Việt) */
export function downloadContributionCsv(groupName: string, rows: ContributionRow[]) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['Thành viên', 'Vai trò', 'Số việc', 'Đã xong', 'Giờ công', 'Tỷ trọng (%)', 'Đúng hạn (%)', 'Còn lại (giờ)'];
  const body = rows.map(r => [r.name, r.leader ? 'Trưởng nhóm' : 'Thành viên', r.n, r.d, r.hours.toFixed(1), r.share, r.rate ?? '', r.left.toFixed(1)]);
  const csv = '﻿' + [head, ...body].map(row => row.map(q).join(',')).join('\r\n');
  const safe = groupName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w-]+/g, '-');
  download(`dong-gop-${safe}.csv`, csv, 'text/csv;charset=utf-8');
}
