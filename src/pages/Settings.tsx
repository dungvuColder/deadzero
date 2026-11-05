import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useStore } from '../data/store';
import { downloadIcs } from '../lib/exporters';
import { WD } from '../lib/date';
import { Button, PageHeader } from '../components/ui';

export default function Settings() {
  const { data, run, repo, signOut, toast } = useStore();
  const [hours, setHours] = useState(data.me.hours);
  const total = hours.reduce((a, b) => a + b, 0);
  const changed = hours.some((h, i) => h !== data.me.hours[i]);
  const [name, setName] = useState(data.me.name);

  return (
    <>
      <PageHeader eyebrow={repo.mode === 'demo' ? 'Bản demo' : data.me.name} title="Cài đặt" />

      {repo.mode === 'cloud' && (
        <section className="flex flex-col gap-3 max-w-xl">
          <h2 className="text-[15px] font-semibold">Tên hiển thị</h2>
          <form onSubmit={e => { e.preventDefault(); if (name.trim()) run(r => r.setName(name.trim()), 'Đã đổi tên'); }} className="flex gap-2">
            <input value={name} onChange={e => setName(e.target.value)} aria-label="Tên hiển thị" className="h-11 px-3 rounded-xl border border-line flex-1 outline-none focus:border-ink" />
            <Button variant="primary" disabled={!name.trim() || name.trim() === data.me.name}>Lưu</Button>
          </form>
          <p className="text-[13px] text-muted">Bạn cùng nhóm và cùng lớp sẽ thấy tên này.</p>
        </section>
      )}

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

      <section className="flex flex-col gap-3 max-w-xl">
        <h2 className="text-[15px] font-semibold">Nhắc deadline qua email</h2>
        <label className="flex items-center justify-between gap-4 rounded-2xl bg-soft px-4 py-3.5 cursor-pointer">
          <span className="flex flex-col"><span className="font-medium">Tóm tắt buổi sáng</span><span className="text-[13px] text-muted">06:30 mỗi ngày, khi có việc quá hạn hoặc hết hạn trong 3 ngày tới</span></span>
          <input type="checkbox" className="w-5 h-5 accent-ink" checked={data.me.emailDigest ?? true} disabled={repo.mode === 'demo'}
            onChange={e => run(r => r.setEmailDigest(e.target.checked), e.target.checked ? 'Đã bật nhắc qua email' : 'Đã tắt nhắc qua email')} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => run(r => r.sendTestDigest()).then(em => { if (em) toast(`Đã gửi thử tới ${em}`); })}>Gửi thử cho tôi</Button>
          {repo.mode === 'demo' && <span className="text-[13px] text-muted">Cần đăng nhập để nhận email.</span>}
        </div>
      </section>

      <section className="flex flex-col gap-3 max-w-xl">
        <h2 className="text-[15px] font-semibold">Đồng bộ</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => { downloadIcs(data); toast('Đã tải deadzero.ics'); }}><Download size={16} />Xuất sang Google Calendar</Button>
          <span className="text-[13px] text-muted">Google Calendar › Cài đặt › Nhập › chọn file .ics</span>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link to="/welcome"><Button variant="ghost">Trang giới thiệu</Button></Link>
        {repo.reset && <Button onClick={() => run(r => r.reset!(), 'Đã khôi phục dữ liệu mẫu')}>Khôi phục dữ liệu mẫu</Button>}
        <Button variant="ghost" onClick={signOut}>{repo.mode === 'demo' ? 'Thoát bản demo' : 'Đăng xuất'}</Button>
      </section>
    </>
  );
}
