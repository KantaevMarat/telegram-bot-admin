import { GitBranch } from 'lucide-react';

export default function ScenariosPage() {
  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Сценарии</h1>
          <p className="page-subtitle">Управление сложными цепочками сообщений и действий</p>
        </div>
      </header>
      
      <div className="empty-state">
        <GitBranch size={48} className="empty-state__icon" />
        <h3 className="empty-state__text">В разработке</h3>
        <p className="empty-state__subtext">
          Этот раздел позволит создавать сложные сценарии взаимодействия с пользователями.
        </p>
      </div>
    </div>
  );
}