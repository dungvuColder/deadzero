import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../data/supabaseRepo';
import { Button, Input, cx } from '../components/ui';

/** Bật nút Google khi đã cấu hình Google trong Supabase (VITE_ENABLE_GOOGLE=1) */
const GOOGLE = import.meta.env.VITE_ENABLE_GOOGLE === '1';

type Mode = 'login' | 'signup' | 'forgot' | 'link';

/** Đổi lỗi tiếng Anh của Supabase sang câu dễ hiểu */
function viErr(m: string, mode: Mode): string {
  const s = m.toLowerCase();
  if (s.includes('invalid login')) return 'Sai email hoặc mật khẩu. Nếu trước đây bạn vào bằng link email, bấm "Quên mật khẩu" để đặt mật khẩu.';
  if (s.includes('already registered') || s.includes('already been registered')) return 'Email này đã có tài khoản. Chuyển sang Đăng nhập.';
  if (s.includes('not confirmed')) return 'Email chưa được xác nhận. Mở email xác nhận rồi đăng nhập lại.';
  if (s.includes('rate') || s.includes('security purposes')) return mode === 'login' ? 'Thử quá nhiều lần, đợi ít phút.' : 'Hệ thống vừa gửi email, đợi vài phút rồi thử lại.';
  if (s.includes('password') && (s.includes('6') || s.includes('short') || s.includes('weak'))) return 'Mật khẩu cần ít nhất 6 ký tự.';
  return m;
}

export default function Login({ onDemo }: { onDemo: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState('');
  const redirect = window.location.origin + window.location.pathname;

  const go = (m: Mode) => { setMode(m); setErr(''); setSent(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    const em = email.trim();
    try {
      if (mode === 'login') {
        const { error } = await supabase!.auth.signInWithPassword({ email: em, password: pw });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase!.auth.signUp({
          email: em, password: pw,
          options: { emailRedirectTo: redirect, data: { full_name: name.trim() || undefined } },
        });
        if (error) throw error;
        // Supabase trả user không có identities khi email đã tồn tại
        if (data.user && data.user.identities?.length === 0) throw new Error('already registered');
        if (!data.session) setSent(`Đã gửi email xác nhận tới ${em}. Bấm link trong email rồi quay lại đăng nhập.`);
      } else if (mode === 'forgot') {
        const { error } = await supabase!.auth.resetPasswordForEmail(em, { redirectTo: redirect });
        if (error) throw error;
        setSent(`Đã gửi link đặt lại mật khẩu tới ${em}. Mở email, bấm link, rồi nhập mật khẩu mới.`);
      } else {
        const { error } = await supabase!.auth.signInWithOtp({ email: em, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        setSent(`Đã gửi link đăng nhập tới ${em}. Không thấy thì xem thư mục Spam.`);
      }
    } catch (e2) {
      setErr(viErr((e2 as Error).message, mode));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect } });
    if (error) setErr(error.message);
  };

  const needPw = mode === 'login' || mode === 'signup';
  const cta = { login: 'Đăng nhập', signup: 'Tạo tài khoản', forgot: 'Gửi link đặt lại', link: 'Gửi link đăng nhập' }[mode];

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-white">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="w-11 h-11 rounded-xl bg-ink text-white grid place-items-center font-bold text-xl">0</div>
          <h1 className="text-[30px] font-semibold tracking-[-0.02em] leading-tight">Đưa deadline<br />về 0.</h1>
        </div>

        {needPw && (
          <div className="grid grid-cols-2 p-1 rounded-xl bg-soft text-sm font-medium">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} type="button" onClick={() => go(m)}
                className={cx('h-9 rounded-lg transition', mode === m ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink')}>
                {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>
        )}
        {!needPw && (
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{mode === 'forgot' ? 'Quên mật khẩu' : 'Đăng nhập bằng link email'}</h2>
            <p className="text-sm text-muted">{mode === 'forgot' ? 'Nhập email, mình gửi link để đặt mật khẩu mới.' : 'Không cần mật khẩu, bấm link trong email là vào.'}</p>
          </div>
        )}

        {sent ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-soft p-5 text-sm">{sent}</div>
            <button onClick={() => go('login')} className="self-start text-sm text-muted hover:text-ink underline underline-offset-4">Quay lại đăng nhập</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {GOOGLE && needPw && (
              <>
                <Button variant="outline" onClick={google}>Tiếp tục với Google</Button>
                <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />hoặc<span className="h-px flex-1 bg-line" /></div>
              </>
            )}
            <form onSubmit={submit} className="flex flex-col gap-3">
              {mode === 'signup' && (
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tên hiển thị" aria-label="Tên hiển thị" autoComplete="name" />
              )}
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@vnu.edu.vn" aria-label="Email" autoComplete="email" />
              {needPw && (
                <div className="relative">
                  <Input type={show ? 'text' : 'password'} required minLength={6} value={pw} onChange={e => setPw(e.target.value)}
                    placeholder={mode === 'signup' ? 'Mật khẩu (ít nhất 6 ký tự)' : 'Mật khẩu'} aria-label="Mật khẩu"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="w-full pr-11" />
                  <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-0 top-0 h-full w-11 grid place-items-center text-muted hover:text-ink">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}
              <Button variant="primary" disabled={busy || !email || (needPw && pw.length < 6)}>{busy ? 'Đang xử lý…' : cta}</Button>
            </form>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
              {mode === 'login' && <button onClick={() => go('forgot')} className="text-muted hover:text-ink underline underline-offset-4">Quên mật khẩu?</button>}
              {needPw
                ? <button onClick={() => go('link')} className="text-muted hover:text-ink underline underline-offset-4">Vào bằng link email</button>
                : <button onClick={() => go('login')} className="text-muted hover:text-ink underline underline-offset-4">Quay lại đăng nhập</button>}
            </div>
          </div>
        )}

        {err && <p className="text-sm text-urgent-ink">{err}</p>}
        <button onClick={onDemo} className="text-sm text-muted hover:text-ink underline underline-offset-4 self-start">Dùng thử với dữ liệu mẫu</button>
      </div>
    </div>
  );
}
