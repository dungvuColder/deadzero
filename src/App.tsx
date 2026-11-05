import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './data/store';
import Shell from './components/Shell';
import Today from './pages/Today';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Load from './pages/Load';
import { ClassDetail, ClassList, ImportTkb } from './pages/Classes';
import { GroupDetail, GroupList } from './pages/Groups';
import Goals from './pages/Goals';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Stats from './pages/Stats';
import Login from './pages/Login';
import Welcome, { WELCOMED_KEY } from './pages/Welcome';

/** Lần đầu mở app → trang giới thiệu */
function seenWelcome() {
  try { return localStorage.getItem(WELCOMED_KEY) === '1'; } catch { return true; }
}

function MainApp() {
  if (!seenWelcome()) return <Navigate to="/welcome" replace />;
  return (
    <StoreProvider login={onDemo => <Login onDemo={onDemo} />}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Today />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="load" element={<Load />} />
          <Route path="stats" element={<Stats />} />
          <Route path="classes" element={<ClassList />} />
          <Route path="classes/:id" element={<ClassDetail />} />
          <Route path="import" element={<ImportTkb />} />
          <Route path="groups" element={<GroupList />} />
          <Route path="groups/:id" element={<GroupDetail />} />
          <Route path="goals" element={<Goals />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </HashRouter>
  );
}
