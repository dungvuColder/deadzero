import type { ParsedRow } from './types';

export const SAMPLE_TKB = [
  'Mã LHP\tTên học phần\tThứ\tTiết\tGiảng đường',
  'INT2213 1\tPhân tích và thiết kế hướng đối tượng\t3\t7-9\t208-G2',
  'PHI1006 3\tTriết học Mác – Lênin\t6\t4-6\t301-GĐ3',
  'INT2214 2\tNguyên lý hệ điều hành\t7\t1-3\t107-G2',
].join('\n');

/**
 * Đọc bảng thời khoá biểu copy từ cổng đào tạo (HP-09).
 * Mỗi dòng: Mã LHP | Tên | Thứ (2–8, 8 = CN) | Tiết "a-b" | Phòng. Phân tách bằng tab, | hoặc từ 2 dấu cách.
 */
export function parseTkb(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !/^m[ãa]\s*lhp/i.test(l))
    .map(l => {
      const p = l.split(/\t|\s*\|\s*|\s{2,}/).map(s => s.trim());
      const thu = parseInt(p[2], 10);
      const [a, b] = (p[3] || '').split(/[-–]/).map(x => parseInt(x, 10));
      return {
        sec: p[0] || '',
        name: p[1] || 'Học phần',
        wd: Number.isFinite(thu) ? Math.max(0, Math.min(6, thu - 2)) : 0,
        from: a || 1,
        to: b || a || 3,
        room: p[4] || '',
      };
    })
    .filter(r => r.sec);
}
