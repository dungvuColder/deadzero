import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, Clock3, Flame, KeyRound, Plus, Upload } from 'lucide-react';
import type { Task } from '../lib/types';
import { useStore } from '../data/store';
import { analyse, ranked, weekLoads } from '../lib/priority';
import { buildPlan, fmtH } from '../lib/planner';
import { streak } from '../lib/templates';
import { MONTHS, WD, WDL, countdown, diffDays, dow, fT, iso, periodStart, today0, weekNo } from '../lib/date';
import { AddTaskModal, TaskModal, TaskRow, startText } from '../components/tasks';
import { Button, SectionTitle, cx } from '../components/ui';
import { JoinClassModal } from './Classes';

export default function Today() {
  const { data, run } = useStore();
  const [adding, setAdding] = useState(false);
  const [joining, setJoining] = useState(false);
  const [open, setOpen] = useState<Task | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 60_000); return () => clearInterval(i); }, []);

  const t0 = today0();
  const A = analyse(data);
  const R = ranked(data);
  const plan = useMemo(() => buildPlan(data), [data]);
  const todayPlan = plan.days.get(iso(t0)) ?? [];
  const plannedIds = new Set(todayPlan.map(s => s.taskId));
  const top = R[0];
  // Hôm nay = các phiên được xếp cho hôm nay + việc hết hạn trong 1 ngày
  const extra = R.filter(x => !plannedIds.has(x.task.id) && diffDays(x.task.dueAt, t0) <= 1);
  const plannedH = todayPlan.reduce((s, x) => s + x.h, 0);

  const week = weekLoads(data, 1)[0];
  const pct = Math.round(week.pct * 100);
  const maxDay = Math.max(...week.days.map(d => Math.max(d.h, d.cap)), 1);
  const sessions = data.classes.flatMap(c => c.sessions.filter(s => s.wd === dow(t0)).map(s => ({ c, s }))).sort((a, b) => a.s.from - b.s.from);
  const goalItems = data.goals.flatMap(g => g.items.filter(i => diffDays(i.day, t0) === 0).map(i => ({ g, i })));
  const bestStreak = Math.max(0, ...data.goals.map(streak));
  const cd = top ? countdown(top.task.dueAt) : null;
  const isEmpty = !data.classes.length && !data.tasks.length;

  // Cảnh báo quá tải: tuần vượt quỹ giờ, hoặc có việc không đủ giờ trước hạn
  const overReasons = [
    pct > 100 && `Đã xếp ${pct}% quỹ giờ tuần`,
    plan.short.size > 0 && `${plan.short.size} việc không đủ giờ trước hạn`,
  ].filter(Boolean).join(' · ');

  const toggleGoal = (gid: string, iid: string, done: boolean) => {
    const g = data.goals.find(x => x.id === gid)!;
    run(r => r.updateGoal(gid, { items: g.items.map(i => (i.id === iid ? { ...i, done } : i)) }), done ? 'Xong buổi tự học' : undefined);
  };

  return (
    <>
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">Tuần {weekNo(t0, data.me.semesterStart)} / {data.me.semesterWeeks}</span>
          <h1 className="text-[28px] md:text-[30px] font-semibold tracking-[-0.02em]">{WDL[dow(t0)]}, {t0.getDate()} {MONTHS[t0.getMonth()]}</h1>
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}><Plus size={16} strokeWidth={2.4} />Thêm việc</Button>
      </header>

      {isEmpty ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold">Bắt đầu trong 1 phút</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <button onClick={() => setJoining(true)} className="text-left rounded-[20px] bg-soft p-5 flex flex-col gap-3 hover:bg-[#ECECEE]">
              <KeyRound size={20} /><b className="font-semibold">Nhập mã lớp</b><span className="text-[13px] text-sub">Bạn cùng lớp đã tạo? Nhập mã là có lịch học và bài tập.</span>
            </button>
            <Link to="/import" className="rounded-[20px] bg-soft p-5 flex flex-col gap-3 hover:bg-[#ECECEE]">
              <Upload size={20} /><b className="font-semibold">Dán thời khoá biểu</b><span className="text-[13px] text-sub">Copy bảng TKB trên cổng đào tạo rồi dán vào.</span>
            </Link>
            <Link to="/settings" className="rounded-[20px] bg-soft p-5 flex flex-col gap-3 hover:bg-[#ECECEE]">
              <Clock3 size={20} /><b className="font-semibold">Đặt giờ tự học</b><span className="text-[13px] text-sub">Mỗi ngày bạn học được bao nhiêu giờ?</span>
            </Link>
          </div>
        </section>
      ) : top && cd ? (
        <section className="flex flex-wrap justify-between items-end gap-6 p-6 md:p-8 rounded-[20px] bg-soft">
          <div className="flex flex-col gap-2.5 min-w-0">
            <span className="flex items-center gap-2 text-[13px] font-medium text-[#3F3F46]"><span className={cx('w-2 h-2 rounded-full', top.level === 'late' || top.level === 'high' ? 'bg-urgent' : 'bg-mid')} />Gấp nhất</span>
            <button onClick={() => setOpen(top.task)} className="text-left text-[22px] md:text-[26px] font-semibold tracking-[-0.015em] leading-tight hover:underline">{top.task.title}</button>
            <span className="text-sub">{WD[dow(new Date(top.task.dueAt))]} · {fT(top.task.dueAt)} · cần {Math.round(top.need * 10) / 10} giờ</span>
            <Button variant="urgent" className="self-start mt-2" onClick={() => setOpen(top.task)}>{startText(top.start)}</Button>
          </div>
          <div className="flex items-baseline gap-1.5 font-mono" aria-label={`Còn ${cd.days} ngày ${cd.hours} giờ`}>
            {cd.days > 0 && <><span className="text-[64px] md:text-[76px] leading-none tracking-[-0.04em]">{cd.days}</span><span className="font-sans text-[15px] text-muted mr-3.5">ngày</span></>}
            <span className="text-[64px] md:text-[76px] leading-none tracking-[-0.04em]">{cd.hours}</span><span className="font-sans text-[15px] text-muted">giờ</span>
          </div>
        </section>
      ) : (
        <section className="p-8 rounded-[20px] bg-soft text-sub">Không còn việc nào. Nghỉ ngơi thôi.</section>
      )}

      {!isEmpty && overReasons && (
        <Link to="/load" className="flex items-center gap-3 p-4 rounded-[14px] bg-urgent-soft">
          <AlertTriangle size={20} className="shrink-0 text-urgent-ink" />
          <span className="flex-1 min-w-0 text-sm">
            <b className="block font-semibold text-urgent-ink">Tuần này đang quá tải</b>
            <span className="block text-sub">{overReasons}</span>
          </span>
          <span className="text-[13px] font-medium text-urgent-ink whitespace-nowrap">Xem tải →</span>
        </Link>
      )}

      {!isEmpty && (
        <div className="flex flex-wrap gap-8 items-start">
          <section className="flex-[3_1_420px] min-w-0">
            <SectionTitle right={<span className="font-mono text-[13px] text-muted" title="Giờ đã xếp / giờ tự học hôm nay">{plannedH ? fmtH(plannedH) : '0h'} / {data.me.hours[dow(t0)]}h</span>}>Kế hoạch hôm nay</SectionTitle>
            <div>
              {todayPlan.map(s => { const t = data.tasks.find(x => x.id === s.taskId); return t ? <TaskRow key={t.id} t={t} a={A.get(t.id)} onOpen={setOpen} planned={s.h} /> : null; })}
              {extra.map(x => <TaskRow key={x.task.id} t={x.task} a={x} onOpen={setOpen} />)}
              {goalItems.map(({ g, i }) => (
                <label key={i.id} className="flex items-center gap-3.5 min-h-[52px] border-b border-[#F0F0F1] last:border-0 cursor-pointer">
                  <input type="checkbox" checked={i.done} onChange={e => toggleGoal(g.id, i.id, e.target.checked)} className="w-5 h-5 accent-ink" />
                  <span className={cx('flex-1 font-medium', i.done && 'line-through text-muted')}>{i.title}</span>
                  <span className="font-mono text-xs rounded-md bg-soft px-1.5 py-0.5">{g.minutes}p</span>
                  <span className="w-2 h-2 rounded-full bg-[#D4D4D8]" />
                </label>
              ))}
              {!todayPlan.length && !extra.length && !goalItems.length && <p className="text-muted text-sm py-4">Hôm nay trống.</p>}
            </div>
            <Link to="/calendar" className="inline-block mt-3 text-[13px] text-muted hover:text-ink">Kế hoạch cả tuần →</Link>
          </section>

          <aside className="flex-[2_1_280px] min-w-0 flex flex-col gap-7">
            <section className="flex flex-col gap-3">
              <SectionTitle right={<Link to="/load" className={cx('font-mono text-[13px]', pct > 100 ? 'text-urgent-ink' : 'text-muted')}>{pct}%</Link>}>Tuần này</SectionTitle>
              <div className="grid grid-cols-7 gap-2 items-end h-24">
                {week.days.map(d => {
                  const isT = diffDays(d.d, t0) === 0;
                  const over = !d.past && d.h > d.cap;
                  return <div key={d.d.toISOString()} title={`${Math.round(d.h * 10) / 10}/${d.cap} giờ`}
                    className={cx('rounded-md min-h-[6px]', d.past ? 'bg-[#E4E4E7]' : over ? 'bg-urgent' : isT ? 'bg-ink' : 'bg-low')}
                    style={{ height: `${Math.max(6, (d.past ? 0.3 : d.h / maxDay) * 100)}%` }} />;
                })}
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted">
                {WD.map((w, i) => <span key={w} className={cx(i === dow(t0) && 'text-ink font-semibold')}>{w}</span>)}
              </div>
            </section>

            <section className="flex flex-col gap-2.5">
              <SectionTitle>Lớp hôm nay</SectionTitle>
              {sessions.length ? sessions.map(({ c, s }) => (
                <Link to={`/classes/${c.id}`} key={s.id} className="flex items-center gap-3.5 px-4 py-3.5 border border-[#F0F0F1] rounded-[14px] hover:bg-soft">
                  <span className="font-mono text-[13px]">{periodStart(s.from)}</span>
                  <span className="flex-1 font-medium truncate">{c.name}</span>
                  <span className="text-muted text-[13px]">{s.room}</span>
                </Link>
              )) : <p className="text-muted text-sm flex items-center gap-2"><BookOpen size={15} />Không có buổi học.</p>}
            </section>

            {bestStreak > 0 && (
              <Link to="/goals" className="flex items-center gap-3 p-4 rounded-[14px] bg-urgent-soft">
                <Flame size={22} className="text-urgent-ink" />
                <span className="font-semibold">{bestStreak} buổi tự học liên tiếp</span>
              </Link>
            )}
          </aside>
        </div>
      )}

      {adding && <AddTaskModal onClose={() => setAdding(false)} />}
      {joining && <JoinClassModal onClose={() => setJoining(false)} />}
      {open && <TaskModal task={open} onClose={() => setOpen(null)} />}
    </>
  );
}
