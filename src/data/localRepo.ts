import type { AppData, ClassSection, Notif, Repo, Task } from '../lib/types';
import { seedWorld, type DemoWorld } from '../lib/seed';

const KEY = 'deadzero-demo-v2';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const genCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
let c = 0;
const uid = (p: string) => p + Date.now().toString(36) + (c++).toString(36);

/** Chế độ demo: dữ liệu mẫu, lưu trong trình duyệt. Không cần tài khoản. */
export function createLocalRepo(): Repo {
  let world: DemoWorld = load();
  const listeners = new Set<() => void>();

  function load(): DemoWorld {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* bỏ qua */ }
    return seedWorld();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(world)); } catch { /* bỏ qua */ }
    listeners.forEach(f => f());
  }
  const D = () => world.data;
  const me = () => D().me.id;
  const notify = (icon: Notif['icon'], text: string) => D().notifs.push({ id: uid('n'), icon, text, at: new Date().toISOString(), read: false });
  const log = (groupId: string | null, action: string) => { if (groupId) D().log.push({ id: uid('l'), groupId, actorId: me(), action, at: new Date().toISOString() }); };
  const newTask = (p: Partial<Task> & Pick<Task, 'title' | 'dueAt' | 'est'>): Task => ({
    id: uid('t'), classId: null, groupId: null, progress: 0, status: 'todo', src: 'personal', createdBy: me(), assignees: [me()],
    subtasks: [], doneAt: null, files: 0, ...p,
  });

  const repo: Repo = {
    mode: 'demo',
    async load() { return structuredClone(D()) as AppData; },
    async setHours(hours) { D().me.hours = hours; save(); },
    async setName(name) { D().me.name = name; save(); },
    async setEmailDigest(on) { D().me.emailDigest = on; save(); },
    async sendTestDigest() { throw new Error('Bản demo không gửi email. Đăng nhập để dùng tính năng này.'); },
    async addTask(t) {
      const x = newTask({ ...t, src: t.classId ? 'class' : 'personal', subtasks: t.subtasks ?? [] });
      D().tasks.push(x); save(); return x.id;
    },
    async updateTask(id, patch, logAction) {
      const x = D().tasks.find(t => t.id === id); if (!x) return;
      Object.assign(x, patch);
      if (logAction) log(x.groupId, logAction);
      save();
    },
    async deleteTask(id) { D().tasks = D().tasks.filter(t => t.id !== id); save(); },
    async createClass(input) {
      const cls: ClassSection = { id: uid('c'), sec: input.sec, name: input.name, color: (D().classes.length % 6) + 1, lecturer: input.lecturer || 'Chưa cập nhật',
        credits: input.credits, shared: input.shared, joinCode: input.shared ? genCode() : null, ownerId: me(), ownerName: D().me.name, members: 1,
        sessions: input.sessions.map(s => ({ ...s, id: uid('s') })), exam: input.exam };
      D().classes.push(cls); save(); return cls.id;
    },
    async updateSession(classId, sessionId, patch) {
      const cls = D().classes.find(x => x.id === classId); const s = cls?.sessions.find(x => x.id === sessionId);
      if (!cls || !s) return;
      Object.assign(s, patch);
      notify('cal', `Đã cập nhật lịch ${cls.name} cho ${Math.max(cls.members - 1, 0)} thành viên`);
      save();
    },
    async shareClass(classId) {
      const cls = D().classes.find(x => x.id === classId)!; cls.shared = true; cls.joinCode = cls.joinCode || genCode(); save(); return cls.joinCode;
    },
    async previewClass(code) {
      const C = code.toUpperCase();
      const mine = D().classes.find(x => x.joinCode === C);
      if (mine) return { id: mine.id, sec: mine.sec, name: mine.name, credits: mine.credits, members: mine.members, ownerName: mine.ownerName, sessions: mine.sessions, exam: mine.exam, sharedTasks: 0, already: true };
      const e = world.directory[C]; if (!e) return null;
      return { id: e.cls.id, sec: e.cls.sec, name: e.cls.name, credits: e.cls.credits, members: e.cls.members, ownerName: e.cls.ownerName, sessions: e.cls.sessions, exam: e.cls.exam, sharedTasks: e.tasks.length, already: false };
    },
    async joinClass(code) {
      const C = code.toUpperCase(); const e = world.directory[C];
      if (!e) throw new Error('Không tìm thấy lớp với mã này');
      delete world.directory[C];
      D().classes.push({ ...e.cls, members: e.cls.members + 1 });
      e.tasks.forEach(t => D().tasks.push(newTask({ ...t, classId: e.cls.id, src: 'class', createdBy: e.cls.ownerId })));
      notify('cls', `Đã tham gia ${e.cls.name} và nhận ${e.tasks.length} bài tập chung`);
      save(); return e.cls.id;
    },
    async findSharedBySec(sec) {
      const hit = Object.entries(world.directory).find(([, e]) => e.cls.sec === sec);
      return hit ? { code: hit[0], members: hit[1].cls.members } : null;
    },
    async addClassTask(classId, t) {
      const cls = D().classes.find(x => x.id === classId)!;
      D().tasks.push(newTask({ ...t, classId, src: 'class' }));
      if (cls.shared) notify('cls', `Đã thêm “${t.title}” cho ${cls.members} thành viên lớp ${cls.name}`);
      save();
    },
    async leaveClass(classId) {
      D().classes = D().classes.filter(x => x.id !== classId);
      D().tasks = D().tasks.filter(t => !(t.classId === classId && t.src === 'class'));
      save();
    },
    async createGroup(g) {
      const id = uid('g');
      D().groups.push({ id, name: g.name, classId: g.classId, leaderId: me(), code: genCode(), members: [{ id: me(), name: D().me.name }] });
      D().log.push({ id: uid('l'), groupId: id, actorId: me(), action: 'tạo nhóm', at: new Date().toISOString() });
      save(); return id;
    },
    async joinGroup(code) {
      const g = D().groups.find(x => x.code === code.toUpperCase());
      if (g) return g.id;
      throw new Error('Không tìm thấy nhóm với mã này');
    },
    async assignGroupTask(g) {
      const group = D().groups.find(x => x.id === g.groupId)!;
      D().tasks.push(newTask({ title: g.title, dueAt: g.dueAt, est: g.est, groupId: g.groupId, classId: group.classId, src: 'group', assignees: g.assignees }));
      const names = g.assignees.map(a => D().people[a] || a).join(', ');
      log(g.groupId, `giao “${g.title}” cho ${names}`);
      save();
    },
    async createGoal(g) { const id = uid('goal'); D().goals.push({ ...g, id }); save(); return id; },
    async updateGoal(id, patch) { const g = D().goals.find(x => x.id === id); if (g) Object.assign(g, patch); save(); },
    async deleteGoal(id) { D().goals = D().goals.filter(x => x.id !== id); save(); },
    async markNotifsRead() { D().notifs.forEach(n => (n.read = true)); save(); },
    subscribe(f) { listeners.add(f); return () => listeners.delete(f); },
    async reset() { world = seedWorld(); save(); },
  };
  return repo;
}
