import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Plus, Upload } from 'lucide-react';
import type { ClassPreview, ParsedRow, Task } from '../lib/types';
import { useStore } from '../data/store';
import { analyse } from '../lib/priority';
import { WD, WDL, diffDays, fD, fT, periodEnd, periodStart, today0 } from '../lib/date';
import { SAMPLE_TKB, parseTkb } from '../lib/parseTkb';
import { AddTaskModal, TaskModal, TaskRow } from '../components/tasks';
import { Button, Field, Input, Modal, PageHeader, Select, SectionTitle, cx } from '../components/ui';
import { CLASS_COLORS } from './Calendar';

export function ClassList() {
  const { data } = useStore();
  const nav = useNavigate();
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader eyebrow={`${data.classes.length} lớp`} title="Lớp học phần">
        <Button onClick={() => nav('/import')}><Upload size={16} />Dán TKB</Button>
        <Button onClick={() => setCreating(true)}><Plus size={16} />Tạo lớp</Button>
        <Button variant="primary" onClick={() => setJoining(true)}>Nhập mã lớp</Button>
      </PageHeader>

      <section className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {data.classes.map(c => {
          const open = data.tasks.filter(t => t.classId === c.id && t.status !== 'done' && t.assignees.includes(data.me.id)).length;
          return (
            <Link key={c.id} to={`/classes/${c.id}`} className="rounded-[20px] border border-line p-5 flex flex-col gap-4 hover:bg-[#FAFAFA]">
              <div className="flex justify-between items-start gap-3">
                <span className="flex items-center gap-2 text-xs text-muted font-mono"><span className="w-2 h-2 rounded-full" style={{ background: CLASS_COLORS[c.color % CLASS_COLORS.length] }} />{c.sec}</span>
                {c.shared && <span className="text-xs text-muted">{c.members} bạn</span>}
              </div>
              <b className="text-[17px] font-semibold leading-snug">{c.name}</b>
              <div className="flex justify-between text-[13px] text-sub">
                <span>{c.sessions.map(s => `${WD[s.wd]} ${periodStart(s.from)}`).join(' · ')}</span>
                <span className="font-mono">{open ? `${open} việc` : ''}</span>
              </div>
            </Link>
          );
        })}
      </section>
      {!data.classes.length && <p className="text-muted">Chưa có lớp nào. Nhập mã lớp bạn bè gửi, hoặc dán thời khoá biểu.</p>}
      {joining && <JoinClassModal onClose={() => setJoining(false)} />}
      {creating && <CreateClassModal onClose={() => setCreating(false)} />}
    </>
  );
}

export function JoinClassModal({ onClose, initial = '' }: { onClose: () => void; initial?: string }) {
  const { repo, run } = useStore();
  const nav = useNavigate();
  const [code, setCode] = useState(initial);
  const [p, setP] = useState<ClassPreview | null | undefined>(undefined);
  useEffect(() => {
    if (code.length < 6) { setP(undefined); return; }
    let live = true;
    repo.previewClass(code).then(x => live && setP(x)).catch(() => live && setP(null));
    return () => { live = false; };
  }, [code, repo]);
  const join = async () => {
    const id = await run(r => r.joinClass(code), 'Đã tham gia lớp');
    if (id) { onClose(); nav(`/classes/${id}`); }
  };
  return (
    <Modal title="Nhập mã lớp" onClose={onClose}>
      <Input autoFocus value={code} maxLength={6} aria-label="Mã lớp 6 ký tự" placeholder="OOAD9X"
        onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        className="h-14 text-center font-mono text-2xl tracking-[0.3em] uppercase" />
      {p === null && <p className="text-sm text-urgent-ink">Không tìm thấy lớp với mã này.</p>}
      {p && (
        <div className="rounded-2xl bg-soft p-4 flex flex-col gap-1.5 text-sm">
          <span className="font-mono text-xs text-muted">{p.sec}</span>
          <b className="text-base">{p.name}</b>
          <span className="text-sub">{p.sessions.map(s => `${WDL[s.wd]} ${periodStart(s.from)} · ${s.room}`).join(' · ')}</span>
          {p.exam && <span className="text-sub">Thi {fD(p.exam.at)} · {fT(p.exam.at)}</span>}
          <span className="text-muted text-xs">{p.members} bạn · quản lý: {p.ownerName}{p.sharedTasks ? ` · ${p.sharedTasks} bài tập chung` : ''}</span>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Huỷ</Button>
        <Button variant="primary" disabled={!p || p.already} onClick={join}>{p?.already ? 'Đã tham gia' : 'Tham gia'}</Button>
      </div>
    </Modal>
  );
}

function CreateClassModal({ onClose }: { onClose: () => void }) {
  const { run } = useStore();
  const nav = useNavigate();
  const [f, setF] = useState({ sec: '', name: '', credits: 3, lecturer: '', wd: 0, from: 1, to: 3, room: '', shared: true, examDate: '', examTime: '08:00' });
  const set = (k: keyof typeof f, v: unknown) => setF(x => ({ ...x, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const exam = f.examDate ? { at: new Date(`${f.examDate}T${f.examTime}:00`).toISOString(), room: '', format: '' } : null;
    const id = await run(r => r.createClass({ sec: f.sec.trim(), name: f.name.trim(), credits: f.credits, lecturer: f.lecturer, shared: f.shared,
      sessions: [{ wd: f.wd, from: f.from, to: f.to, room: f.room.trim() }], exam }), 'Đã tạo lớp');
    if (id) { onClose(); nav(`/classes/${id}`); }
  };
  return (
    <Modal title="Tạo lớp học phần" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <Field label="Mã LHP"><Input required value={f.sec} onChange={e => set('sec', e.target.value)} placeholder="INT2214 2" /></Field>
          <Field label="Tín chỉ"><Input type="number" min={1} max={6} value={f.credits} onChange={e => set('credits', Number(e.target.value))} /></Field>
        </div>
        <Field label="Tên học phần"><Input required value={f.name} onChange={e => set('name', e.target.value)} placeholder="Nguyên lý hệ điều hành" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Thứ"><Select value={f.wd} onChange={e => set('wd', Number(e.target.value))}>{WDL.map((d, i) => <option key={d} value={i}>{d}</option>)}</Select></Field>
          <Field label="Từ tiết"><Input type="number" min={1} max={12} value={f.from} onChange={e => set('from', Number(e.target.value))} /></Field>
          <Field label="Đến tiết"><Input type="number" min={1} max={12} value={f.to} onChange={e => set('to', Number(e.target.value))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phòng"><Input value={f.room} onChange={e => set('room', e.target.value)} placeholder="107-G2" /></Field>
          <Field label="Ngày thi (nếu có)"><Input type="date" value={f.examDate} onChange={e => set('examDate', e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.shared} onChange={e => set('shared', e.target.checked)} className="w-4 h-4 accent-ink" />Chia sẻ cho cả lớp bằng mã</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Huỷ</Button><Button variant="primary">Tạo lớp</Button></div>
      </form>
    </Modal>
  );
}

export function ClassDetail() {
  const { id } = useParams();
  const { data, run, toast } = useStore();
  const nav = useNavigate();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Task | null>(null);
  const [editRoom, setEditRoom] = useState<string | null>(null);
  const c = data.classes.find(x => x.id === id);
  if (!c) return <p className="text-muted">Không tìm thấy lớp. <Link to="/classes" className="underline">Quay lại</Link></p>;
  const A = analyse(data);
  const tasks = data.tasks.filter(t => t.classId === c.id && t.assignees.includes(data.me.id)).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
  const isOwner = c.ownerId === data.me.id;
  const copy = async () => { try { await navigator.clipboard.writeText(c.joinCode!); toast(`Đã sao chép ${c.joinCode}`); } catch { toast(`Mã: ${c.joinCode}`); } };

  return (
    <>
      <Link to="/classes" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink -mb-3"><ArrowLeft size={15} />Lớp học phần</Link>
      <PageHeader eyebrow={<span className="font-mono">{c.sec} · {c.credits} tín chỉ</span>} title={c.name}>
        <Button variant="primary" onClick={() => setAdding(true)}><Plus size={16} strokeWidth={2.4} />Thêm bài tập</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-8 items-start">
        <section className="flex-[3_1_420px] min-w-0">
          <SectionTitle>Bài tập</SectionTitle>
          {tasks.length ? tasks.map(t => <TaskRow key={t.id} t={t} a={A.get(t.id)} onOpen={setOpen} hideClass />) : <p className="text-muted text-sm py-3">Chưa có bài tập.</p>}
        </section>

        <aside className="flex-[2_1_280px] min-w-0 flex flex-col gap-6">
          {c.shared && c.joinCode ? (
            <section className="rounded-[20px] bg-soft p-5 flex flex-col gap-3">
              <span className="text-[13px] text-muted">Mã lớp · {c.members} bạn đang dùng</span>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[28px] tracking-[0.18em]">{c.joinCode}</span>
                <Button size="sm" onClick={copy}><Copy size={14} />Sao chép</Button>
              </div>
              <span className="text-xs text-muted">{isOwner ? 'Bạn quản lý lớp này. Sửa lịch là cả lớp được cập nhật.' : `Quản lý: ${c.ownerName}`}</span>
            </section>
          ) : isOwner && (
            <Button onClick={() => run(r => r.shareClass(c.id), 'Đã bật chia sẻ')}>Chia sẻ cho cả lớp</Button>
          )}

          <section className="flex flex-col gap-2.5">
            <SectionTitle>Lịch học</SectionTitle>
            {c.sessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 border border-[#F0F0F1] rounded-[14px]">
                <span className="font-mono text-[13px] w-12">{WD[s.wd]}</span>
                <span className="flex-1 text-sm">{periodStart(s.from)}–{periodEnd(s.to)}</span>
                {editRoom === s.id ? (
                  <form onSubmit={e => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem('room') as HTMLInputElement).value; run(r => r.updateSession(c.id, s.id, { room: v }), `Đã đổi phòng, ${c.members - 1} bạn sẽ thấy cập nhật`); setEditRoom(null); }} className="flex gap-1.5">
                    <Input name="room" defaultValue={s.room} autoFocus className="h-9 w-24" aria-label="Phòng" /><Button size="sm" variant="primary">Lưu</Button>
                  </form>
                ) : (
                  <button disabled={!isOwner} onClick={() => setEditRoom(s.id)} className={cx('text-[13px] text-muted', isOwner && 'hover:text-ink underline decoration-dotted underline-offset-4')}>{s.room || '—'}</button>
                )}
              </div>
            ))}
          </section>

          {c.exam && (
            <section className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-[14px] border border-[#F0F0F1]">
              <div className="flex flex-col"><span className="font-medium">Thi {fD(c.exam.at)}</span><span className="text-xs text-muted">{fT(c.exam.at)} {c.exam.room && `· ${c.exam.room}`} {c.exam.format && `· ${c.exam.format}`}</span></div>
              <span className="font-mono text-2xl">{diffDays(c.exam.at, today0())}<span className="text-xs text-muted ml-1">ngày</span></span>
            </section>
          )}

          {!isOwner && <Button variant="ghost" className="self-start" onClick={async () => { await run(r => r.leaveClass(c.id), 'Đã rời lớp'); nav('/classes'); }}>Rời lớp</Button>}
        </aside>
      </div>
      {adding && <AddTaskModal classId={c.id} onClose={() => setAdding(false)} />}
      {open && <TaskModal task={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function ImportTkb() {
  const { data, repo, run } = useStore();
  const nav = useNavigate();
  const [text, setText] = useState(SAMPLE_TKB);
  const [rows, setRows] = useState<(ParsedRow & { exists: boolean; shared: { code: string; members: number } | null })[] | null>(null);
  const parse = async () => {
    const parsed = parseTkb(text);
    setRows(await Promise.all(parsed.map(async p => ({ ...p, exists: data.classes.some(c => c.sec === p.sec), shared: await repo.findSharedBySec(p.sec).catch(() => null) }))));
  };
  const save = async () => {
    if (!rows) return;
    let made = 0, joined = 0;
    await run(async r => {
      for (const p of rows.filter(x => !x.exists)) {
        if (p.shared) { await r.joinClass(p.shared.code); joined++; }
        else { await r.createClass({ sec: p.sec, name: p.name, credits: 3, lecturer: '', shared: true, sessions: [{ wd: p.wd, from: p.from, to: p.to, room: p.room }], exam: null }); made++; }
      }
    });
    run(async () => undefined, `Đã thêm ${made} lớp, tham gia ${joined} lớp dùng chung`);
    nav('/classes');
  };
  return (
    <>
      <Link to="/classes" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink -mb-3"><ArrowLeft size={15} />Lớp học phần</Link>
      <PageHeader title="Dán thời khoá biểu" eyebrow="Copy bảng TKB trên cổng đào tạo rồi dán vào đây" />
      <textarea value={text} onChange={e => setText(e.target.value)} aria-label="Thời khoá biểu"
        className="w-full min-h-[150px] rounded-2xl border border-line p-4 font-mono text-[13px] outline-none focus:border-ink" />
      <div><Button variant="primary" onClick={parse}>Nhận diện</Button></div>
      {rows && (
        <section className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted border-b border-line"><th className="py-2 pr-4 font-medium">Mã</th><th className="py-2 pr-4 font-medium">Học phần</th><th className="py-2 pr-4 font-medium">Lịch</th><th className="py-2 pr-4 font-medium">Phòng</th><th className="py-2 font-medium" /></tr></thead>
              <tbody>{rows.map(r => (
                <tr key={r.sec} className="border-b border-[#F0F0F1]">
                  <td className="py-3 pr-4 font-mono text-xs">{r.sec}</td><td className="py-3 pr-4 font-medium">{r.name}</td>
                  <td className="py-3 pr-4">{WD[r.wd]} · tiết {r.from}–{r.to}</td><td className="py-3 pr-4 text-muted">{r.room}</td>
                  <td className="py-3 text-xs text-right whitespace-nowrap">{r.exists ? <span className="text-muted">Đã có</span> : r.shared ? <span className="font-medium">Tham gia lớp chung · {r.shared.members} bạn</span> : <span className="text-muted">Tạo mới</span>}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <div><Button variant="primary" onClick={save} disabled={!rows.some(r => !r.exists)}>Lưu {rows.filter(r => !r.exists).length} lớp</Button></div>
        </section>
      )}
    </>
  );
}
