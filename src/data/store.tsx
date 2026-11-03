import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, Repo } from '../lib/types';
import { createLocalRepo } from './localRepo';
import { createSupabaseRepo, hasSupabase, supabase } from './supabaseRepo';

interface Ctx {
  data: AppData;
  repo: Repo;
  /** Chạy một thao tác ghi, tải lại dữ liệu, hiện thông báo ngắn */
  run: <T>(fn: (r: Repo) => Promise<T>, msg?: string) => Promise<T | undefined>;
  toast: (msg: string) => void;
  signOut: () => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => { const c = useContext(StoreCtx); if (!c) throw new Error('StoreProvider missing'); return c; };

const DEMO_FLAG = 'deadzero-use-demo';

export function StoreProvider({ children, login }: { children: ReactNode; login: (onDemo: () => void) => ReactNode }) {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const useDemo = useCallback(() => {
    try { sessionStorage.setItem(DEMO_FLAG, '1'); } catch { /* bỏ qua */ }
    setNeedLogin(false); setRepo(createLocalRepo());
  }, []);

  useEffect(() => {
    if (!hasSupabase || !supabase) { setRepo(createLocalRepo()); return; }
    let demo = false;
    try { demo = sessionStorage.getItem(DEMO_FLAG) === '1'; } catch { /* bỏ qua */ }
    if (demo) { setRepo(createLocalRepo()); return; }
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setRepo(createSupabaseRepo(s.session.user.id)); else setNeedLogin(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setNeedLogin(false); setRepo(r => (r?.mode === 'cloud' ? r : createSupabaseRepo(session.user.id))); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async (r: Repo) => { setData(await r.load()); }, []);

  useEffect(() => {
    if (!repo) return;
    reload(repo).catch(e => toast(String(e.message ?? e)));
    return repo.subscribe(() => { reload(repo).catch(() => undefined); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const value = useMemo<Ctx | null>(() => repo && data ? {
    data, repo, toast,
    run: async (fn, msg) => {
      try { const out = await fn(repo); await reload(repo); if (msg) toast(msg); return out; }
      catch (e) { toast((e as Error).message || 'Có lỗi, thử lại sau'); return undefined; }
    },
    signOut: async () => {
      try { sessionStorage.removeItem(DEMO_FLAG); } catch { /* bỏ qua */ }
      if (supabase) await supabase.auth.signOut();
      setRepo(null); setData(null); setNeedLogin(hasSupabase);
      if (!hasSupabase) setRepo(createLocalRepo());
    },
  } : null, [repo, data, reload, toast]);

  if (needLogin) return <>{login(useDemo)}</>;
  if (!value) return <div className="min-h-screen grid place-items-center text-muted">Đang tải…</div>;
  return (
    <StoreCtx.Provider value={value}>
      {children}
      {toastMsg && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-[calc(88px+env(safe-area-inset-bottom))] md:bottom-8 z-[60] bg-ink text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg max-w-[calc(100%-32px)]">
          {toastMsg}
        </div>
      )}
    </StoreCtx.Provider>
  );
}
