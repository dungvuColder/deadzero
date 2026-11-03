export type Status = 'todo' | 'doing' | 'review' | 'done';
export type Source = 'personal' | 'class' | 'group' | 'goal';
export type Level = 'late' | 'high' | 'mid' | 'low';

export interface Person { id: string; name: string }

export interface Profile {
  id: string;
  name: string;
  /** Giờ tự học theo thứ, T2 = 0 … CN = 6 */
  hours: number[];
  semesterStart: string; // yyyy-mm-dd, thứ Hai tuần 1
  semesterWeeks: number;
}

export interface Session { id: string; wd: number; from: number; to: number; room: string }

export interface ClassSection {
  id: string;
  sec: string;
  name: string;
  color: number;
  lecturer: string;
  credits: number;
  shared: boolean;
  joinCode: string | null;
  ownerId: string;
  ownerName: string;
  members: number;
  sessions: Session[];
  exam: { at: string; room: string; format: string } | null;
}

export interface Subtask { t: string; done: boolean }

export interface Task {
  id: string;
  title: string;
  classId: string | null;
  groupId: string | null;
  dueAt: string; // ISO
  est: number;
  progress: number;
  status: Status;
  src: Source;
  createdBy: string;
  assignees: string[];
  subtasks: Subtask[];
  doneAt: string | null;
  files: number;
}

export interface Group {
  id: string;
  name: string;
  classId: string | null;
  leaderId: string;
  code: string;
  members: Person[];
}

export interface LogEntry { id: string; groupId: string; actorId: string; action: string; at: string }

export interface GoalItem { id: string; mi: number; title: string; day: string; done: boolean }
export interface Goal {
  id: string;
  name: string;
  start: string;
  end: string;
  days: number[];
  minutes: number;
  ms: string[];
  items: GoalItem[];
}

export interface Notif { id: string; icon: 'cal' | 'user' | 'review' | 'cls' | 'info'; text: string; at: string; read: boolean }

export interface AppData {
  me: Profile;
  people: Record<string, string>;
  classes: ClassSection[];
  tasks: Task[];
  groups: Group[];
  log: LogEntry[];
  goals: Goal[];
  notifs: Notif[];
}

export interface ClassPreview {
  id: string; sec: string; name: string; credits: number; members: number; ownerName: string;
  sessions: Session[]; exam: ClassSection['exam']; sharedTasks: number; already: boolean;
}

export interface NewClassInput {
  sec: string; name: string; credits: number; lecturer: string; shared: boolean;
  sessions: Omit<Session, 'id'>[]; exam: ClassSection['exam'];
}

export interface ParsedRow { sec: string; name: string; wd: number; from: number; to: number; room: string }

/** Mọi thao tác ghi dữ liệu. Chế độ demo và Supabase cùng cài đặt interface này. */
export interface Repo {
  mode: 'demo' | 'cloud';
  load(): Promise<AppData>;
  setHours(hours: number[]): Promise<void>;
  addTask(t: { title: string; classId: string | null; dueAt: string; est: number; subtasks?: Subtask[] }): Promise<string>;
  updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'dueAt' | 'est' | 'progress' | 'status' | 'subtasks' | 'doneAt'>>, logAction?: string): Promise<void>;
  deleteTask(id: string): Promise<void>;
  createClass(c: NewClassInput): Promise<string>;
  updateSession(classId: string, sessionId: string, patch: Partial<Omit<Session, 'id'>>): Promise<void>;
  shareClass(classId: string): Promise<string>;
  previewClass(code: string): Promise<ClassPreview | null>;
  joinClass(code: string): Promise<string>;
  findSharedBySec(sec: string): Promise<{ code: string; members: number } | null>;
  addClassTask(classId: string, t: { title: string; dueAt: string; est: number }): Promise<void>;
  leaveClass(classId: string): Promise<void>;
  createGroup(g: { name: string; classId: string | null }): Promise<string>;
  joinGroup(code: string): Promise<string>;
  assignGroupTask(g: { groupId: string; title: string; assignees: string[]; dueAt: string; est: number }): Promise<void>;
  createGoal(g: Omit<Goal, 'id'>): Promise<string>;
  updateGoal(id: string, patch: Partial<Pick<Goal, 'items'>>): Promise<void>;
  deleteGoal(id: string): Promise<void>;
  markNotifsRead(): Promise<void>;
  subscribe(onChange: () => void): () => void;
  reset?(): Promise<void>;
}
