import { useState } from 'react';
import { Flame, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../data/store';
import { TEMPLATES, buildGoal, reschedule, streak } from '../lib/templates';
import { generateGoal } from '../lib/ai';
import { WD, addDays, diffDays, fD, fromIsoDate, iso, today0 } from '../lib/date';
import { Button, Field, Input, Modal, PageHeader, Progress, Select, cx } from '../components/ui';

export default function Goals() {
  const { data, run } = useStore();
  const [creating, setCreating] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(data.goals[0]?.id ?? null);
  const t0 = today0();

  const toggle = (gid: string, iid: string, done: boolean) => {
    const g = data.goals.find(x => x.id === gid)!;
    run(r => r.updateGoal(gid, { items: g.items.map(i => (i.id === iid ? { ...i, done } : i)) }));
  };

  return (
    <>
      <PageHeader eyebrow={`${data.goals.length} lộ trình`} title="Tự học">
        <Button variant="primary" onClick={() => setCreating('ai')}><Plus size={16} strokeWidth={2.4} />Lộ trình mới</Button>
      </PageHeader>

      {data.goals.map(g => {
        const done = g.items.filter(i => i.done).length;
        const pct = Math.round(done / Math.max(g.items.length, 1) * 100);
        const missed = g.items.filter(i => !i.done && diffDays(i.day, t0) < 0).length;
        const next = g.items.find(i => !i.done && diffDays(i.day, t0) >= 0);
        const open = openId === g.id;
        return (
          <section key={g.id} className="rounded-[20px] border border-line p-6 flex flex-col gap-5">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div className="flex flex-col gap-1">
                <b className="text-lg font-semibold">{g.name}</b>
                <span className="text-[13px] text-muted">{g.days.map(d => WD[d]).join(' · ')} · {g.minutes} phút</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-semibold"><Flame size={18} className="text-urgent-ink" />{streak(g)}</span>
                <Button size="sm" variant="ghost" onClick={() => setOpenId(open ? null : g.id)}>{open ? 'Thu gọn' : 'Chi tiết'}</Button>
              </div>
            </div>
            <div className="flex items-center gap-3"><Progress value={pct} className="flex-1" /><span className="font-mono text-[13px] text-sub">{done}/{g.items.length}</span></div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {next && <span className="text-sub">Tiếp theo: <b className="text-ink font-medium">{next.title}</b> · {fD(fromIsoDate(next.day))}</span>}
              {missed > 0 && <Button size="sm" onClick={() => run(r => r.updateGoal(g.id, { items: reschedule(g) }), `Đã dời ${missed} buổi lỡ`)}>Dời {missed} buổi lỡ</Button>}
            </div>
            {open && (
              <div className="flex flex-col gap-4">
                {g.ms.map((m, mi) => {
                  const its = g.items.filter(i => i.mi === mi);
                  return (
                    <div key={m} className="flex flex-col">
                      <div className="flex justify-between text-[13px] font-semibold mb-1"><span>{m}</span><span className="font-mono text-muted font-normal">{its.filter(i => i.done).length}/{its.length}</span></div>
                      {its.map(i => {
                        const dd = diffDays(i.day, t0);
                        return (
                          <label key={i.id} className={cx('grid grid-cols-[auto_70px_1fr] gap-3 items-center min-h-[40px] px-2 rounded-lg text-sm cursor-pointer', dd === 0 && 'bg-soft')}>
                            <input type="checkbox" checked={i.done} onChange={e => toggle(g.id, i.id, e.target.checked)} className="w-4 h-4 accent-ink" />
                            <span className={cx('font-mono text-xs', !i.done && dd < 0 ? 'text-urgent-ink' : 'text-muted')}>{fD(fromIsoDate(i.day))}</span>
                            <span className={cx(i.done && 'line-through text-muted')}>{i.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
                <Button variant="ghost" size="sm" className="self-start" onClick={() => run(r => r.deleteGoal(g.id), 'Đã xoá lộ trình')}><Trash2 size={14} />Xoá lộ trình</Button>
              </div>
            )}
          </section>
        );
      })}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold">Mẫu có sẵn</h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {TEMPLATES.map(t => (
            <button key={t.key} onClick={() => setCreating(t.key)} className="text-left rounded-[20px] bg-soft p-5 flex flex-col gap-1.5 hover:bg-[#ECECEE]">
              <b className="font-semibold">{t.name}</b>
              <span className="text-[13px] text-sub">{t.desc}</span>
              <span className="font-mono text-xs text-muted mt-2">{t.ms.reduce((s, m) => s + m[1].length, 0)} buổi</span>
            </button>
          ))}
        </div>
      </section>

      {creating && <NewGoal initial={creating} onClose={() => setCreating(null)} onCreated={setOpenId} />}
    </>
  );
}

function NewGoal({ initial, onClose, onCreated }: { initial: string; onClose: () => void; onCreated: (id: string) => void }) {
  const { run } = useStore();
  const [key, setKey] = useState(initial);
  const [days, setDays] = useState([0, 2, 4]);
  const [start, setStart] = useState(iso(addDays(today0(), 1)));
  const [minutes, setMinutes] = useState(45);
  const { repo, toast } = useStore();
  const isAi = key === 'ai';
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [weeks, setWeeks] = useState(8);
  const [busy, setBusy] = useState(false);
  const t = TEMPLATES.find(x => x.key === key);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!days.length || busy) return;
    let tpl = t;
    if (isAi) {
      if (!goal.trim()) return;
      setBusy(true);
      try { tpl = await generateGoal({ goal: goal.trim(), level: level.trim(), weeks, sessionsPerWeek: days.length }, repo.mode === 'cloud'); }
      catch (err) { toast((err as Error).message); setBusy(false); return; }
      setBusy(false);
    }
    const id = await run(r => r.createGoal(buildGoal(tpl!, fromIsoDate(start), [...days].sort(), minutes)), 'Đã tạo lộ trình');
    if (id) { onCreated(id); onClose(); }
  };
  return (
    <Modal title="Lộ trình mới" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Mẫu" hint={isAi ? 'AI tạo lộ trình theo mục tiêu và trình độ của bạn' : t?.desc}>
          <Select value={key} onChange={e => setKey(e.target.value)}>
            <option value="ai">Tạo bằng AI theo mục tiêu của tôi</option>
            {TEMPLATES.map(x => <option key={x.key} value={x.key}>{x.name}</option>)}
          </Select>
        </Field>
        {isAi && (
          <>
            <Field label="Mục tiêu"><Input required value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ví dụ: Thi TOEIC 750 trước tháng 3" /></Field>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <Field label="Trình độ hiện tại"><Input value={level} onChange={e => setLevel(e.target.value)} placeholder="Ví dụ: đang 550 điểm" /></Field>
              <Field label="Số tuần"><Input type="number" min={1} max={24} value={weeks} onChange={e => setWeeks(Math.min(24, Math.max(1, Number(e.target.value) || 8)))} /></Field>
            </div>
          </>
        )}
        <div className="flex flex-col gap-2 text-[13px] font-medium">
          <span>Học vào</span>
          <div className="flex gap-1.5">
            {WD.map((d, i) => {
              const on = days.includes(i);
              return <button type="button" key={d} aria-pressed={on} onClick={() => setDays(on ? days.filter(x => x !== i) : [...days, i])}
                className={cx('w-11 h-11 rounded-xl text-sm font-semibold border', on ? 'bg-ink text-white border-ink' : 'border-line')}>{d}</button>;
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bắt đầu"><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></Field>
          <Field label="Phút mỗi buổi"><Input type="number" min={15} step={15} value={minutes} onChange={e => setMinutes(Number(e.target.value) || 30)} /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Huỷ</Button><Button variant="primary" disabled={!days.length || busy}>{busy ? 'AI đang tạo…' : 'Tạo'}</Button></div>
      </form>
    </Modal>
  );
}
