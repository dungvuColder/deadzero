import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useStore } from '../data/store';
import { WD, addDays, diffDays, dow, fShort, iso, mondayOf, pad, periodEnd, periodStart, today0, weekNo } from '../lib/date';
import { buildPlan, fmtH } from '../lib/planner';
import { downloadIcs } from '../lib/exporters';
import { Button, PageHeader, cx } from '../components/ui';

const H0 = 7, H1 = 21, PX = 44;
export const CLASS_COLORS = ['#0A0A0A', '#2563EB', '#C2410C', '#7C3AED', '#0F766E', '#BE185D', '#0E7490'];

export default function Calendar() {
  const { data, toast } = useStore();
  const [w, setW] = useState(0);
  const plan = useMemo(() => buildPlan(data, 42), [data]);
  const t0 = today0();
  const start = addDays(mondayOf(t0), w * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const inSemester = (d: Date) => { const n = weekNo(d, data.me.semesterStart); return n >= 1 && n <= data.me.semesterWeeks; };

  return (
    <>
      <PageHeader eyebrow={`Tuần ${weekNo(start, data.me.semesterStart)} · ${fShort(days[0])} – ${fShort(days[6])}`} title="Lịch">
        <Button aria-label="Tuần trước" onClick={() => setW(w - 1)}><ChevronLeft size={16} /></Button>
        <Button onClick={() => setW(0)}>Tuần này</Button>
        <Button aria-label="Tuần sau" onClick={() => setW(w + 1)}><ChevronRight size={16} /></Button>
        <Button onClick={() => { downloadIcs(data); toast('Đã tải deadzero.ics, mở bằng Google Calendar để nhập'); }}><Download size={16} />Xuất lịch</Button>
      </PageHeader>

      <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: '48px repeat(7, minmax(0, 1fr))' }}>
          <div />
          {days.map(d => (
            <div key={d.toISOString()} className={cx('pb-3 text-center text-[13px]', diffDays(d, t0) === 0 ? 'text-ink font-semibold' : 'text-muted')}>
              {WD[dow(d)]}<span className={cx('block text-xl font-semibold mt-0.5', diffDays(d, t0) === 0 && 'w-9 h-9 mx-auto rounded-full bg-ink text-white grid place-items-center text-base')}>{d.getDate()}</span>
            </div>
          ))}

          <div className="text-[11px] text-muted pt-2 pr-2 text-right border-t border-line">Hạn</div>
          {days.map(d => {
            const due = data.tasks.filter(t => t.assignees.includes(data.me.id) && t.status !== 'done' && diffDays(t.dueAt, d) === 0);
            const exams = data.classes.filter(c => c.exam && diffDays(c.exam.at, d) === 0);
            const goals = data.goals.flatMap(g => g.items.filter(i => diffDays(i.day, d) === 0));
            return (
              <div key={d.toISOString()} className="border-t border-l border-line p-1.5 flex flex-col gap-1 min-h-[44px]">
                {exams.map(c => <span key={c.id} className="text-[11px] font-semibold rounded-md px-1.5 py-0.5 bg-urgent text-white truncate">Thi {c.name}</span>)}
                {due.map(t => <span key={t.id} title={t.title} className="text-[11px] font-medium rounded-md px-1.5 py-0.5 bg-soft truncate">{t.title}</span>)}
                {goals.map(i => <span key={i.id} title={i.title} className={cx('text-[11px] rounded-md px-1.5 py-0.5 border border-dashed border-[#D4D4D8] truncate', i.done && 'line-through text-muted')}>{i.title}</span>)}
              </div>
            );
          })}

          <div className="text-[11px] text-muted pt-2 pr-2 text-right border-t border-line">Nên làm</div>
          {days.map(d => {
            const slots = plan.days.get(iso(d)) ?? [];
            return (
              <div key={d.toISOString()} className="border-t border-l border-line p-1.5 flex flex-col gap-1 min-h-[44px]">
                {slots.map(s => {
                  const t = data.tasks.find(x => x.id === s.taskId);
                  return t ? <span key={s.taskId} title={`${t.title} · ${fmtH(s.h)}`} className="flex justify-between gap-1 text-[11px] rounded-md px-1.5 py-0.5 border border-ink/80"><span className="truncate">{t.title}</span><b className="font-mono font-medium shrink-0">{fmtH(s.h)}</b></span> : null;
                })}
              </div>
            );
          })}

          <div className="border-t border-line">
            {Array.from({ length: H1 - H0 }, (_, i) => <div key={i} style={{ height: PX }} className="text-[11px] text-muted text-right pr-2 -translate-y-1.5">{pad(H0 + i)}:00</div>)}
          </div>
          {days.map(d => {
            const isT = diffDays(d, t0) === 0;
            return (
              <div key={d.toISOString()} className={cx('relative border-t border-l border-line', isT && 'bg-[#FAFAFA]')}>
                {Array.from({ length: H1 - H0 }, (_, i) => <div key={i} style={{ height: PX }} className="border-b border-[#F4F4F5]" />)}
                {inSemester(d) && data.classes.flatMap(c => c.sessions.filter(s => s.wd === dow(d)).map(s => (
                  <div key={s.id} className="absolute left-1 right-1 rounded-lg px-2 py-1.5 overflow-hidden bg-white border border-line"
                    style={{ top: (6 + s.from - H0) * PX + 2, height: (s.to - s.from + 1) * PX - 6, borderLeft: `3px solid ${CLASS_COLORS[c.color % CLASS_COLORS.length]}` }}>
                    <b className="block text-xs font-semibold leading-tight">{c.name}</b>
                    <span className="text-[11px] text-muted">{periodStart(s.from)}–{periodEnd(s.to)} · {s.room}</span>
                  </div>
                )))}
                {isT && nowH >= H0 && nowH <= H1 && <div className="absolute inset-x-0 h-0.5 bg-urgent z-10" style={{ top: (nowH - H0) * PX }} />}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
