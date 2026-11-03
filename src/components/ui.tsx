import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { X } from 'lucide-react';
import type { Level } from '../lib/types';
import { LEVEL_DOT, LEVEL_LABEL, round1 } from '../lib/priority';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'urgent' | 'ghost' | 'outline'; size?: 'md' | 'sm' };
export function Button({ variant = 'outline', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'md' ? 'h-11 px-4 text-sm' : 'h-9 px-3 text-[13px] rounded-[10px]',
        variant === 'primary' && 'bg-ink text-white hover:bg-[#27272A]',
        variant === 'urgent' && 'bg-urgent text-white hover:bg-[#F0410F]',
        variant === 'ghost' && 'text-sub hover:bg-soft',
        variant === 'outline' && 'border border-line bg-white hover:bg-soft',
        className,
      )}
    />
  );
}

export function LevelDot({ level, r }: { level: Level; r?: number }) {
  return <span title={`${LEVEL_LABEL[level]}${r !== undefined ? ` · r = ${round1(r)}` : ''}`} aria-label={LEVEL_LABEL[level]} className={cx('inline-block w-2 h-2 rounded-full shrink-0', LEVEL_DOT[level])} />;
}

const AV = ['#0A0A0A', '#52525B', '#A1A1AA', '#D4D4D8', '#E4E4E7'];
export function Avatar({ name, me, size = 24, i = 0 }: { name: string; me?: boolean; size?: number; i?: number }) {
  const bg = me ? AV[0] : AV[2 + (i % 3)];
  return (
    <span title={name} style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}
      className={cx('inline-flex items-center justify-center rounded-full font-semibold border-2 border-white shrink-0', me ? 'text-white' : 'text-ink')}>
      {(name || '?').trim()[0]?.toUpperCase()}
    </span>
  );
}
export function AvatarStack({ people, meId, size = 24 }: { people: { id: string; name: string }[]; meId: string; size?: number }) {
  return <span className="flex">{people.map((p, i) => <span key={p.id} className={i ? '-ml-2' : ''}><Avatar name={p.name} me={p.id === meId} size={size} i={i} /></span>)}</span>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap justify-between items-end gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        {eyebrow && <span className="text-[13px] text-muted">{eyebrow}</span>}
        <h1 className="text-[28px] md:text-[30px] font-semibold tracking-[-0.02em] leading-tight">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2 items-center">{children}</div>}
    </header>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="flex justify-between items-baseline gap-3 mb-2"><h2 className="text-[15px] font-semibold">{children}</h2>{right}</div>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('w-full bg-white rounded-[20px] shadow-2xl p-6 flex flex-col gap-5 max-h-[calc(100vh-32px)] overflow-auto', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex justify-between items-center gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:bg-soft"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-medium">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs text-muted font-normal">{hint}</span>}
    </label>
  );
}
const inputCls = 'h-11 px-3 rounded-xl border border-line bg-white text-sm font-normal outline-none focus:border-ink';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, p.className)} />;

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-muted text-sm">{children}</div>;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return <div className={cx('h-1.5 rounded-full bg-soft overflow-hidden', className)}><div className="h-full bg-ink rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="inline-flex gap-1 p-1 bg-soft rounded-xl">
      {options.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={cx('h-9 px-3.5 rounded-[9px] text-[13px]', value === v ? 'bg-white font-semibold shadow-sm' : 'text-sub font-medium')}>
          {l}
        </button>
      ))}
    </div>
  );
}
