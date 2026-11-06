import { useState } from 'react';
import { supabase } from '../data/supabaseRepo';
import { Button, Input } from '../components/ui';

/** Bật nút Google khi đã cấu hình Google trong Supabase (VITE_ENABLE_GOOGLE=1) */
const GOOGLE = import.meta.env.VITE_ENABLE_GOOGLE === '1';

export default function Login({ onDemo }: { onDemo: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [err, setErr] = useState('');
  const redirect = window.location.origin + window.location.pathname;

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) setErr(error.message.includes('rate') ? 'Gửi quá nhiều lần, thử lại sau ít phút.' : error.message);
    else setStep('code');
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    const { error } = await supabase!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setErr('Mã không đúng hoặc đã hết hạn. Bấm "Gửi lại" để nhận mã mới.');
  };

  const google = async () => {
    const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect } });
    if (error) setErr(error.message);
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-white">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="w-11 h-11 rounded-xl bg-ink text-white grid place-items-center font-bold text-xl">0</div>
          <h1 className="text-[30px] font-semibold tracking-[-0.02em] leading-tight">Đưa deadline<br />về 0.</h1>
        </div>

        {step === 'email' ? (
          <div className="flex flex-col gap-3">
            {GOOGLE && (
              <>
                <Button variant="primary" onClick={google}>Tiếp tục với Google</Button>
                <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />hoặc<span className="h-px flex-1 bg-line" /></div>
              </>
            )}
            <form onSubmit={send} className="flex flex-col gap-3">
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@vnu.edu.vn" aria-label="Email" autoComplete="email" />
              <Button variant={GOOGLE ? 'outline' : 'primary'} disabled={busy || !email}>{busy ? 'Đang gửi…' : 'Nhận mã đăng nhập'}</Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-soft p-5 flex flex-col gap-2 text-sm">
              <span>Đã gửi email tới <b>{email}</b>.</span>
              <span className="text-sub">Mở email và bấm vào link <b className="text-ink">Confirm email address</b> (hoặc <b className="text-ink">Log In</b>). Không thấy thì xem thư mục Spam.</span>
            </div>
            {showCode ? (
              <form onSubmit={verify} className="flex flex-col gap-3">
                <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} autoFocus aria-label="Mã 6 số"
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••"
                  className="h-14 text-center font-mono text-2xl tracking-[0.4em]" />
                <Button variant="primary" disabled={busy || code.length < 6}>{busy ? 'Đang kiểm tra…' : 'Đăng nhập'}</Button>
              </form>
            ) : (
              <button onClick={() => setShowCode(true)} className="self-start text-[13px] text-muted hover:text-ink underline underline-offset-4">Email có mã 6 số? Nhập mã</button>
            )}
            <div className="flex gap-4 text-sm">
              <button onClick={() => send()} disabled={busy} className="text-muted hover:text-ink underline underline-offset-4">Gửi lại</button>
              <button onClick={() => { setStep('email'); setCode(''); setErr(''); }} className="text-muted hover:text-ink underline underline-offset-4">Đổi email</button>
            </div>
          </div>
        )}

        {err && <p className="text-sm text-urgent-ink">{err}</p>}
        <button onClick={onDemo} className="text-sm text-muted hover:text-ink underline underline-offset-4 self-start">Dùng thử với dữ liệu mẫu</button>
      </div>
    </div>
  );
}
