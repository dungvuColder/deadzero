import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useStore } from '../data/store';
import { round1 } from '../lib/priority';
import { streak } from '../lib/templates';
import { addDays, diffDays, fShort, mondayOf, today0 } from '../lib/date';
import { PageHeader, cx } from '../components/ui';
import { CLASS_COLORS } from './Calendar';

const MONTH = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];

export default function Stats() {
  const { data } = useStore();
  const t0 = today0();
  const s = useMemo(() => {
    const mine = data.tasks.filter(t => t.assignees.includes(data.me.id));
    const done = mine.filter(t => t.status === 'done' && t.doneAt);
    const share = (t: (typeof mine)[number]) => t.est / Math.max(t.assignees.length, 1);
    const onTime = (t: (typeof mine)[number]) => !!t.doneAt && t.doneAt <= t.dueAt;

    // Giờ hoàn thành theo tuần, 8 tuần gần nhất
    const w0 = mondayOf(t0);
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = addDays(w0, (i - 7) * 7);
      const items = done.filter(t => { const d = diffDays(t.doneAt!, start); return d >= 0 && d < 7; });
      return { start, h: items.reduce((x, t) => x + share(t), 0), n: items.length };
    });
    // Tỷ lệ đúng hạn theo tháng, 4 tháng gần nhất
    const months = Array.from({ length: 4 }, (_, i) => {
      const m = new Date(t0.getFullYear(), t0.getMonth() - 3 + i, 1);
      const items = done.filter(t => { const d = new Date(t.doneAt!); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); });
      return { label: MONTH[m.getMonth()], n: items.length, pct: items.length ? Math.round(items.filter(onTime).length / items.length * 100) : null };
    });
    // Theo môn
    const byClass = data.classes.map(c => {
      const ts = mine.filter(t => t.classId === c.id);
      const d = ts.filter(t => t.status === 'done');
      return {
        c, doneH: d.reduce((x, t) => x + share(t), 0), openH: ts.filter(t => t.status !== 'done').reduce((x, t) => x + share(t) * (1 - t.progress / 100), 0),
        n: d.length, pct: d.length ? Math.round(d.filter(onTime).length / d.length * 100) : null,
      };
    }).filter(x => x.doneH + x.openH > 0).sort((a, b) => b.doneH + b.openH - a.doneH - a.openH);

    const last4 = weeks.slice(-4).reduce((x, w) => x + w.h, 0);
    const prev4 = weeks.slice(0, 4).reduce((x, w) => x + w.h, 0);
    const late = mine.filter(t => t.status !== 'done' && new Date(t.dueAt) < new Date()).length;
    return {
      weeks, months, byClass, last4, delta: prev4 ? Math.round((last4 - prev4) / prev4 * 100) : null,
      rate: done.length ? Math.round(done.filter(onTime).length / done.length * 100) : null, doneN: done.length, late,
      streak: Math.max(0, ...data.goals.map(streak)),
    };
  }, [data, t0]);

  const maxW = Math.max(...s.weeks.map(w => w.h), 1);
  const maxC = Math.max(...s.byClass.map(x => x.doneH + x.openH), 1);

  return (
    <>
      <PageHeader eyebrow="8 tuần gần nhất" title="Thống kê" />

      <section className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="rounded-[20px] bg-soft p-5 flex flex-col gap-1">
          <span className="text-[13px] text-muted">Giờ hoàn thành · 4 tuần</span>
          <span className="font-mono text-[36px] leading-none tracking-[-0.03em] mt-1">{round1(s.last4)}<span className="font-sans text-sm text-muted ml-1">giờ</span></span>
          {s.delta !== null && <span className={cx('text-xs font-medium', s.delta >= 0 ? 'text-ink' : 'text-urgent-ink')}>{s.delta >= 0 ? '▲' : '▼'} {Math.abs(s.delta)}% so với 4 tuần trước</span>}
        </div>
        <div className="rounded-[20px] bg-soft p-5 flex flex-col gap-1">
          <span className="text-[13px] text-muted">Nộp đúng hạn</span>
          <span className="font-mono text-[36px] leading-none tracking-[-0.03em] mt-1">{s.rate ?? '—'}<span className="font-sans text-sm text-muted ml-1">%</span></span>
          <span className="text-xs text-muted">{s.doneN} việc đã xong</span>
        </div>
        <div className={cx('rounded-[20px] p-5 flex flex-col gap-1', s.late ? 'bg-urgent-soft' : 'bg-soft')}>
          <span className="text-[13px] text-muted">Đang quá hạn</span>
          <span className={cx('font-mono text-[36px] leading-none tracking-[-0.03em] mt-1', s.late > 0 && 'text-urgent-ink')}>{s.late}</span>
          <span className="text-xs text-muted">{s.late ? 'Cần xử lý ngay' : 'Không có'}</span>
        </div>
        <div className="rounded-[20px] bg-soft p-5 flex flex-col gap-1">
          <span className="text-[13px] text-muted">Chuỗi tự học</span>
          <span className="font-mono text-[36px] leading-none tracking-[-0.03em] mt-1 flex items-center gap-2">{s.streak}<Flame size={24} className="text-urgent-ink" /></span>
          <span className="text-xs text-muted">buổi liên tiếp</span>
        </div>
      </section>

      <div className="flex flex-wrap gap-8 items-start">
        <section className="flex-[3_1_420px] min-w-0 flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold">Giờ hoàn thành mỗi tuần</h2>
          <div className="grid grid-cols-8 gap-2 items-end h-44" role="img" aria-label="Biểu đồ giờ hoàn thành 8 tuần">
            {s.weeks.map((w, i) => (
              <div key={i} className="flex flex-col items-center justify-end gap-1.5 h-full">
                <span className="font-mono text-[11px] text-sub">{w.h ? round1(w.h) : ''}</span>
                <div title={`${round1(w.h)} giờ · ${w.n} việc`} className={cx('w-full rounded-md', i === 7 ? 'bg-ink' : 'bg-low')} style={{ height: `${Math.max(3, w.h / maxW * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-2 text-center text-[11px] text-muted">{s.weeks.map((w, i) => <span key={i}>{i === 7 ? 'Tuần này' : fShort(w.start)}</span>)}</div>
        </section>

        <section className="flex-[2_1_280px] min-w-0 flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold">Đúng hạn theo tháng</h2>
          <div className="flex flex-col gap-3">
            {s.months.map(m => (
              <div key={m.label} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-muted">{m.label}</span>
                <div className="flex-1 h-2 rounded-full bg-soft overflow-hidden"><div className={cx('h-full rounded-full', m.pct !== null && m.pct < 70 ? 'bg-urgent' : 'bg-ink')} style={{ width: `${m.pct ?? 0}%` }} /></div>
                <span className="w-20 text-right font-mono text-xs text-sub">{m.pct === null ? '—' : `${m.pct}% · ${m.n}`}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold">Theo môn</h2>
        <div className="flex flex-col">
          {s.byClass.map(x => (
            <div key={x.c.id} className="grid items-center gap-3 py-3 border-b border-[#F0F0F1] last:border-0 text-sm" style={{ gridTemplateColumns: 'minmax(120px, 220px) 1fr 120px' }}>
              <span className="flex items-center gap-2 font-medium truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: CLASS_COLORS[x.c.color % CLASS_COLORS.length] }} />{x.c.name}</span>
              <div className="flex h-2 rounded-full bg-soft overflow-hidden" title={`Đã làm ${round1(x.doneH)} giờ · còn ${round1(x.openH)} giờ`}>
                <div className="h-full bg-ink" style={{ width: `${x.doneH / maxC * 100}%` }} />
                <div className="h-full bg-[#D4D4D8]" style={{ width: `${x.openH / maxC * 100}%` }} />
              </div>
              <span className="font-mono text-xs text-sub text-right">{round1(x.doneH)}h / còn {round1(x.openH)}h</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-xs text-muted"><span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-ink" />Đã làm</span><span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-[#D4D4D8]" />Còn lại</span></div>
      </section>
    </>
  );
}
