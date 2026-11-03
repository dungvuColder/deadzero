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
import Login from './pages/Login';

export default function App() {
  return (
    <StoreProvider login={onDemo => <Login onDemo={onDemo} />}>
      <HashRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Today />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="load" element={<Load />} />
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
      </HashRouter>
    </StoreProvider>
  );
}
