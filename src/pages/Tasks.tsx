import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Status, Task } from '../lib/types';
import { useStore } from '../data/store';
import { analyse } from '../lib/priority';
import { dueLabel } from '../lib/date';
import { AddTaskModal, TaskModal, TaskRow } from '../components/tasks';
import { Button, LevelDot, PageHeader, Segmented, cx } from '../components/ui';

export default function Tasks() {
  const { data } = useStore();
  const [view, setView] = useState<'list' | 'board'>('list');
  const [filter, setFilter] = useState<string>('all');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Task | null>(null);
  const A = analyse(data);
  const mine = data.tasks.filter(t => t.assignees.includes(data.me.id) && (filter === 'all' || t.classId === filter));
  const openTasks = mine.filter(t => t.status !== 'done').sort((a, b) => A.get(b.id)!.r - A.get(a.id)!.r || +new Date(a.dueAt) - +new Date(b.dueAt));
  const done = mine.filter(t => t.status === 'done').sort((a, b) => +new Date(b.dueAt) - +new Date(a.dueAt));

  return (
    <>
      <PageHeader eyebrow={`${openTasks.length} việc đang mở`} title="Nhiệm vụ">
        <Segmented value={view} onChange={setView} options={[['list', 'Ưu tiên'], ['board', 'Bảng']]} />
        <Button variant="primary" onClick={() => setAdding(true)}><Plus size={16} strokeWidth={2.4} />Thêm việc</Button>
      </PageHeader>

      <div className="flex gap-1.5 flex-wrap">
        {[{ id: 'all', name: 'Tất cả' }, ...data.classes].map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} aria-pressed={filter === c.id}
            className={cx('h-9 px-3.5 rounded-full text-[13px] font-medium border', filter === c.id ? 'bg-ink text-white border-ink' : 'border-line hover:bg-soft')}>
            {c.name}
          </button>
        ))}
      </div>

      {view === 'list' ? (
        <div className="flex flex-col gap-8">
          <section>{openTasks.length ? openTasks.map(t => <TaskRow key={t.id} t={t} a={A.get(t.id)} onOpen={setOpen} showStart />) : <p className="text-muted py-6">Không có việc nào đang mở.</p>}</section>
          {done.length > 0 && (
            <details>
              <summary className="cursor-pointer text-[13px] text-muted font-medium mb-2">Đã xong · {done.length}</summary>
              {done.map(t => <TaskRow key={t.id} t={t} onOpen={setOpen} />)}
            </details>
          )}
        </div>
      ) : (
        <Board tasks={mine} onOpen={setOpen} columns={[['todo', 'Cần làm'], ['doing', 'Đang làm'], ['done', 'Xong']]} />
      )}

      {adding && <AddTaskModal onClose={() => setAdding(false)} />}
      {open && <TaskModal task={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Kanban dùng chung cho cá nhân và nhóm: kéo thả hoặc bấm mũi tên */
export function Board({ tasks, columns, onOpen, groupId, renderExtra }: {
  tasks: Task[]; columns: [Status, string][]; onOpen: (t: Task) => void; groupId?: string;
  renderExtra?: (t: Task) => React.ReactNode;
}) {
  const { data, run } = useStore();
  const A = analyse(data);
  const [over, setOver] = useState<Status | null>(null);
  const order = columns.map(c => c[0]);
  const colOf = (t: Task): Status => (order.includes(t.status) ? t.status : 'doing');
  const NAME = Object.fromEntries(columns) as Record<Status, string>;

  const move = (t: Task, to: Status) => {
    if (colOf(t) === to) return;
    const patch = to === 'done'
      ? { status: to, progress: 100, doneAt: new Date().toISOString() }
      : { status: to, doneAt: null, progress: t.progress >= 100 ? 90 : t.progress };
    const verb = t.status === 'review' && to === 'done' ? `duyệt “${t.title}”` : `chuyển “${t.title}” sang ${NAME[to]}`;
    run(r => r.updateTask(t.id, patch, t.groupId ? verb : undefined), `Đã chuyển sang ${NAME[to]}`);
  };

  return (
    <section className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))` }}>
      {columns.map(([k, label], ci) => {
        const items = tasks.filter(t => colOf(t) === k).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
        return (
          <div key={k} onDragOver={e => { e.preventDefault(); setOver(k); }} onDragLeave={() => setOver(null)}
            onDrop={e => { e.preventDefault(); setOver(null); const t = tasks.find(x => x.id === e.dataTransfer.getData('text/plain')); if (t) move(t, k); }}
            className={cx('flex flex-col gap-2.5 rounded-2xl p-1 min-h-[160px]', over === k && 'bg-soft')}>
            <div className="flex justify-between text-[13px] text-muted px-1"><span>{label}</span><span className="font-mono">{items.length}</span></div>
            {items.map(t => {
              const a = A.get(t.id);
              const mineCard = t.assignees.includes(data.me.id) && groupId;
              const isDone = t.status === 'done';
              return (
                <article key={t.id} draggable onDragStart={e => e.dataTransfer.setData('text/plain', t.id)}
                  className={cx('rounded-[14px] p-3.5 flex flex-col gap-3 cursor-grab active:cursor-grabbing',
                    isDone ? 'bg-soft' : mineCard ? 'border-[1.5px] border-ink bg-white' : 'border border-line bg-white')}>
                  <div className="flex justify-between gap-2">
                    <button onClick={() => onOpen(t)} className={cx('text-left font-medium hover:underline', isDone && 'text-sub')}>{t.title}</button>
                    {a && !isDone && <span className="mt-1.5"><LevelDot level={a.level} r={a.r} /></span>}
                  </div>
                  {!isDone && t.progress > 0 && <div className="h-1 rounded-full bg-soft"><div className="h-full bg-ink rounded-full" style={{ width: `${t.progress}%` }} /></div>}
                  {renderExtra?.(t)}
                  <div className="flex justify-between items-center gap-2">
                    <span className="flex items-center gap-2">
                      {groupId && <span className="flex">{t.assignees.map((id, i) => (
                        <span key={id} title={data.people[id]} className={cx('w-6 h-6 rounded-full text-[10px] font-semibold grid place-items-center border-2 border-white', i > 0 && '-ml-1.5', id === data.me.id ? 'bg-ink text-white' : 'bg-[#E4E4E7]')}>{(data.people[id] || '?')[0]}</span>
                      ))}</span>}
                      <span className={cx('font-mono text-xs', a?.level === 'late' && !isDone ? 'text-urgent-ink' : 'text-muted')}>{isDone ? (t.doneAt && t.doneAt <= t.dueAt ? 'Đúng hạn' : 'Xong') : dueLabel(t.dueAt)}</span>
                    </span>
                    <span className="flex gap-0.5">
                      <button aria-label="Cột trước" disabled={ci === 0} onClick={() => move(t, order[ci - 1])} className="w-7 h-7 rounded-lg grid place-items-center text-muted hover:bg-soft disabled:opacity-30"><ChevronLeft size={15} /></button>
                      <button aria-label="Cột sau" disabled={ci === columns.length - 1} onClick={() => move(t, order[ci + 1])} className="w-7 h-7 rounded-lg grid place-items-center text-muted hover:bg-soft disabled:opacity-30"><ChevronRight size={15} /></button>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
