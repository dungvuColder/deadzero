import { useMemo, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import type { Task } from '../lib/types';
import { useStore } from '../data/store';
import { analyse, remaining, round1, LEVEL_LABEL, type Analysis } from '../lib/priority';
import { addDays, diffDays, dueLabel, fD, fT, iso, pad, today0 } from '../lib/date';
import { fmtH } from '../lib/planner';
import { AiBreakdownPanel, stepsToSubtasks } from './ai';
import { AvatarStack, Button, Field, Input, LevelDot, Modal, Select, cx } from './ui';

export function startText(s: Date) {
  return diffDays(s, today0()) <= 0 ? 'Bắt đầu ngay' : `Bắt đầu ${fD(s)}`;
}

/** Hoàn thành / mở lại một nhiệm vụ */
export function useToggleTask() {
  const { run } = useStore();
  return (t: Task) => {
    const done = t.status !== 'done';
    return run(r => r.updateTask(t.id, done
      ? { status: 'done', progress: 100, doneAt: new Date().toISOString(), subtasks: t.subtasks.map(s => ({ ...s, done: true })) }
      : { status: 'todo', progress: Math.min(t.progress, 90), doneAt: null },
      t.groupId ? (done ? `hoàn thành “${t.title}”` : `mở lại “${t.title}”`) : undefined), done ? 'Đã xong' : 'Đã mở lại');
  };
}

export function TaskRow({ t, a, onOpen, showStart, hideClass, planned }: { t: Task; a?: Analysis; onOpen: (t: Task) => void; showStart?: boolean; hideClass?: boolean; planned?: number }) {
  const { data } = useStore();
  const toggle = useToggleTask();
  const cls = hideClass ? undefined : data.classes.find(c => c.id === t.classId);
  const group = data.groups.find(g => g.id === t.groupId);
  const done = t.status === 'done';
  return (
    <div className="flex items-center gap-3.5 min-h-[52px] py-2 border-b border-[#F0F0F1] last:border-0">
      <button onClick={() => toggle(t)} aria-label={done ? 'Mở lại' : 'Đánh dấu xong'}
        className={cx('w-5 h-5 rounded-[6px] border-[1.5px] grid place-items-center shrink-0', done ? 'bg-ink border-ink text-white' : 'border-[#C4C4C8] hover:border-ink')}>
        {done && <Check size={13} strokeWidth={3} />}
      </button>
      <button onClick={() => onOpen(t)} className="flex-1 min-w-0 text-left">
        <span className={cx('block font-medium truncate', done && 'line-through text-muted')}>{t.title}</span>
        {(showStart && a) || cls ? (
          <span className="flex gap-3 text-xs text-muted mt-0.5 truncate">
            {cls && <span className="truncate">{cls.name}</span>}
            {showStart && a && !done && <span className={cx(diffDays(a.start, today0()) <= 0 && 'text-urgent-ink font-medium')}>{startText(a.start)}</span>}
          </span>
        ) : null}
      </button>
      {group && <AvatarStack people={t.assignees.map(id => ({ id, name: data.people[id] || '?' }))} meId={data.me.id} size={22} />}
      {planned !== undefined && !done && <span title="Số giờ nên làm hôm nay" className="font-mono text-xs rounded-md bg-soft px-1.5 py-0.5 shrink-0">{fmtH(planned)}</span>}
      <span className={cx('font-mono text-[13px] shrink-0', a?.level === 'late' && !done ? 'text-urgent-ink' : 'text-muted')}>{done ? '✓' : dueLabel(t.dueAt)}</span>
      {a && !done ? <LevelDot level={a.level} r={a.r} /> : <span className="w-2" />}
    </div>
  );
}

const EST: Record<string, number> = { 'Bài tập': 2, 'Báo cáo': 6, 'Ôn thi': 10, 'Khác': 2 };

export function AddTaskModal({ onClose, classId }: { onClose: () => void; classId?: string }) {
  const { data, run, repo } = useStore();
  const [title, setTitle] = useState('');
  const [cls, setCls] = useState(classId ?? '');
  const [kind, setKind] = useState('Bài tập');
  const [date, setDate] = useState(iso(addDays(today0(), 7)));
  const [time, setTime] = useState('23:59');
  const [est, setEst] = useState(2);
  const [shareToClass, setShareToClass] = useState(false);
  const [aiSubs, setAiSubs] = useState<{ t: string; done: boolean }[]>([]);
  const target = data.classes.find(c => c.id === cls);
  const canShare = target && target.shared && target.ownerId === data.me.id;

  const dueAt = useMemo(() => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(y, m - 1, d, h || 23, mi || 59).toISOString(); }, [date, time]);
  const preview = useMemo(() => {
    const fake: Task = { id: '__p', title: 'x', classId: null, groupId: null, dueAt, est, progress: 0, status: 'todo', src: 'personal', createdBy: data.me.id, assignees: [data.me.id], subtasks: [], doneAt: null, files: 0 };
    return analyse({ ...data, tasks: [...data.tasks, fake] }).get('__p');
  }, [data, dueAt, est]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (canShare && shareToClass) await run(r => r.addClassTask(cls, { title: title.trim(), dueAt, est }), `Đã giao cho ${target!.members} bạn trong lớp`);
    else await run(r => r.addTask({ title: title.trim(), classId: cls || null, dueAt, est, subtasks: aiSubs }), 'Đã thêm');
    onClose();
  }
  void repo;
  return (
    <Modal title="Thêm việc" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Tên việc"><Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Bài tập lớn Web – sprint 3" required /></Field>
        <AiBreakdownPanel title={title} course={target?.name} due={date} onApply={(steps, total) => { setAiSubs(stepsToSubtasks(steps)); setEst(total); }} />
        {aiSubs.length > 0 && <p className="text-[13px] text-sub -mt-2">Đã thêm {aiSubs.length} bước nhỏ · ước lượng {fmtH(est)}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Môn"><Select value={cls} onChange={e => setCls(e.target.value)}><option value="">Việc riêng</option>{data.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Loại"><Select value={kind} onChange={e => { setKind(e.target.value); setEst(EST[e.target.value]); }}>{Object.keys(EST).map(k => <option key={k}>{k}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Hạn"><Input type="date" value={date} onChange={e => setDate(e.target.value)} required /></Field>
          <Field label="Giờ"><Input type="time" value={time} onChange={e => setTime(e.target.value)} /></Field>
          <Field label="Cần (giờ)"><Input type="number" min={0.5} step={0.5} value={est} onChange={e => setEst(Number(e.target.value) || 1)} /></Field>
        </div>
        {canShare && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={shareToClass} onChange={e => setShareToClass(e.target.checked)} className="w-4 h-4 accent-ink" />Giao cho cả lớp ({target!.members} bạn)</label>
        )}
        {preview && (
          <div className="flex items-center gap-2 text-sm bg-soft rounded-xl px-3.5 py-3">
            <LevelDot level={preview.level} /><span className="font-medium">{LEVEL_LABEL[preview.level]}</span>
            <span className="text-muted">· {startText(preview.start)}</span>
          </div>
        )}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Huỷ</Button><Button variant="primary">Thêm</Button></div>
      </form>
    </Modal>
  );
}

export function TaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { data, run } = useStore();
  const toggle = useToggleTask();
  const t = data.tasks.find(x => x.id === task.id) ?? task;
  const a = analyse(data).get(t.id);
  const cls = data.classes.find(c => c.id === t.classId);
  const [progress, setProgress] = useState(t.progress);

  const setSub = (i: number, done: boolean) => {
    const subtasks = t.subtasks.map((s, j) => (j === i ? { ...s, done } : s));
    const p = Math.round(subtasks.filter(s => s.done).length / subtasks.length * 100);
    setProgress(p);
    run(r => r.updateTask(t.id, { subtasks, progress: p, status: p >= 100 ? 'done' : p > 0 && t.status === 'todo' ? 'doing' : t.status, doneAt: p >= 100 ? new Date().toISOString() : null }));
  };
  const commitProgress = (p: number) => run(r => r.updateTask(t.id, { progress: p, status: p > 0 && t.status === 'todo' ? 'doing' : t.status },
    t.groupId ? `cập nhật “${t.title}” lên ${p}%` : undefined));

  const due = new Date(t.dueAt);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ title: t.title, date: iso(due), time: `${pad(due.getHours())}:${pad(due.getMinutes())}`, est: t.est });
  const [newSub, setNewSub] = useState('');
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [y, m, d] = f.date.split('-').map(Number); const [h, mi] = f.time.split(':').map(Number);
    await run(r => r.updateTask(t.id, { title: f.title.trim() || t.title, dueAt: new Date(y, m - 1, d, h, mi).toISOString(), est: Math.max(0.5, f.est) },
      t.groupId ? `sửa “${f.title.trim() || t.title}”` : undefined), 'Đã lưu');
    setEditing(false);
  };
  const addSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    const subtasks = [...t.subtasks, { t: newSub.trim(), done: false }];
    const p = Math.round(subtasks.filter(s => s.done).length / subtasks.length * 100);
    setProgress(p); setNewSub('');
    run(r => r.updateTask(t.id, { subtasks, progress: p }));
  };

  return (
    <Modal title={t.title} onClose={onClose}>
      <div className="flex flex-col gap-5">
        {editing ? (
          <form onSubmit={saveEdit} className="flex flex-col gap-3">
            <Field label="Tên việc"><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} autoFocus /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Hạn"><Input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
              <Field label="Giờ"><Input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
              <Field label="Cần (giờ)"><Input type="number" min={0.5} step={0.5} value={f.est} onChange={e => setF({ ...f, est: Number(e.target.value) || 1 })} /></Field>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Huỷ</Button><Button size="sm" variant="primary">Lưu</Button></div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-sub">
            {cls && <span>{cls.name}</span>}
            <span>Hạn {fD(t.dueAt)} · {fT(t.dueAt)}</span>
            <span className="font-mono">{round1(remaining(t))}/{t.est} giờ</span>
            <button onClick={() => setEditing(true)} className="ml-auto text-[13px] font-medium text-ink underline underline-offset-4">Sửa</button>
          </div>
        )}
        {a && t.status !== 'done' && (
          <div className="flex items-center gap-2 text-sm bg-soft rounded-xl px-3.5 py-3">
            <LevelDot level={a.level} r={a.r} /><span className="font-medium">{LEVEL_LABEL[a.level]}</span><span className="text-muted">· {startText(a.start)}</span>
          </div>
        )}
        <label className="flex flex-col gap-2 text-[13px] font-medium">
          <span className="flex justify-between">Tiến độ <span className="font-mono">{progress}%</span></span>
          <input type="range" min={0} max={100} step={5} value={progress} onChange={e => setProgress(Number(e.target.value))}
            onMouseUp={() => commitProgress(progress)} onTouchEnd={() => commitProgress(progress)} onKeyUp={() => commitProgress(progress)} className="accent-ink" />
        </label>
        {t.status !== 'done' && (
          <AiBreakdownPanel title={t.title} course={cls?.name} due={t.dueAt.slice(0, 10)} onApply={(steps, total) => {
            const subtasks = [...t.subtasks, ...stepsToSubtasks(steps)];
            const p = Math.round(subtasks.filter(x => x.done).length / subtasks.length * 100);
            setProgress(p);
            run(r => r.updateTask(t.id, { subtasks, progress: p, est: total }), `Đã thêm ${steps.length} bước`);
          }} />
        )}
        <div className="flex flex-col gap-1">
          {t.subtasks.map((s, i) => (
            <label key={i} className="flex items-center gap-3 min-h-[36px] text-sm">
              <input type="checkbox" checked={s.done} onChange={e => setSub(i, e.target.checked)} className="w-4 h-4 accent-ink" />
              <span className={cx(s.done && 'line-through text-muted')}>{s.t}</span>
            </label>
          ))}
          <form onSubmit={addSub} className="flex gap-2 mt-1">
            <Input value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="Thêm bước nhỏ…" aria-label="Thêm bước nhỏ" className="h-9 flex-1" />
            <Button size="sm" disabled={!newSub.trim()}>Thêm</Button>
          </form>
        </div>
        <div className="flex justify-between gap-2">
          {t.createdBy === data.me.id && !t.groupId ? (
            <Button variant="ghost" onClick={async () => { await run(r => r.deleteTask(t.id), 'Đã xoá'); onClose(); }} aria-label="Xoá"><Trash2 size={16} />Xoá</Button>
          ) : <span />}
          <Button variant="primary" onClick={async () => { await toggle(t); onClose(); }}>{t.status === 'done' ? 'Mở lại' : 'Xong'}</Button>
        </div>
      </div>
    </Modal>
  );
}
