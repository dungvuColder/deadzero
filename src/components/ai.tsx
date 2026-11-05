import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useStore } from '../data/store';
import { breakdownTask, type AiBreakdown, type AiStep } from '../lib/ai';
import { fmtH } from '../lib/planner';
import { Button, cx } from './ui';

/** Ô "Chia nhỏ bằng AI": dán đề bài → các bước + số giờ → áp dụng vào nhiệm vụ */
export function AiBreakdownPanel({ title, course, due, onApply }: {
  title: string; course?: string; due?: string; onApply: (steps: AiStep[], total: number) => void;
}) {
  const { repo } = useStore();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<AiBreakdown | null>(null);
  const [off, setOff] = useState<Set<number>>(new Set());

  const run = async () => {
    if (!title.trim() && !details.trim()) { setErr('Nhập tên việc hoặc dán đề bài trước'); return; }
    setErr(''); setBusy(true); setRes(null); setOff(new Set());
    try { setRes(await breakdownTask({ title, details, course, due }, repo.mode === 'cloud')); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const chosen = res ? res.steps.filter((_, i) => !off.has(i)) : [];
  const total = chosen.reduce((s, x) => s + x.hours, 0);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start inline-flex items-center gap-2 h-9 px-3 rounded-[10px] text-[13px] font-semibold border border-line hover:bg-soft">
        <Sparkles size={15} className="text-urgent" />Chia nhỏ bằng AI
      </button>
    );
  }
  return (
    <div className="rounded-2xl border border-line p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles size={15} className="text-urgent" />Chia nhỏ bằng AI</div>
      <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4} aria-label="Đề bài"
        placeholder="Dán đề bài hoặc yêu cầu của giảng viên (không bắt buộc)…"
        className="w-full rounded-xl border border-line p-3 text-sm outline-none focus:border-ink resize-y" />
      {!res && <Button type="button" size="sm" variant="primary" onClick={run} disabled={busy} className="self-start">{busy ? 'Đang phân tích…' : 'Phân tích'}</Button>}
      {err && <p className="text-sm text-urgent-ink">{err}</p>}
      {res && (
        <>
          <ul className="flex flex-col">
            {res.steps.map((s, i) => (
              <li key={i}>
                <label className="flex items-center gap-3 min-h-[36px] text-sm cursor-pointer">
                  <input type="checkbox" checked={!off.has(i)} onChange={() => { const n = new Set(off); if (n.has(i)) n.delete(i); else n.add(i); setOff(n); }} className="w-4 h-4 accent-ink" />
                  <span className={cx('flex-1', off.has(i) && 'text-muted line-through')}>{s.title}</span>
                  <span className="font-mono text-xs text-sub">{fmtH(s.hours)}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-[13px] border-t border-line pt-2"><span className="text-muted">Tổng ước lượng</span><b className="font-mono">{fmtH(total)}</b></div>
          {res.tip && <p className="text-[13px] text-sub bg-soft rounded-xl px-3 py-2">{res.tip}</p>}
          {res.sample && <p className="text-xs text-muted">Bản demo dùng gợi ý mẫu. Khi đăng nhập, kết quả do AI tạo theo đề bài.</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="primary" disabled={!chosen.length} onClick={() => { onApply(chosen, total); setOpen(false); setRes(null); }}>Dùng {chosen.length} bước</Button>
            <Button type="button" size="sm" onClick={run} disabled={busy}>{busy ? 'Đang phân tích…' : 'Thử lại'}</Button>
          </div>
        </>
      )}
    </div>
  );
}

export const stepsToSubtasks = (steps: AiStep[]) => steps.map(s => ({ t: `${s.title} (${fmtH(s.hours)})`, done: false }));
