import type { Goal, GoalItem } from './types';
import { addDays, diffDays, dow, iso, today0 } from './date';

export interface Template { key: string; name: string; weeks: number; desc: string; ms: [string, string[]][] }

export const TEMPLATES: Template[] = [
  { key: 'ielts', name: 'IELTS 6.5 trong 12 tuần', weeks: 12, desc: 'Nền tảng, tăng tốc, luyện đề',
    ms: [
      ['Nền tảng', ['Listening Section 1–2', 'Reading: True/False/Not Given', 'Writing Task 1 – biểu đồ đường', 'Từ vựng: Education', 'Speaking Part 1', 'Listening Section 3', 'Reading: Matching headings', 'Writing Task 1 – biểu đồ cột']],
      ['Tăng tốc', ['Writing Task 2 – Opinion', 'Listening Section 4', 'Reading: Summary completion', 'Speaking Part 2', 'Writing Task 2 – Discussion', 'Từ vựng: Environment', 'Reading: Multiple choice', 'Speaking Part 3']],
      ['Luyện đề', ['Full test Cambridge 15 – Test 1', 'Chữa lỗi Writing', 'Full test Cambridge 15 – Test 2', 'Speaking mock test', 'Full test Cambridge 16 – Test 1', 'Ôn lỗi sai thường gặp']],
    ] },
  { key: 'python', name: 'Python cơ bản trong 8 tuần', weeks: 8, desc: 'Cú pháp, cấu trúc dữ liệu, project',
    ms: [
      ['Cú pháp', ['Biến, kiểu dữ liệu', 'Rẽ nhánh và vòng lặp', 'Bài tập vòng lặp']],
      ['Cấu trúc dữ liệu', ['List và tuple', 'Dict và set', 'Hàm và tham số', 'Đọc ghi file', 'Xử lý ngoại lệ']],
      ['Project', ['Lên ý tưởng project', 'Viết chức năng chính', 'Hoàn thiện, đẩy lên GitHub']],
    ] },
  { key: 'final', name: 'Ôn thi cuối kỳ trong 3 tuần', weeks: 3, desc: 'Tóm tắt, luyện bài, làm đề',
    ms: [
      ['Hệ thống kiến thức', ['Tóm tắt chương 1–3', 'Tóm tắt chương 4–6', 'Sơ đồ tư duy']],
      ['Luyện bài tập', ['Bài tập dạng 1', 'Bài tập dạng 2', 'Bài tập dạng 3']],
      ['Làm đề', ['Đề năm 2024', 'Đề năm 2025', 'Chữa lỗi sai']],
    ] },
];

let n = 0;
const nid = () => 'gi' + Date.now().toString(36) + (n++).toString(36);

/** Rải các nhiệm vụ nhỏ vào những ngày học đã chọn, theo thứ tự mốc (LT-02, LT-03) */
export function buildGoal(t: Template, start: Date, days: number[], minutes: number, missed: number[] = []): Omit<Goal, 'id'> {
  const flat: { mi: number; title: string }[] = [];
  t.ms.forEach(([, items], mi) => items.forEach(title => flat.push({ mi, title })));
  const end = addDays(start, t.weeks * 7);
  const slots: Date[] = [];
  for (let d = new Date(start); d < end; d = addDays(d, 1)) if (days.includes(dow(d))) slots.push(new Date(d));
  const per = Math.max(1, Math.floor(slots.length / flat.length));
  const t0 = today0();
  const items: GoalItem[] = flat.map((f, i) => {
    const day = slots[Math.min(i * per, slots.length - 1)] ?? start;
    return { id: nid(), mi: f.mi, title: f.title, day: iso(day), done: diffDays(day, t0) < 0 && !missed.includes(i) };
  });
  return { name: t.name, start: iso(start), end: iso(end), days, minutes, ms: t.ms.map(m => m[0]), items };
}

/** Số buổi hoàn thành liên tiếp tính ngược từ hôm nay */
export function streak(g: Goal) {
  const t0 = today0();
  const past = g.items.filter(i => diffDays(i.day, t0) <= 0).sort((a, b) => (a.day < b.day ? 1 : -1));
  let s = 0;
  for (const i of past) {
    if (diffDays(i.day, t0) === 0 && !i.done) continue;
    if (i.done) s++; else break;
  }
  return s;
}

/** Dời các buổi bị lỡ sang ngày học trống gần nhất (LT-05) */
export function reschedule(g: Goal): GoalItem[] {
  const t0 = today0();
  const items = g.items.map(i => ({ ...i }));
  const missed = items.filter(i => !i.done && diffDays(i.day, t0) < 0);
  const taken = new Set(items.filter(i => diffDays(i.day, t0) >= 0).map(i => i.day));
  let d = new Date(t0);
  for (const i of missed) {
    while (!g.days.includes(dow(d)) || taken.has(iso(d))) d = addDays(d, 1);
    i.day = iso(d); taken.add(i.day); d = addDays(d, 1);
  }
  return items.sort((a, b) => (a.day < b.day ? -1 : 1));
}
