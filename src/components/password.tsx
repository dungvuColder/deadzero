import { useState } from 'react';
import { supabase } from '../data/supabaseRepo';
import { Button, Input } from './ui';

/** Đặt hoặc đổi mật khẩu cho tài khoản đang đăng nhập */
export function SetPasswordForm({ onDone }: { onDone: (msg: string) => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (pw !== pw2) { setErr('Hai mật khẩu chưa khớp.'); return; }
    setErr(''); setBusy(true);
    const { error } = await supabase!.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      const m = error.message.toLowerCase();
      setErr(m.includes('different from the old') ? 'Mật khẩu mới phải khác mật khẩu cũ.'
        : m.includes('reauth') || m.includes('session') ? 'Phiên đăng nhập đã cũ, đăng xuất rồi vào lại để đổi mật khẩu.'
        : error.message);
      return;
    }
    setPw(''); setPw2('');
    onDone('Đã lưu mật khẩu. Lần sau đăng nhập bằng email + mật khẩu.');
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <Input type="password" required minLength={6} value={pw} onChange={e => setPw(e.target.value)} placeholder="Mật khẩu mới (ít nhất 6 ký tự)" aria-label="Mật khẩu mới" autoComplete="new-password" />
      <Input type="password" required minLength={6} value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Nhập lại mật khẩu" aria-label="Nhập lại mật khẩu" autoComplete="new-password" />
      {err && <p className="text-sm text-urgent-ink">{err}</p>}
      <Button variant="primary" className="self-start" disabled={busy || pw.length < 6 || pw2.length < 6}>{busy ? 'Đang lưu…' : 'Lưu mật khẩu'}</Button>
    </form>
  );
}
