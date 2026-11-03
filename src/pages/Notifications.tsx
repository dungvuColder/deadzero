import { useMemo } from 'react';
import { AlertTriangle, BookOpen, CalendarDays, Check, Clock, Info, Sun, User } from 'lucide-react';
import { useStore } from '../data/store';
import { ranked, round1, weekLoads } from '../lib/priority';
import { diffDays, fD, fT, today0 } from '../lib/date';
import { Button, PageHeader, cx } from '../components/ui';

const ICON = { cal: CalendarDays, user: User, review: Check, cls: BookOpen, info: Info, clock: Clock, start: Sun, warn: AlertTriangle };

export default function Notifications() {
  const { data, run } = useStore();
  const t0 = today0();
  const list = useMemo(() => {
    const auto: { id: string; icon: keyof typeof ICON; text: string; at: string; read: boolean }[] = [];
    const morning = new Date(t0); morning.setHours(7);
    for (const x of ranked(data)) {
      const n = diffDays(x.task.dueAt, t0);
      if (n >= 0 && n <= 1) auto.push({ id: 'd' + x.task.id, icon: 'clock', text: `“${x.task.title}” hết hạn ${n ? 'ngày mai' : 'hôm nay'} lúc ${fT(x.task.dueAt)}`, at: morning.toISOString(), read: true });
      else if (diffDays(x.start, t0) === 0) auto.push({ id: 's' + x.task.id, icon: 'start', text: `Hôm nay nên bắt đầu “${x.task.title}” (${round1(x.need)} giờ)`, at: morning.toISOString(), read: true });
    }
    const w = weekLoads(data, 2).find(x => x.pct > 1);
    if (w) auto.push({ id: 'w', icon: 'warn', text: `Tuần ${fD(w.start)} quá tải ${Math.round(w.pct * 100)}%`, at: morning.toISOString(), read: true });
    return [...auto, ...data.notifs].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [data, t0]);
  const unread = data.notifs.filter(n => !n.read).length;

  return (
    <>
      <PageHeader eyebrow={unread ? `${unread} chưa đọc` : 'Đã đọc hết'} title="Thông báo">
        {unread > 0 && <Button onClick={() => run(r => r.markNotifsRead())}>Đánh dấu đã đọc</Button>}
      </PageHeader>
      <ul className="flex flex-col">
        {list.map(n => {
          const Icon = ICON[n.icon as keyof typeof ICON] ?? Info;
          return (
            <li key={n.id} className="flex items-start gap-3.5 py-3.5 border-b border-[#F0F0F1] last:border-0">
              <span className={cx('w-9 h-9 rounded-xl grid place-items-center shrink-0', n.icon === 'warn' ? 'bg-urgent-soft text-urgent-ink' : 'bg-soft')}><Icon size={17} /></span>
              <div className="flex-1 min-w-0"><p className={cx('text-sm', !n.read && 'font-semibold')}>{n.text}</p><span className="font-mono text-xs text-muted">{fD(n.at)} · {fT(n.at)}</span></div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-urgent mt-2" />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
