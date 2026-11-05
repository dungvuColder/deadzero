import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Download, Plus } from 'lucide-react';
import { downloadContributionCsv } from '../lib/exporters';
import type { Task } from '../lib/types';
import { useStore } from '../data/store';
import { remaining, round1 } from '../lib/priority';
import { addDays, fD, fT, iso, today0 } from '../lib/date';
import { TaskModal } from '../components/tasks';
import { Avatar, AvatarStack, Button, Field, Input, Modal, PageHeader, Progress, Segmented, Select, cx } from '../components/ui';
import { Board } from './Tasks';

export function GroupList() {
  const { data, run } = useStore();
  const nav = useNavigate();
  const [mode, setMode] = useState<null | 'create' | 'join'>(null);
  const [name, setName] = useState('');
  const [cls, setCls] = useState('');
  const [code, setCode] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = mode === 'create'
      ? await run(r => r.createGroup({ name: name.trim(), classId: cls || null }), 'Đã tạo nhóm')
      : await run(r => r.joinGroup(code), 'Đã vào nhóm');
    if (id) { setMode(null); nav(`/groups/${id}`); }
  };
  return (
    <>
      <PageHeader eyebrow={`${data.groups.length} nhóm`} title="Nhóm">
        <Button onClick={() => setMode('join')}>Nhập mã nhóm</Button>
        <Button variant="primary" onClick={() => setMode('create')}><Plus size={16} strokeWidth={2.4} />Tạo nhóm</Button>
      </PageHeader>
      <section className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {data.groups.map(g => {
          const ts = data.tasks.filter(t => t.groupId === g.id);
          const total = ts.reduce((s, t) => s + t.est, 0);
          const pct = total ? Math.round(ts.reduce((s, t) => s + t.est * t.progress / 100, 0) / total * 100) : 0;
          return (
            <Link key={g.id} to={`/groups/${g.id}`} className="rounded-[20px] border border-line p-5 flex flex-col gap-4 hover:bg-[#FAFAFA]">
              <div className="flex justify-between"><span className="text-xs text-muted">{data.classes.find(c => c.id === g.classId)?.name ?? 'Nhóm tự do'}</span><span className="font-mono text-xs text-muted">{pct}%</span></div>
              <b className="text-[17px] font-semibold">{g.name}</b>
              <div className="flex justify-between items-center"><AvatarStack people={g.members} meId={data.me.id} /><span className="text-xs text-muted">{ts.filter(t => t.status !== 'done').length} việc đang mở</span></div>
            </Link>
          );
        })}
      </section>
      {!data.groups.length && <p className="text-muted">Chưa có nhóm. Tạo nhóm rồi gửi mã cho các bạn.</p>}
      {mode && (
        <Modal title={mode === 'create' ? 'Tạo nhóm' : 'Nhập mã nhóm'} onClose={() => setMode(null)}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'create' ? (
              <>
                <Field label="Tên nhóm"><Input autoFocus required value={name} onChange={e => setName(e.target.value)} placeholder="Nhóm 5" /></Field>
                <Field label="Môn"><Select value={cls} onChange={e => setCls(e.target.value)}><option value="">Không gắn môn</option>{data.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              </>
            ) : (
              <Input autoFocus required maxLength={6} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                aria-label="Mã nhóm" className="h-14 text-center font-mono text-2xl tracking-[0.3em]" />
            )}
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setMode(null)}>Huỷ</Button><Button variant="primary">{mode === 'create' ? 'Tạo' : 'Vào nhóm'}</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function GroupDetail() {
  const { id } = useParams();
  const { data, run, toast } = useStore();
  const [tab, setTab] = useState<'board' | 'contrib' | 'log'>('board');
  const [assigning, setAssigning] = useState(false);
  const [open, setOpen] = useState<Task | null>(null);
  const g = data.groups.find(x => x.id === id);
  if (!g) return <p className="text-muted">Không tìm thấy nhóm. <Link to="/groups" className="underline">Quay lại</Link></p>;
  const ts = data.tasks.filter(t => t.groupId === g.id);
  const total = ts.reduce((s, t) => s + t.est, 0);
  const pct = total ? Math.round(ts.reduce((s, t) => s + t.est * t.progress / 100, 0) / total * 100) : 0;
  const isLeader = g.leaderId === data.me.id;
  const copy = async () => { try { await navigator.clipboard.writeText(g.code); toast(`Đã sao chép ${g.code}`); } catch { toast(`Mã: ${g.code}`); } };

  const review = (t: Task, ok: boolean) => run(r => r.updateTask(t.id, ok
    ? { status: 'done', progress: 100, doneAt: new Date().toISOString() }
    : { status: 'doing', progress: Math.min(t.progress, 80) }, ok ? `duyệt “${t.title}”` : `trả lại “${t.title}”`), ok ? 'Đã duyệt' : 'Đã trả lại');

  return (
    <>
      <Link to="/groups" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink -mb-3"><ArrowLeft size={15} />Nhóm</Link>
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] text-muted">{data.classes.find(c => c.id === g.classId)?.name ?? 'Nhóm tự do'}</span>
          <h1 className="text-[28px] md:text-[30px] font-semibold tracking-[-0.02em]">{g.name}</h1>
          <div className="flex items-center gap-3">
            <AvatarStack people={g.members} meId={data.me.id} size={28} />
            <button onClick={copy} className="inline-flex items-center gap-1.5 font-mono text-[13px] text-muted hover:text-ink" aria-label="Sao chép mã nhóm">{g.code}<Copy size={13} /></button>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex flex-col gap-1.5 w-40">
            <div className="flex justify-between text-[13px]"><span className="text-muted">Tiến độ</span><span className="font-mono">{pct}%</span></div>
            <Progress value={pct} />
          </div>
          <Button variant="primary" onClick={() => setAssigning(true)}><Plus size={16} strokeWidth={2.4} />Giao việc</Button>
        </div>
      </header>

      <div><Segmented value={tab} onChange={setTab} options={[['board', 'Bảng'], ['contrib', 'Đóng góp'], ['log', 'Nhật ký']]} /></div>

      {tab === 'board' && (
        <Board tasks={ts} groupId={g.id} onOpen={setOpen} columns={[['todo', 'Cần làm'], ['doing', 'Đang làm'], ['review', 'Chờ duyệt'], ['done', 'Xong']]}
          renderExtra={t => t.status === 'review' && isLeader ? (
            <div className="flex gap-2">
              <Button size="sm" variant="primary" className="flex-1" onClick={() => review(t, true)}>Duyệt</Button>
              <Button size="sm" className="flex-1" onClick={() => review(t, false)}>Trả lại</Button>
            </div>
          ) : null} />
      )}

      {tab === 'contrib' && <Contribution groupId={g.id} />}

      {tab === 'log' && (
        <ul className="flex flex-col">
          {data.log.filter(l => l.groupId === g.id).sort((a, b) => (a.at < b.at ? 1 : -1)).map(l => (
            <li key={l.id} className="flex items-center gap-3 py-3 border-b border-[#F0F0F1] last:border-0 text-sm">
              <Avatar name={data.people[l.actorId] || '?'} me={l.actorId === data.me.id} size={26} />
              <span className="flex-1"><b className="font-semibold">{data.people[l.actorId] || 'Ai đó'}</b> {l.action}</span>
              <span className="font-mono text-xs text-muted whitespace-nowrap">{fD(l.at)} {fT(l.at)}</span>
            </li>
          ))}
        </ul>
      )}

      {assigning && <AssignModal groupId={g.id} onClose={() => setAssigning(false)} />}
      {open && <TaskModal task={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Contribution({ groupId }: { groupId: string }) {
  const { data } = useStore();
  const g = data.groups.find(x => x.id === groupId)!;
  const ts = data.tasks.filter(t => t.groupId === groupId);
  const total = ts.reduce((s, t) => s + t.est / Math.max(t.assignees.length, 1), 0) || 1;
  const rows = g.members.map(m => {
    const mine = ts.filter(t => t.assignees.includes(m.id));
    const done = mine.filter(t => t.status === 'done');
    const ontime = done.filter(t => t.doneAt && t.doneAt <= t.dueAt).length;
    const hours = mine.reduce((s, t) => s + t.est / t.assignees.length, 0);
    const left = mine.filter(t => t.status !== 'done').reduce((s, t) => s + remaining(t) / t.assignees.length, 0);
    return { m, n: mine.length, d: done.length, hours, left, rate: done.length ? Math.round(ontime / done.length * 100) : null, files: mine.reduce((s, t) => s + t.files, 0) };
  });
  const max = Math.max(...rows.map(r => r.hours), 1);
  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-[20px] bg-soft p-6 grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {rows.map(r => (
          <div key={r.m.id} className="flex flex-col gap-2">
            <span className="font-semibold">{r.m.id === data.me.id ? 'Bạn' : r.m.name}</span>
            <div className="h-1.5 rounded-full bg-[#E4E4E7]"><div className="h-full bg-ink rounded-full" style={{ width: `${r.hours / max * 100}%` }} /></div>
            <span className={cx('font-mono text-xs', r.rate !== null && r.rate < 100 ? 'text-urgent-ink' : 'text-sub')}>{round1(r.hours)}h · {r.rate === null ? '—' : `${r.rate}%`}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted border-b border-line">
            <th className="py-2 pr-4 font-medium">Thành viên</th><th className="py-2 pr-4 font-medium text-right">Việc</th><th className="py-2 pr-4 font-medium text-right">Xong</th>
            <th className="py-2 pr-4 font-medium text-right">Giờ công</th><th className="py-2 pr-4 font-medium text-right">Tỷ trọng</th><th className="py-2 pr-4 font-medium text-right">Đúng hạn</th><th className="py-2 font-medium text-right">Còn lại</th>
          </tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.m.id} className="border-b border-[#F0F0F1] font-mono text-[13px]">
              <td className="py-3 pr-4 font-sans font-medium">{r.m.id === data.me.id ? 'Bạn' : r.m.name}{r.m.id === g.leaderId && <span className="text-xs text-muted font-normal"> · trưởng nhóm</span>}</td>
              <td className="py-3 pr-4 text-right">{r.n}</td><td className="py-3 pr-4 text-right">{r.d}</td><td className="py-3 pr-4 text-right">{round1(r.hours)}</td>
              <td className="py-3 pr-4 text-right">{Math.round(r.hours / total * 100)}%</td><td className="py-3 pr-4 text-right">{r.rate === null ? '—' : `${r.rate}%`}</td><td className="py-3 text-right">{round1(r.left)}h</td>
            </tr>))}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-xs text-muted">Số liệu lấy từ nhật ký nhóm, không ai sửa được. Dùng kèm phiếu đánh giá chéo.</p>
        <Button size="sm" onClick={() => downloadContributionCsv(g.name, rows.map(r => ({
          name: r.m.id === data.me.id ? data.me.name : r.m.name, leader: r.m.id === g.leaderId, n: r.n, d: r.d, hours: r.hours,
          share: Math.round(r.hours / total * 100), rate: r.rate, left: r.left,
        })))}><Download size={14} />Tải Excel (CSV)</Button>
      </div>
    </section>
  );
}

function AssignModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const { data, run } = useStore();
  const g = data.groups.find(x => x.id === groupId)!;
  const [title, setTitle] = useState('');
  const [who, setWho] = useState<string[]>([data.me.id]);
  const [date, setDate] = useState(iso(addDays(today0(), 5)));
  const [est, setEst] = useState(3);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!who.length) return;
    const [y, m, d] = date.split('-').map(Number);
    await run(r => r.assignGroupTask({ groupId, title: title.trim(), assignees: who, dueAt: new Date(y, m - 1, d, 23, 59).toISOString(), est }), 'Đã giao việc');
    onClose();
  };
  return (
    <Modal title="Giao việc" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Việc"><Input autoFocus required value={title} onChange={e => setTitle(e.target.value)} placeholder="Viết phần kết luận" /></Field>
        <div className="flex flex-col gap-2 text-[13px] font-medium">
          <span>Người làm</span>
          <div className="flex flex-wrap gap-2">
            {g.members.map((m, i) => {
              const on = who.includes(m.id);
              return (
                <button type="button" key={m.id} aria-pressed={on} onClick={() => setWho(on ? who.filter(x => x !== m.id) : [...who, m.id])}
                  className={cx('h-10 pl-1 pr-3.5 rounded-full border flex items-center gap-2 text-sm', on ? 'border-ink bg-ink text-white' : 'border-line')}>
                  <Avatar name={m.name} me={m.id === data.me.id} size={30} i={i} />{m.id === data.me.id ? 'Bạn' : m.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hạn"><Input type="date" required value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Cần (giờ)"><Input type="number" min={0.5} step={0.5} value={est} onChange={e => setEst(Number(e.target.value) || 1)} /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Huỷ</Button><Button variant="primary" disabled={!who.length}>Giao việc</Button></div>
      </form>
    </Modal>
  );
}
