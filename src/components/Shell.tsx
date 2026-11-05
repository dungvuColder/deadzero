import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Bell, BookOpen, CalendarDays, LayoutGrid, ListChecks, LogOut, Settings, Sun, TrendingUp, Users } from 'lucide-react';
import { useStore } from '../data/store';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Hôm nay', icon: Sun, end: true },
  { to: '/tasks', label: 'Nhiệm vụ', icon: ListChecks },
  { to: '/calendar', label: 'Lịch', icon: CalendarDays },
  { to: '/load', label: 'Tải công việc', icon: LayoutGrid },
  { to: '/stats', label: 'Thống kê', icon: BarChart3 },
  { to: '/classes', label: 'Lớp học phần', icon: BookOpen },
  { to: '/groups', label: 'Nhóm', icon: Users },
  { to: '/goals', label: 'Tự học', icon: TrendingUp },
  { to: '/notifications', label: 'Thông báo', icon: Bell },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

export default function Shell() {
  const { data, repo, signOut } = useStore();
  const unread = data.notifs.filter(n => !n.read).length;
  return (
    <div className="min-h-screen flex bg-white">
      <nav aria-label="Điều hướng" className="hidden md:flex sticky top-0 h-screen w-[72px] shrink-0 flex-col items-center gap-2 py-6 border-r border-[#F0F0F1]">
        <div className="w-9 h-9 rounded-[10px] bg-ink text-white grid place-items-center font-bold text-[17px] mb-4" aria-label="DeadZero">0</div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} title={label} aria-label={label}
            className={({ isActive }) => cx('relative w-11 h-11 rounded-xl grid place-items-center group', isActive ? 'bg-soft text-ink' : 'text-muted hover:text-ink')}>
            <Icon size={20} strokeWidth={2} />
            {to === '/notifications' && unread > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-urgent" />}
            <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-lg bg-ink text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">{label}</span>
          </NavLink>
        ))}
        <button onClick={signOut} title={repo.mode === 'demo' ? 'Thoát bản demo' : 'Đăng xuất'} aria-label="Đăng xuất" className="mt-auto w-11 h-11 rounded-xl grid place-items-center text-muted hover:text-ink">
          <LogOut size={19} />
        </button>
      </nav>

      <div className="flex-1 min-w-0 flex flex-col">
        {repo.mode === 'demo' && (
          <div className="bg-soft text-sub text-xs px-4 py-2 text-center">Bản demo · dữ liệu mẫu lưu trên trình duyệt này</div>
        )}
        <main className="flex-1 w-full max-w-[1180px] px-4 md:px-12 pt-6 md:pt-10 pb-28 md:pb-12 flex flex-col gap-7">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Điều hướng" className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-line flex overflow-x-auto px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))]">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cx('relative shrink-0 min-w-[64px] flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-[10.5px] font-medium', isActive ? 'text-ink bg-soft' : 'text-muted')}>
            <Icon size={20} />
            {label.replace('Tải công việc', 'Tải').replace('Lớp học phần', 'Lớp')}
            {to === '/notifications' && unread > 0 && <span className="absolute top-1 right-4 w-2 h-2 rounded-full bg-urgent" />}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
