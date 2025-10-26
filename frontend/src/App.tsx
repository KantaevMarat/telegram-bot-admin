import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';

// Pages
import StatsPage from './pages/StatsPage';
import UsersPage from './pages/UsersPage';
import BalancePage from './pages/BalancePage';
import PayoutsPage from './pages/PayoutsPage';
import SettingsPage from './pages/SettingsPage';
import BroadcastPage from './pages/BroadcastPage';
import ButtonsPage from './pages/ButtonsPage';
import ScenariosPage from './pages/ScenariosPage';
import TasksPage from './pages/TasksPage';
import ChatsPage from './pages/ChatsPage';
import AdminsPage from './pages/AdminsPage';
import UserAppPage from './pages/UserAppPage';

function App() {
  const { isAuthenticated, refreshToken } = useAuthStore();

  useEffect(() => {
    // Auto-login in development mode
    if (import.meta.env.DEV && !isAuthenticated) {
      console.log('🚀 Auto-login in development mode...');
      refreshToken();
    }
  }, [isAuthenticated, refreshToken]);

  return (
    <Routes>
      {/* Public route for Telegram Web App */}
      <Route path="/app" element={<UserAppPage />} />
      
      {/* Admin routes (require authentication) */}
      {!isAuthenticated ? (
        <Route path="*" element={<LoginPage />} />
      ) : (
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/balance" element={<BalancePage />} />
              <Route path="/payouts" element={<PayoutsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/broadcast" element={<BroadcastPage />} />
              <Route path="/buttons" element={<ButtonsPage />} />
              <Route path="/scenarios" element={<ScenariosPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/admins" element={<AdminsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      )}
    </Routes>
  );
}

export default App;

