import { Link } from 'react-router-dom';
import { useStore } from '../data/store';
import { round1, weekLoads } from '../lib/priority';
import { WD, addDays, diffDays, fD, fShort, today0, weekNo } from '../lib/date';
import { PageHeader, cx } from '../components/ui';

function cellCls(h: number, cap: number) {
  if (h < 0.05) return 'bg-soft text-transparent';
  const r = cap ? h / cap : 2;
  if (r > 1) return 'bg-urgent text-white';
  if (r > 0.75) return 'bg-[#FFB088] text-ink';
  if (r > 0.4) return 'bg-[#D4D4D8] text-ink';
  return 'bg-[#E9E9EC] text-sub';
}

export default function Load() {
  const { data } = useStore();
  const t0 = today0();
  const W = weekLoads(data, 8);
  const over = W.filter(w => w.pct > 1);
  const title = (id: string) => data.tasks.find(t => t.id === id);

  return (
    <>
      <PageHeader eyebrow="8 tuần tới" title="Tải công việc" />

      {over.length > 0 && (
        <section className="rounded-[20px] bg-urgent-soft p-6 flex flex-col gap-4">
          {over.map(w => (
            <div key={w.start.toISOString()} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <b className="text-lg">Tuần {weekNo(w.start, data.me.semesterStart)} quá tải</b>
                <span className="font-mono text-urgent-ink">{round1(w.need)} / {w.cap} giờ</span>
              </div>
              <ul className="flex flex-col gap-1 text-sm">
                {[...w.tasks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, h]) => {
                  const t = title(id); if (!t) return null;
                  return <li key={id} className="flex justify-between gap-4"><span className="truncate">{t.title}</span><span className="font-mono text-sub shrink-0">{round1(h)}h · hạn {fD(t.dueAt)}</span></li>;
                })}
              </ul>
            </div>
          ))}
          <Link to="/settings" className="self-start text-sm font-semibold underline underline-offset-4">Đổi giờ tự học mỗi ngày</Link>
        </section>
      )}

      <section className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
        <div className="grid gap-1.5 min-w-[700px] items-center" style={{ gridTemplateColumns: '110px repeat(7, minmax(0, 1fr)) 140px' }}>
          <div />
          {WD.map(d => <div key={d} className="text-center text-xs text-muted pb-1">{d}</div>)}
          <div className="text-xs text-muted pb-1 pl-2">Cần / có</div>
          {W.map(w => (
            <div key={w.start.toISOString()} className="contents">
              <div className="text-[13px]"><b className="block font-semibold">Tuần {weekNo(w.start, data.me.semesterStart)}</b><span className="text-muted text-xs">{fShort(w.start)} – {fShort(addDays(w.start, 6))}</span></div>
              {w.days.map(d => (
                <div key={d.d.toISOString()} title={`${fD(d.d)}: ${round1(d.h)}/${d.cap} giờ`}
                  className={cx('h-10 rounded-lg grid place-items-center font-mono text-xs', d.past ? 'bg-[#FAFAFA] text-transparent' : cellCls(d.h, d.cap), diffDays(d.d, t0) === 0 && 'ring-2 ring-ink ring-offset-1')}>
                  {!d.past && d.h >= 0.05 ? round1(d.h) : ''}
                </div>
              ))}
              <div className="pl-2 flex flex-col gap-1">
                <div className="flex justify-between text-xs"><span className="font-mono text-sub">{round1(w.need)}/{w.cap}h</span><b className={cx('font-mono', w.pct > 1 ? 'text-urgent-ink' : 'text-muted')}>{Math.round(w.pct * 100)}%</b></div>
                <div className="h-1.5 rounded-full bg-soft overflow-hidden"><div className={cx('h-full rounded-full', w.pct > 1 ? 'bg-urgent' : 'bg-ink')} style={{ width: `${Math.min(100, w.pct * 100)}%` }} /></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-4 text-xs text-muted items-center">
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-[#E9E9EC]" />Nhẹ</span>
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-[#D4D4D8]" />Vừa</span>
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-[#FFB088]" />Sát giới hạn</span>
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-urgent" />Quá tải</span>
      </div>
    </>
  );
}
