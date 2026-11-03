import { useState } from 'react';
import { supabase } from '../data/supabaseRepo';
import { Button, Input } from '../components/ui';

export default function Login({ onDemo }: { onDemo: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const redirect = window.location.origin + window.location.pathname;

  const magic = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    if (error) setErr(error.message); else setSent(true);
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
        {sent ? (
          <p className="rounded-2xl bg-soft p-5 text-sm">Đã gửi link đăng nhập tới <b>{email}</b>. Mở email và bấm vào link.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={google}>Tiếp tục với Google</Button>
            <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />hoặc<span className="h-px flex-1 bg-line" /></div>
            <form onSubmit={magic} className="flex flex-col gap-3">
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@vnu.edu.vn" aria-label="Email" />
              <Button>Gửi link đăng nhập</Button>
            </form>
            {err && <p className="text-sm text-urgent-ink">{err}</p>}
          </div>
        )}
        <button onClick={onDemo} className="text-sm text-muted hover:text-ink underline underline-offset-4 self-start">Dùng thử với dữ liệu mẫu</button>
      </div>
    </div>
  );
}
