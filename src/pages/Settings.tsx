import { useState } from 'react';
import { useStore } from '../data/store';
import { WD } from '../lib/date';
import { Button, PageHeader } from '../components/ui';

export default function Settings() {
  const { data, run, repo, signOut } = useStore();
  const [hours, setHours] = useState(data.me.hours);
  const total = hours.reduce((a, b) => a + b, 0);
  const changed = hours.some((h, i) => h !== data.me.hours[i]);

  return (
    <>
      <PageHeader eyebrow={repo.mode === 'demo' ? 'Bản demo' : data.me.name} title="Cài đặt" />

      <section className="flex flex-col gap-4 max-w-xl">
        <div className="flex justify-between items-baseline"><h2 className="text-[15px] font-semibold">Giờ tự học mỗi ngày</h2><span className="font-mono text-sm text-sub">{total} giờ/tuần</span></div>
        <div className="grid grid-cols-7 gap-2">
          {WD.map((d, i) => (
            <label key={d} className="flex flex-col items-center gap-1.5 text-xs font-medium text-muted">
              {d}
              <input type="number" min={0} max={12} step={0.5} value={hours[i]} aria-label={`Giờ tự học ${d}`}
                onChange={e => setHours(hours.map((h, j) => (j === i ? Math.max(0, Math.min(12, Number(e.target.value) || 0)) : h)))}
                className="w-full h-12 text-center rounded-xl border border-line font-mono text-base text-ink outline-none focus:border-ink" />
            </label>
          ))}
        </div>
        <p className="text-[13px] text-muted">Dùng để xếp ưu tiên, tính ngày nên bắt đầu và tải công việc.</p>
        <div><Button variant="primary" disabled={!changed} onClick={() => run(r => r.setHours(hours), 'Đã tính lại ưu tiên')}>Lưu</Button></div>
      </section>

      <section className="flex flex-col gap-3 max-w-xl">
        <h2 className="text-[15px] font-semibold">Mức ưu tiên</h2>
        <div className="rounded-2xl bg-soft p-4 font-mono text-[13px] leading-relaxed">
          r = giờ còn phải làm ÷ giờ tự học còn trống trước hạn
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[13px]">
          {[['bg-urgent', 'Nguy cơ trễ', 'r ≥ 1'], ['bg-high', 'Cao', '0,6–1'], ['bg-mid', 'Vừa', '0,3–0,6'], ['bg-low', 'Thấp', '< 0,3']].map(([c, l, v]) => (
            <div key={l} className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${c}`} /><span className="font-medium">{l}</span><span className="text-muted font-mono text-xs">{v}</span></div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {repo.reset && <Button onClick={() => run(r => r.reset!(), 'Đã khôi phục dữ liệu mẫu')}>Khôi phục dữ liệu mẫu</Button>}
        <Button variant="ghost" onClick={signOut}>{repo.mode === 'demo' ? 'Thoát bản demo' : 'Đăng xuất'}</Button>
      </section>
    </>
  );
}
