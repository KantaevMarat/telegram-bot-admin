import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '../api/client';
import { MessageSquare, Send, User, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Chat {
  user_id: string;
  user: {
    id: string;
    tg_id: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  last_message?: {
    text: string;
    created_at: string;
    from_admin: boolean;
  };
  unread_count: number;
}

interface Message {
  id: string;
  text: string;
  from_admin: boolean;
  created_at: string;
}

export default function ChatsPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Список чатов с автообновлением каждые 5 секунд
  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatsApi.getChats(),
    refetchInterval: 5000,
  });

  // Сообщения выбранного чата с автообновлением каждые 3 секунды
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: () => chatsApi.getMessages(selectedUserId!, 100),
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  // Отправка сообщения
  const sendMutation = useMutation({
    mutationFn: (text: string) => chatsApi.sendMessage(selectedUserId!, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setMessageText('');
      scrollToBottom();
    },
    onError: () => toast.error('Ошибка отправки сообщения'),
  });

  // Прокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && !sendMutation.isPending) {
      sendMutation.mutate(messageText.trim());
    }
  };

  const selectedChat = chats?.find((chat: Chat) => chat.user_id === selectedUserId);

  if (chatsLoading) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Чаты</h1>
            <p className="page-subtitle">Прямое общение с пользователями</p>
          </div>
        </header>
        <div className="loading">
          <div className="loading-skeleton" style={{ height: '400px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Чаты</h1>
          <p className="page-subtitle">Прямое общение с пользователями</p>
        </div>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', height: 'calc(100vh - 200px)' }}>
        {/* Список чатов */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
              Чаты ({chats?.length || 0})
            </h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!chats || chats.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>Нет активных чатов</p>
              </div>
            ) : (
              chats.map((chat: Chat) => (
                <div
                  key={chat.user_id}
                  onClick={() => setSelectedUserId(chat.user_id)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedUserId === chat.user_id ? 'var(--accent-light)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedUserId !== chat.user_id) {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedUserId !== chat.user_id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <User size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <span style={{ 
                          fontWeight: 'var(--font-weight-semibold)', 
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {chat.user?.username || chat.user?.first_name || `User ${chat.user?.tg_id || chat.user_id}`}
                        </span>
                        {chat.unread_count > 0 && (
                          <span style={{
                            background: 'var(--accent)',
                            color: 'white',
                            borderRadius: '10px',
                            padding: '2px 8px',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-semibold)',
                          }}>
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                      {chat.last_message && (
                        <div style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {chat.last_message.from_admin && <span style={{ color: 'var(--accent)' }}>Вы: </span>}
                          {chat.last_message.text}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Окно чата */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {!selectedUserId ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
            }}>
              <MessageSquare size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontSize: 'var(--font-size-lg)' }}>Выберите чат</p>
            </div>
          ) : (
            <>
              {/* Заголовок чата */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
                    {selectedChat?.user?.username || selectedChat?.user?.first_name || `User ${selectedChat?.user?.tg_id || selectedChat?.user_id}`}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    ID: {selectedChat?.user?.tg_id || selectedChat?.user_id}
                  </div>
                </div>
              </div>

              {/* Сообщения */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {messagesLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                    Загрузка сообщений...
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                    Нет сообщений
                  </div>
                ) : (
                  messages.map((msg: Message) => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: msg.from_admin ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: msg.from_admin ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: msg.from_admin ? 'white' : 'var(--text-primary)',
                      }}>
                        <div style={{ marginBottom: '4px', wordBreak: 'break-word' }}>
                          {msg.text}
                        </div>
                        <div style={{
                          fontSize: 'var(--font-size-xs)',
                          opacity: 0.7,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          justifyContent: 'flex-end',
                        }}>
                          <Clock size={12} />
                          {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Форма отправки */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '20px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  placeholder="Введите сообщение..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sendMutation.isPending}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={!messageText.trim() || sendMutation.isPending}
                >
                  <Send size={16} />
                  Отправить
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}