import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';

export const WELCOMED_KEY = 'deadzero-welcomed';

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[20px] bg-soft p-6 flex flex-col gap-5">
      <div className="h-[132px] rounded-2xl bg-white p-4 flex flex-col justify-center">{children}</div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="text-[13px] text-sub">{sub}</p>
      </div>
    </article>
  );
}

export default function Welcome() {
  const nav = useNavigate();
  const go = () => { try { localStorage.setItem(WELCOMED_KEY, '1'); } catch { /* bỏ qua */ } nav('/'); };
  return (
    <div className="min-h-screen bg-white">
      <header className="max-w-[1120px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-[9px] bg-ink text-white grid place-items-center font-bold">0</span><b className="font-semibold">DeadZero</b></div>
        <Button size="sm" variant="primary" onClick={go}>Mở app</Button>
      </header>

      <main className="max-w-[1120px] mx-auto px-4 md:px-8 pb-16 flex flex-col gap-16 md:gap-24">
        <section className="pt-10 md:pt-20 flex flex-wrap items-end justify-between gap-10">
          <div className="flex flex-col gap-6 max-w-xl">
            <h1 className="text-[44px] md:text-[64px] font-semibold tracking-[-0.035em] leading-[1.02]">Đưa deadline<br />về <span className="text-urgent">0</span>.</h1>
            <p className="text-[17px] text-sub max-w-md">Lịch học, bài tập, việc nhóm và tự học của sinh viên ở cùng một chỗ.</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={go}>Dùng thử ngay</Button>
              <a href="#features" className="inline-flex items-center h-11 px-4 rounded-xl text-sm font-semibold text-sub hover:bg-soft">Xem tính năng</a>
            </div>
          </div>
          <div aria-hidden="true" className="w-full max-w-[420px] rounded-[20px] bg-soft p-7 flex flex-col gap-4">
            <span className="flex items-center gap-2 text-[13px] font-medium text-[#3F3F46]"><span className="w-2 h-2 rounded-full bg-urgent" />Gấp nhất</span>
            <b className="text-[22px] font-semibold tracking-[-0.015em]">Ôn kiểm tra giữa kỳ</b>
            <div className="flex items-end justify-between">
              <span className="h-10 px-4 rounded-xl bg-urgent text-white text-sm font-semibold inline-flex items-center">Bắt đầu ngay</span>
              <span className="font-mono flex items-baseline gap-1"><span className="text-[56px] leading-none tracking-[-0.04em]">1</span><span className="font-sans text-sm text-muted mr-2">ngày</span><span className="text-[56px] leading-none tracking-[-0.04em]">9</span><span className="font-sans text-sm text-muted">giờ</span></span>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <Card title="Biết việc nào gấp nhất" sub="Xếp theo số giờ còn phải làm, không chỉ theo ngày hạn.">
            {[['Ôn giữa kỳ CSDL', 'bg-urgent', 'T5'], ['Lab 5 – REST API', 'bg-high', 'T6'], ['Bài tập SQL', 'bg-mid', 'Mai']].map(([t, c, d]) => (
              <div key={t} className="flex items-center gap-3 h-9 text-sm border-b border-[#F0F0F1] last:border-0"><span className="w-4 h-4 rounded border-[1.5px] border-[#C4C4C8]" /><span className="flex-1 truncate">{t}</span><span className="font-mono text-xs text-muted">{d}</span><span className={`w-2 h-2 rounded-full ${c}`} /></div>
            ))}
          </Card>
          <Card title="Một mã, cả lớp có lịch" sub="Một bạn nhập lịch, cả lớp nhập mã là xong.">
            <div className="h-14 rounded-xl border border-line grid place-items-center font-mono text-2xl tracking-[0.3em]">OOAD9X</div>
            <span className="text-xs text-muted text-center mt-2">38 bạn đang dùng</span>
          </Card>
          <Card title="Thấy trước tuần quá tải" sub="Cảnh báo sớm khi deadline dồn vào cùng một tuần.">
            <div className="grid grid-cols-7 gap-1.5 items-end h-20">
              {[30, 100, 100, 92, 70, 60, 45].map((h, i) => <div key={i} className={i === 2 || i === 3 ? 'bg-urgent rounded' : i === 1 ? 'bg-ink rounded' : 'bg-low rounded'} style={{ height: `${h}%` }} />)}
            </div>
          </Card>
          <Card title="Làm nhóm minh bạch" sub="Giao việc, duyệt bài, bảng đóng góp từng người.">
            {[['Linh', 100], ['Khánh', 83], ['Hà', 67], ['Tuấn', 50]].map(([n, w]) => (
              <div key={n} className="flex items-center gap-3 h-7 text-xs"><span className="w-12">{n}</span><div className="flex-1 h-1.5 rounded-full bg-soft"><div className="h-full rounded-full bg-ink" style={{ width: `${w}%` }} /></div></div>
            ))}
          </Card>
        </section>

        <section className="rounded-[20px] bg-ink text-white p-8 md:p-12 flex flex-wrap items-center justify-between gap-6">
          <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] leading-tight">Miễn phí cho sinh viên.</h2>
          <button onClick={go} className="h-11 px-5 rounded-xl bg-white text-ink text-sm font-semibold hover:bg-soft">Dùng thử ngay</button>
        </section>
      </main>

      <footer className="max-w-[1120px] mx-auto px-4 md:px-8 py-8 border-t border-line text-xs text-muted">DeadZero · Dự án học phần Kỹ năng khởi nghiệp · UET – ĐHQGHN</footer>
    </div>
  );
}
