import type { AppData, ClassSection, Task } from './types';
import { addDays, dow, iso, mondayOf, today0 } from './date';
import { TEMPLATES, buildGoal } from './templates';

const at = (off: number, h = 23, m = 59) => { const d = addDays(today0(), off); d.setHours(h, m, 0, 0); return d.toISOString(); };
let k = 0;
const id = (p: string) => `${p}${++k}`;

function task(classId: string | null, title: string, due: string, est: number, progress: number, status: Task['status'], src: Task['src'], assignees: string[], subs: string[] = [], extra: Partial<Task> = {}): Task {
  const done = (i: number) => progress >= 100 || (progress > 0 && i < Math.round(subs.length * progress / 100));
  return { id: id('t'), title, classId, groupId: null, dueAt: due, est, progress, status, src, createdBy: 'me', assignees,
    subtasks: subs.map((t, i) => ({ t, done: done(i) })), doneAt: null, files: 0, ...extra };
}

export interface DemoWorld {
  data: AppData;
  /** Lớp dùng chung do người khác tạo, tham gia được bằng mã */
  directory: Record<string, { cls: ClassSection; tasks: { title: string; dueAt: string; est: number }[] }>;
}

export function seedWorld(): DemoWorld {
  k = 0;
  const t0 = today0();
  const semStart = addDays(mondayOf(t0), -63); // tuần hiện tại là tuần 10
  const cls = (c: Omit<ClassSection, 'id' | 'sessions'> & { id: string; sessions: [number, number, number, string][] }): ClassSection =>
    ({ ...c, sessions: c.sessions.map(([wd, from, to, room]) => ({ id: id('s'), wd, from, to, room })) });

  const classes: ClassSection[] = [
    cls({ id: 'csdl', sec: 'INT2211 1', name: 'Cơ sở dữ liệu', color: 2, lecturer: 'GV. Phạm Thu Hà', credits: 3, shared: true, joinCode: 'CSDL4Q', ownerId: 'me', ownerName: 'Bạn', members: 56,
      sessions: [[1, 1, 3, '101-G2'], [4, 4, 5, 'PM 208-G2']], exam: { at: at(27, 8, 0), room: '301-GĐ3', format: 'Tự luận 90 phút' } }),
    cls({ id: 'web', sec: 'INT3306 2', name: 'Phát triển ứng dụng Web', color: 1, lecturer: 'GV. Trần Minh Đức', credits: 3, shared: true, joinCode: 'WEB7K2', ownerId: 'u_ma', ownerName: 'Minh Anh', members: 42,
      sessions: [[3, 7, 9, '309-G2']], exam: { at: at(30, 13, 0), room: 'PM 202-G2', format: 'Thực hành' } }),
    cls({ id: 'cnpm', sec: 'INT2208 3', name: 'Công nghệ phần mềm', color: 3, lecturer: 'GV. Lê Quang Vinh', credits: 3, shared: true, joinCode: 'CNPM2B', ownerId: 'u_q', ownerName: 'Quang', members: 61,
      sessions: [[0, 4, 6, '303-G2']], exam: { at: at(34, 8, 0), room: '201-GĐ2', format: 'Vấn đáp' } }),
    cls({ id: 'xstk', sec: 'MAT1101 4', name: 'Xác suất thống kê', color: 5, lecturer: 'GV. Nguyễn Hữu Toàn', credits: 3, shared: true, joinCode: 'KSTA9P', ownerId: 'u_th', ownerName: 'Thu', members: 70,
      sessions: [[4, 1, 3, '105-GĐ3']], exam: { at: at(21, 8, 0), room: '105-GĐ3', format: 'Trắc nghiệm + tự luận' } }),
    cls({ id: 'kn', sec: 'BSA2002 2', name: 'Kỹ năng khởi nghiệp', color: 4, lecturer: 'GV. Đỗ Thanh Mai', credits: 2, shared: false, joinCode: null, ownerId: 'me', ownerName: 'Bạn', members: 1,
      sessions: [[2, 7, 9, '212-GĐ2']], exam: null }),
  ];

  const G = 'g1';
  const g = (t: Task): Task => ({ ...t, groupId: G });
  const tasks: Task[] = [
    task('csdl', 'Bài tập SQL tuần 9', at(1), 2, 0, 'todo', 'class', ['me'], ['Câu 1–5: JOIN', 'Câu 6–8: GROUP BY', 'Câu 9: subquery']),
    task('csdl', 'Ôn kiểm tra giữa kỳ CSDL', at(2, 9, 0), 3, 0, 'todo', 'personal', ['me'], ['Chuẩn hoá 1NF–3NF', 'Đại số quan hệ', 'Đề năm trước']),
    task('web', 'Lab 5 – REST API', at(3), 4, 0, 'todo', 'class', ['me'], ['CRUD /products', 'Middleware xác thực', 'README']),
    g(task('cnpm', 'Chương 3 – Thiết kế hệ thống', at(4), 8, 25, 'doing', 'group', ['me'], ['Sơ đồ kiến trúc', 'Sơ đồ lớp', 'Thiết kế CSDL', 'Thiết kế giao diện'], { files: 1 })),
    task('xstk', 'Ôn Xác suất chương 4–5', at(6), 4, 0, 'todo', 'personal', ['me']),
    task('web', 'Đồ án Web – trang chủ', at(8), 6, 0, 'todo', 'personal', ['me'], ['Wireframe', 'Header + menu', 'Responsive']),
    task('csdl', 'Bài tập lớn CSDL – ERD', at(10), 6, 0, 'todo', 'class', ['me']),
    task('web', 'Đồ án Web – giỏ hàng', at(12), 8, 0, 'todo', 'personal', ['me']),
    task('kn', 'Kế hoạch kinh doanh', at(16), 12, 30, 'doing', 'personal', ['me'], ['Bối cảnh', 'Phân khúc khách hàng', 'Tính mới', 'Tài chính dự kiến']),
    task('csdl', 'Bài tập SQL tuần 8', at(-6), 2, 100, 'done', 'class', ['me'], [], { doneAt: at(-7, 21, 0) }),
    task('xstk', 'Bài tập chương 3', at(-3), 3, 100, 'done', 'class', ['me'], [], { doneAt: at(-3, 20, 0) }),
    g(task('cnpm', 'Chương 1 – Khảo sát hiện trạng', at(-14), 4, 100, 'done', 'group', ['u_l'], [], { doneAt: at(-15, 22, 0), files: 2, createdBy: 'me' })),
    g(task('cnpm', 'Chương 2 – Đặc tả yêu cầu', at(-7), 6, 100, 'done', 'group', ['u_k'], [], { doneAt: at(-6, 10, 0), files: 1 })),
    g(task('cnpm', 'Tài liệu tham khảo', at(-5), 2, 100, 'done', 'group', ['u_h'], [], { doneAt: at(-6, 9, 0), files: 1 })),
    g(task('cnpm', 'Sơ đồ use case', at(1), 3, 90, 'review', 'group', ['u_t'], [], { files: 1 })),
    g(task('cnpm', 'Kiểm thử đăng nhập', at(6), 4, 40, 'doing', 'group', ['u_h'])),
    g(task('cnpm', 'Slide thuyết trình', at(9), 5, 0, 'todo', 'group', ['u_l'])),
    g(task('cnpm', 'Quay video demo', at(10), 3, 0, 'todo', 'group', ['u_t', 'u_k'])),
  ];

  const ielts = buildGoal(TEMPLATES[0], addDays(t0, -21), [1, 3, 5, 6], 30, [1]);

  const data: AppData = {
    me: { id: 'me', name: 'Bạn', hours: [3, 3, 2, 3, 3, 5, 4], semesterStart: iso(semStart), semesterWeeks: 15 },
    people: { me: 'Bạn', u_l: 'Linh', u_k: 'Khánh', u_t: 'Tuấn', u_h: 'Hà', u_ma: 'Minh Anh', u_q: 'Quang', u_th: 'Thu' },
    classes,
    tasks,
    groups: [{ id: G, name: 'Nhóm 5', classId: 'cnpm', leaderId: 'me', code: 'N5CNPM',
      members: [{ id: 'me', name: 'Bạn' }, { id: 'u_l', name: 'Linh' }, { id: 'u_k', name: 'Khánh' }, { id: 'u_t', name: 'Tuấn' }, { id: 'u_h', name: 'Hà' }] }],
    log: [
      { id: id('l'), groupId: G, actorId: 'u_t', action: 'nộp “Sơ đồ use case”, chờ duyệt', at: at(0, 7, 42) },
      { id: id('l'), groupId: G, actorId: 'u_h', action: 'cập nhật “Kiểm thử đăng nhập” lên 40%', at: at(-1, 22, 15) },
      { id: id('l'), groupId: G, actorId: 'me', action: 'đính kèm tệp vào “Chương 3 – Thiết kế hệ thống”', at: at(-1, 20, 3) },
      { id: id('l'), groupId: G, actorId: 'me', action: 'giao “Quay video demo” cho Tuấn, Khánh', at: at(-2, 19, 30) },
      { id: id('l'), groupId: G, actorId: 'u_k', action: 'hoàn thành “Chương 2 – Đặc tả yêu cầu”', at: at(-6, 10, 0) },
      { id: id('l'), groupId: G, actorId: 'u_h', action: 'hoàn thành “Tài liệu tham khảo”', at: at(-6, 9, 0) },
      { id: id('l'), groupId: G, actorId: 'u_l', action: 'hoàn thành “Chương 1 – Khảo sát hiện trạng”', at: at(-15, 22, 0) },
    ],
    goals: [{ id: 'ielts', ...ielts }],
    notifs: [
      { id: id('n'), icon: 'cal', text: 'Minh Anh đổi phòng Phát triển ứng dụng Web sang 309-G2', at: at(0, 7, 5), read: false },
      { id: id('n'), icon: 'review', text: 'Tuấn nộp “Sơ đồ use case”, chờ bạn duyệt', at: at(0, 7, 42), read: false },
      { id: id('n'), icon: 'user', text: 'Bạn được giao “Chương 3 – Thiết kế hệ thống”', at: at(-8, 21, 0), read: true },
    ],
  };

  const directory: DemoWorld['directory'] = {
    OOAD9X: {
      cls: cls({ id: 'ooad', sec: 'INT2213 1', name: 'Phân tích và thiết kế hướng đối tượng', color: 6, lecturer: 'GV. Vũ Diệu Hương', credits: 3, shared: true, joinCode: 'OOAD9X', ownerId: 'u_p', ownerName: 'Phương', members: 38,
        sessions: [[1, 7, 9, '208-G2']], exam: { at: at(32, 8, 0), room: '208-G2', format: 'Tự luận' } }),
      tasks: [{ title: 'Bài tập 3 – Biểu đồ lớp', dueAt: at(8), est: 3 }],
    },
  };
  void dow;
  return { data, directory };
}
