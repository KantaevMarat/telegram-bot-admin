import { MessageSquare } from 'lucide-react';

export default function ChatsPage() {
  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Чаты</h1>
          <p className="page-subtitle">Прямое общение с пользователями</p>
        </div>
      </header>
      
      <div className="empty-state">
        <MessageSquare size={48} className="empty-state__icon" />
        <h3 className="empty-state__text">В разработке</h3>
        <p className="empty-state__subtext">
          Этот раздел позволит вести переписку с пользователями прямо из админ-панели.
        </p>
      </div>
    </div>
  );
}