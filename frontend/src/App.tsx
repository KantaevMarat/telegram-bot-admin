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
import ButtonsPage from './pages/ButtonsPageV2';
import ScenariosPage from './pages/ScenariosPage';
import TasksPage from './pages/TasksPage';
import CommandsPage from './pages/CommandsPage';
import ModerationPage from './pages/ModerationPage';
import ChatsPage from './pages/ChatsPage';
import AdminsPage from './pages/AdminsPage';
import UserAppPage from './pages/UserAppPage';
import { ChannelsPage } from './pages/ChannelsPage';
import RanksPage from './pages/RanksPage';

function App() {
  const { isAuthenticated, refreshToken } = useAuthStore();

  useEffect(() => {
    // Auto-login in development mode (only once on mount)
    if (import.meta.env.DEV && !isAuthenticated) {
      refreshToken().then(() => {
        // Проверяем после обновления токена
        const authState = useAuthStore.getState();
        if (authState.isAuthenticated) {
          // Auto-login successful
        }
      }).catch(() => {
        // Auto-login error
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, not when isAuthenticated changes

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
              <Route path="/commands" element={<CommandsPage />} />
              <Route path="/moderation" element={<ModerationPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/admins" element={<AdminsPage />} />
              <Route path="/ranks" element={<RanksPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      )}
    </Routes>
  );
}

export default App;

