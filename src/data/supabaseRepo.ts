import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData, ClassSection, Repo, Task } from '../lib/types';
import { genCode } from './localRepo';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const hasSupabase = Boolean(URL && KEY);
export const supabase: SupabaseClient | null = hasSupabase ? createClient(URL!, KEY!) : null;

/* eslint-disable @typescript-eslint/no-explicit-any */
const must = <T,>(r: { data: T; error: any }) => { if (r.error) throw new Error(r.error.message); return r.data; };

function mapState(s: any, uid: string): AppData {
  const me = s.me ?? { id: uid, full_name: 'Bạn', hours: [3, 3, 2, 3, 3, 5, 4], semester_start: new Date().toISOString().slice(0, 10), semester_weeks: 15 };
  const classes: ClassSection[] = (s.classes ?? []).map((c: any) => ({
    id: c.id, sec: c.sec, name: c.name, color: c.color, lecturer: c.lecturer, credits: c.credits, shared: c.shared,
    joinCode: c.join_code, ownerId: c.owner_id, ownerName: c.owner_id === uid ? 'Bạn' : c.owner_name ?? '', members: Number(c.members),
    sessions: (c.sessions ?? []).map((x: any) => ({ id: x.id, wd: x.wd, from: x.period_from, to: x.period_to, room: x.room })),
    exam: c.exam_at ? { at: c.exam_at, room: c.exam_room ?? '', format: c.exam_format ?? '' } : null,
  }));
  const tasks: Task[] = (s.tasks ?? []).map((t: any) => ({
    id: t.id, title: t.title, classId: t.class_id, groupId: t.group_id, dueAt: t.due_at, est: Number(t.est), progress: t.progress,
    status: t.status, src: t.src, createdBy: t.created_by, assignees: t.assignees ?? [], subtasks: t.subtasks ?? [], doneAt: t.done_at, files: t.files,
  }));
  const people: Record<string, string> = { ...(s.people ?? {}) };
  people[uid] = 'Bạn';
  return {
    me: { id: uid, name: me.full_name, hours: (me.hours ?? []).map(Number), semesterStart: me.semester_start, semesterWeeks: me.semester_weeks },
    people,
    classes,
    tasks,
    groups: (s.groups ?? []).map((g: any) => ({ id: g.id, name: g.name, classId: g.class_id, leaderId: g.leader_id, code: g.invite_code,
      members: (g.members ?? []).map((m: any) => ({ id: m.id, name: m.id === uid ? 'Bạn' : m.name })) })),
    log: (s.log ?? []).map((l: any) => ({ id: String(l.id), groupId: l.group_id, actorId: l.actor_id, action: l.action, at: l.created_at })),
    goals: (s.goals ?? []).map((g: any) => ({ id: g.id, name: g.name, start: g.start_date, end: g.end_date, days: g.days, minutes: g.minutes, ms: g.ms, items: g.items })),
    notifs: (s.notifs ?? []).map((n: any) => ({ id: n.id, icon: n.icon, text: n.text, at: n.created_at, read: n.read })),
  };
}

/** Chế độ thật: Supabase, nhiều người dùng, cập nhật realtime */
export function createSupabaseRepo(uid: string): Repo {
  const sb = supabase!;
  const log = async (groupId: string | null, action: string) => { if (groupId) await sb.from('activity_log').insert({ group_id: groupId, action }); };

  return {
    mode: 'cloud',
    async load() { return mapState(must(await sb.rpc('my_state')), uid); },
    async setHours(hours) { must(await sb.from('profiles').update({ hours }).eq('id', uid)); },
    async addTask(t) {
      const row = must(await sb.from('tasks').insert({ title: t.title, class_id: t.classId, due_at: t.dueAt, est: t.est, src: t.classId ? 'class' : 'personal', subtasks: t.subtasks ?? [] }).select('id').single()) as any;
      must(await sb.from('task_assignees').insert({ task_id: row.id, user_id: uid }));
      return row.id;
    },
    async updateTask(id, patch, logAction) {
      const row: any = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.dueAt !== undefined) row.due_at = patch.dueAt;
      if (patch.est !== undefined) row.est = patch.est;
      if (patch.progress !== undefined) row.progress = patch.progress;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.subtasks !== undefined) row.subtasks = patch.subtasks;
      if (patch.doneAt !== undefined) row.done_at = patch.doneAt;
      const r = must(await sb.from('tasks').update(row).eq('id', id).select('group_id').single()) as any;
      if (logAction) await log(r.group_id, logAction);
    },
    async deleteTask(id) { must(await sb.from('tasks').delete().eq('id', id)); },
    async createClass(c) {
      const row = must(await sb.from('class_sections').insert({
        sec: c.sec, name: c.name, credits: c.credits, lecturer: c.lecturer, shared: c.shared, join_code: c.shared ? genCode() : null,
        color: Math.floor(Math.random() * 6) + 1, exam_at: c.exam?.at ?? null, exam_room: c.exam?.room ?? null, exam_format: c.exam?.format ?? null,
      }).select('id').single()) as any;
      must(await sb.from('class_members').insert({ class_id: row.id, user_id: uid }));
      if (c.sessions.length) must(await sb.from('class_sessions').insert(c.sessions.map(s => ({ class_id: row.id, wd: s.wd, period_from: s.from, period_to: s.to, room: s.room }))));
      return row.id;
    },
    async updateSession(_classId, sessionId, p) {
      const row: any = {};
      if (p.room !== undefined) row.room = p.room;
      if (p.wd !== undefined) row.wd = p.wd;
      if (p.from !== undefined) row.period_from = p.from;
      if (p.to !== undefined) row.period_to = p.to;
      must(await sb.from('class_sessions').update(row).eq('id', sessionId));
    },
    async shareClass(classId) {
      const code = genCode();
      must(await sb.from('class_sections').update({ shared: true, join_code: code }).eq('id', classId));
      return code;
    },
    async previewClass(code) {
      const p = must(await sb.rpc('preview_class', { p_code: code })) as any;
      if (!p) return null;
      return { id: p.id, sec: p.sec, name: p.name, credits: p.credits, members: Number(p.members), ownerName: p.owner_name,
        sessions: (p.sessions ?? []).map((x: any) => ({ id: x.id, wd: x.wd, from: x.period_from, to: x.period_to, room: x.room })),
        exam: p.exam_at ? { at: p.exam_at, room: p.exam_room ?? '', format: p.exam_format ?? '' } : null, sharedTasks: Number(p.shared_tasks), already: p.already };
    },
    async joinClass(code) { return must(await sb.rpc('join_class', { p_code: code })) as string; },
    async findSharedBySec(sec) { return (must(await sb.rpc('find_class_by_sec', { p_sec: sec })) as any) ?? null; },
    async addClassTask(classId, t) { must(await sb.rpc('add_class_task', { p_class: classId, p_title: t.title, p_due: t.dueAt, p_est: t.est })); },
    async leaveClass(classId) {
      must(await sb.from('class_members').delete().eq('class_id', classId).eq('user_id', uid));
      await sb.from('tasks').delete().eq('class_id', classId).eq('src', 'class').eq('created_by', uid);
    },
    async createGroup(g) {
      const row = must(await sb.from('groups').insert({ name: g.name, class_id: g.classId, invite_code: genCode() }).select('id').single()) as any;
      must(await sb.from('group_members').insert({ group_id: row.id, user_id: uid }));
      await log(row.id, 'tạo nhóm');
      return row.id;
    },
    async joinGroup(code) { return must(await sb.rpc('join_group', { p_code: code })) as string; },
    async assignGroupTask(g) {
      const grp = must(await sb.from('groups').select('class_id').eq('id', g.groupId).single()) as any;
      const row = must(await sb.from('tasks').insert({ title: g.title, group_id: g.groupId, class_id: grp.class_id, due_at: g.dueAt, est: g.est, src: 'group' }).select('id').single()) as any;
      must(await sb.from('task_assignees').insert(g.assignees.map(a => ({ task_id: row.id, user_id: a }))));
      await log(g.groupId, `giao “${g.title}”`);
    },
    async createGoal(g) {
      const row = must(await sb.from('goals').insert({ name: g.name, start_date: g.start, end_date: g.end, days: g.days, minutes: g.minutes, ms: g.ms, items: g.items }).select('id').single()) as any;
      return row.id;
    },
    async updateGoal(id, patch) { must(await sb.from('goals').update({ items: patch.items }).eq('id', id)); },
    async deleteGoal(id) { must(await sb.from('goals').delete().eq('id', id)); },
    async markNotifsRead() { must(await sb.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false)); },
    subscribe(onChange) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const bump = () => { clearTimeout(timer); timer = setTimeout(onChange, 250); };
      const ch = sb.channel('dz-' + uid);
      ['tasks', 'task_assignees', 'activity_log', 'class_sessions', 'class_members', 'group_members', 'notifications']
        .forEach(table => ch.on('postgres_changes', { event: '*', schema: 'public', table }, bump));
      ch.subscribe();
      return () => { clearTimeout(timer); sb.removeChannel(ch); };
    },
  };
}
