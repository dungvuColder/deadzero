export const DAY = 864e5;
export const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const WDL = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
export const MONTHS = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const dayStart = (d: Date | string) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const diffDays = (a: Date | string, b: Date | string) => Math.round((dayStart(a).getTime() - dayStart(b).getTime()) / DAY);
/** Thứ trong tuần, T2 = 0 */
export const dow = (d: Date) => (d.getDay() + 6) % 7;
export const mondayOf = (d: Date) => addDays(dayStart(d), -dow(d));
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromIsoDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export const fD = (d: Date | string) => { const x = new Date(d); return `${WD[dow(x)]} ${x.getDate()}/${x.getMonth() + 1}`; };
export const fT = (d: Date | string) => { const x = new Date(d); return `${pad(x.getHours())}:${pad(x.getMinutes())}`; };
export const fShort = (d: Date | string) => { const x = new Date(d); return `${x.getDate()}/${x.getMonth() + 1}`; };

/** "Hôm nay" / "Mai" / "T6" / "12/11" */
export function dueLabel(d: Date | string) {
  const n = diffDays(d, today0());
  if (n < 0) return `Trễ ${-n}n`;
  if (n === 0) return 'Hôm nay';
  if (n === 1) return 'Mai';
  if (n < 7) return WD[dow(new Date(d))];
  return fShort(d);
}

export const periodStart = (p: number) => `${pad(6 + p)}:00`;
export const periodEnd = (p: number) => `${pad(6 + p)}:50`;

export function weekNo(d: Date, semesterStart: string) {
  return Math.floor(diffDays(d, fromIsoDate(semesterStart)) / 7) + 1;
}

/** Giờ + phút còn lại tới một mốc */
export function countdown(to: Date | string) {
  const ms = Math.max(0, new Date(to).getTime() - Date.now());
  const h = Math.floor(ms / 36e5);
  return { days: Math.floor(h / 24), hours: h % 24, totalHours: h };
}
