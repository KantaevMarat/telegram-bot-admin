import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi, mediaApi } from '../api/client';
import { 
  MessageSquare, Send, User, Clock, Search, Filter, Image, Paperclip, 
  X, FileText, Film, Check, CheckCheck, ArrowLeft, Loader2, FileImage, Video, Trash
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSyncRefetch } from '../hooks/useSync';

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
  media_count?: number;
}

interface Message {
  id: string;
  text: string;
  from_admin: boolean;
  from_admin_tg_id?: string;
  created_at: string;
  media_url?: string;
  media_type?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  read_at?: string;
  delivered_at?: string;
}

// Шаблоны быстрых ответов
const QUICK_REPLIES = [
  'Здравствуйте! Чем могу помочь?',
  'Спасибо за обращение!',
  'Ваш запрос принят в обработку',
  'Пожалуйста, уточните ваш вопрос',
  'Проблема решена?',
];

export default function ChatsPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [filterMediaOnly, setFilterMediaOnly] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Список чатов с автообновлением каждые 5 секунд
  const { data: chats, isLoading: chatsLoading, refetch: refetchChats } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatsApi.getChats(),
    refetchInterval: 5000,
  });

  // 🔄 Auto-refresh chats on new messages
  useSyncRefetch(['messages.created'], refetchChats);

  // Сообщения выбранного чата с автообновлением каждые 3 секунд
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: () => chatsApi.getMessages(selectedUserId!, 100),
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  // 🔄 Auto-refresh messages on sync events
  useSyncRefetch(['messages.created'], refetchMessages);

  // Отправка сообщения
  const sendMutation = useMutation({
    mutationFn: async ({ text, media_url }: { text: string; media_url?: string }) => {
      return chatsApi.sendMessage(selectedUserId!, { text, media_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setMessageText('');
      setSelectedFile(null);
      setShowQuickReplies(false);
      scrollToBottom();
      // Возвращаем фокус на поле ввода
      setTimeout(() => messageInputRef.current?.focus(), 100);
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

  // Фокус на поле ввода при выборе чата
  useEffect(() => {
    if (selectedUserId) {
      messageInputRef.current?.focus();
    }
  }, [selectedUserId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!messageText.trim() && !selectedFile) || sendMutation.isPending || uploadingFile) {
      return;
    }

    let media_url: string | undefined;

    // Загружаем файл если он выбран
    if (selectedFile) {
      try {
        setUploadingFile(true);
        const result = await mediaApi.uploadFile(selectedFile);
        media_url = result.url;
      } catch (error) {
        toast.error('Ошибка загрузки файла');
        setUploadingFile(false);
        return;
      } finally {
        setUploadingFile(false);
      }
    }

    sendMutation.mutate({ 
      text: messageText.trim() || (selectedFile ? '' : 'Сообщение'), 
      media_url 
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Отправка по Enter (но не Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type?: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера файла (макс 50 МБ)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 50 МБ)');
      return;
    }

    // Валидация типа файла
    if (type === 'photo' && !file.type.startsWith('image/')) {
      toast.error('Выберите файл изображения');
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Выберите видео файл');
      return;
    }

    setSelectedFile(file);
    
    // Очистка input для возможности повторного выбора того же файла
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleQuickReply = (text: string) => {
    setMessageText(text);
    setShowQuickReplies(false);
    messageInputRef.current?.focus();
  };

  const handleSelectChat = (userId: string) => {
    setSelectedUserId(userId);
    setShowMobileSidebar(false); // Скрываем sidebar на мобильных при выборе чата
  };

  const handleBackToList = () => {
    setShowMobileSidebar(true);
    setSelectedUserId(null);
  };

  // Фильтрация чатов
  const filteredChats = chats?.filter((chat: Chat) => {
    const matchesSearch = 
      !searchQuery ||
      chat.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.user?.tg_id?.toString().includes(searchQuery);
    
    const matchesFilter = !filterUnread || chat.unread_count > 0;
    
    return matchesSearch && matchesFilter;
  });

  const selectedChat = chats?.find((chat: Chat) => chat.user_id === selectedUserId);

  // Функция рендеринга статуса сообщения
  const renderMessageStatus = (message: Message) => {
    // Показывать статус только для сообщений от админа
    const isFromAdmin = message.from_admin_tg_id !== null && message.from_admin_tg_id !== undefined;
    if (!isFromAdmin) return null;

    // Определяем статус
    let status = message.status || 'sent';
    
    // Если нет явного статуса, определяем по временным меткам
    if (!message.status) {
      if (message.read_at) {
        status = 'read';
      } else if (message.delivered_at) {
        status = 'delivered';
      } else {
        status = 'sent';
      }
    }

    switch (status) {
      case 'sending':
        return <Loader2 size={14} className="spinning" style={{ opacity: 0.5 }} />;
      case 'sent':
        return <Check size={14} style={{ opacity: 0.5 }} />;
      case 'delivered':
        return <CheckCheck size={14} style={{ opacity: 0.5 }} />;
      case 'read':
        return <CheckCheck size={14} style={{ color: '#10b981', fontWeight: 'bold' }} />;
      case 'failed':
        return <X size={14} style={{ color: '#ef4444' }} />;
      default:
        return <Check size={14} style={{ opacity: 0.5 }} />;
    }
  };

  const getUserDisplayName = (chat: Chat) => {
    const user = chat.user;
    if (!user) return `ID: ${chat.user_id}`;
    
    if (user.username) {
      return `@${user.username}`;
    }
    
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    if (fullName) {
      return fullName;
    }
    
    return `ID: ${user.tg_id}`;
  };
  
  const getUserSubtitle = (chat: Chat) => {
    const user = chat.user;
    if (!user) return null;
    
    // If username is shown, show name as subtitle
    if (user.username) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
      return fullName || `ID: ${user.tg_id}`;
    }
    
    // If name is shown, show ID as subtitle
    return `ID: ${user.tg_id}`;
  };

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
    <div className="page chats-page">
      {/* Page Header - только на desktop */}
      <header className="page-header chats-page__header">
        <div className="page-title-section">
          <h1 className="page-title">Чаты</h1>
          <p className="page-subtitle">Прямое общение с пользователями</p>
        </div>
      </header>
      
      <div className="chats-layout">
        {/* Список чатов */}
        <div className={`card chats-sidebar ${showMobileSidebar ? 'chats-sidebar--visible' : 'chats-sidebar--hidden'}`}>
          <div className="chats-sidebar__header">
            <h3 className="chats-sidebar__title">
              Чаты ({filteredChats?.length || 0})
            </h3>
            
            {/* Поиск */}
            <div className="chats-search">
              <Search size={18} className="chats-search__icon" />
              <input
                type="text"
                className="form-input chats-search__input"
                placeholder="Поиск по имени или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Фильтр */}
            <button
              className={`btn ${filterUnread ? 'btn--primary' : 'btn--secondary'} chats-sidebar__filter`}
              onClick={() => setFilterUnread(!filterUnread)}
            >
              <Filter size={16} />
              <span>{filterUnread ? 'Все чаты' : 'Непрочитанные'}</span>
            </button>
          </div>
          
          <div className="chats-sidebar__list">
            {!filteredChats || filteredChats.length === 0 ? (
              <div className="empty-chat-state">
                <MessageSquare size={48} className="empty-chat-state__icon" />
                <p>{searchQuery || filterUnread ? 'Ничего не найдено' : 'Нет активных чатов'}</p>
              </div>
            ) : (
              filteredChats.map((chat: Chat) => (
                <div
                  key={chat.user_id}
                  onClick={() => handleSelectChat(chat.user_id)}
                  className={`chat-item ${selectedUserId === chat.user_id ? 'chat-item--active' : ''}`}
                >
                  <div className="chat-item__avatar">
                    <User size={20} />
                  </div>
                  <div className="chat-item__content">
                    <div className="chat-item__header">
                      <span className="chat-item__name">
                        {getUserDisplayName(chat)}
                      </span>
                      {chat.unread_count > 0 && (
                        <span className="chat-item__badge">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="chat-item__subtitle">
                      <span>{getUserSubtitle(chat)}</span>
                      {chat.media_count && chat.media_count > 0 && (
                        <span style={{ 
                          marginLeft: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--info)',
                          fontSize: 'var(--font-size-xs)'
                        }}>
                          <Image size={12} />
                          {chat.media_count}
                        </span>
                      )}
                    </div>
                    {chat.last_message && (
                      <div className="chat-item__last-message">
                        {chat.last_message.from_admin && <span className="chat-item__you">Вы: </span>}
                        {chat.last_message.text}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Окно чата */}
        <div className={`card chat-window ${!showMobileSidebar ? 'chat-window--visible' : ''}`}>
          {!selectedUserId ? (
            <div className="empty-chat-state">
              <MessageSquare size={64} className="empty-chat-state__icon" />
              <p className="empty-chat-state__text">Выберите чат</p>
            </div>
          ) : (
            <>
              {/* Заголовок чата */}
              <div className="chat-window__header">
                <button 
                  className="btn btn--icon chat-window__back"
                  onClick={handleBackToList}
                  title="Назад к списку"
                >
                  <ArrowLeft size={20} />
                </button>
                
                <div className="chat-window__avatar">
                  <User size={20} />
                </div>
                
                <div className="chat-window__user-info">
                  <div className="chat-window__user-name">
                    {getUserDisplayName(selectedChat!)}
                  </div>
                  <div className="chat-window__user-id">
                    ID: {selectedChat?.user?.tg_id || selectedChat?.user_id}
                    {selectedChat?.media_count && selectedChat.media_count > 0 && (
                      <span style={{ 
                        marginLeft: '8px',
                        color: 'var(--info)',
                      }}>
                        • <Image size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {selectedChat.media_count}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Кнопка фильтрации медиафайлов */}
                {selectedChat?.media_count && selectedChat.media_count > 0 && (
                  <button
                    className={`btn ${filterMediaOnly ? 'btn--primary' : 'btn--secondary'} btn--sm`}
                    onClick={() => setFilterMediaOnly(!filterMediaOnly)}
                    title={filterMediaOnly ? 'Показать все сообщения' : 'Показать только медиа'}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Image size={16} />
                    {filterMediaOnly ? 'Все' : 'Медиа'}
                  </button>
                )}
              </div>

              {/* Сообщения */}
              <div className="chat-messages">
                {messagesLoading ? (
                  <div className="chat-messages__loading">
                    <Loader2 size={32} className="spinning" />
                    <span>Загрузка сообщений...</span>
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div className="chat-messages__empty">
                    <MessageSquare size={48} />
                    <span>Нет сообщений</span>
                    <p>Начните диалог с пользователем</p>
                  </div>
                ) : (
                  messages
                    .filter((msg: Message) => !filterMediaOnly || msg.media_url)
                    .map((msg: Message) => {
                    const isFromAdmin = msg.from_admin_tg_id !== null && msg.from_admin_tg_id !== undefined;
                    return (
                    <div
                      key={msg.id}
                      className={`message ${isFromAdmin ? 'message--outgoing' : 'message--incoming'}`}
                    >
                      <div className="message__bubble">
                        {/* Медиа */}
                        {msg.media_url && (
                          <div className="message__media">
                            {msg.media_type === 'photo' || msg.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img
                                src={msg.media_url}
                                alt="Медиа"
                                className="message__image"
                              />
                            ) : msg.media_type === 'video' || msg.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                              <video
                                src={msg.media_url}
                                controls
                                className="message__video"
                              />
                            ) : (
                              <a
                                href={msg.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="message__file"
                              >
                                <FileText size={20} />
                                <span>Файл</span>
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Текст сообщения */}
                        {msg.text && (
                          <div className="message__text">
                            {msg.text}
                          </div>
                        )}
                        
                        {/* Время и статус */}
                        <div className="message__meta">
                          <span className="message__time">
                            {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="message__status">
                            {renderMessageStatus(msg)}
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Быстрые ответы */}
              {showQuickReplies && (
                <div className="quick-replies">
                  {QUICK_REPLIES.map((reply, index) => (
                    <button
                      key={index}
                      type="button"
                      className="btn btn--secondary quick-replies__item"
                      onClick={() => handleQuickReply(reply)}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Предпросмотр файла */}
              {selectedFile && (
                <div className="file-preview" style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {selectedFile.type.startsWith('image/') ? (
                      <FileImage size={24} style={{ color: 'var(--accent)' }} />
                    ) : selectedFile.type.startsWith('video/') ? (
                      <Video size={24} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <FileText size={24} style={{ color: 'var(--accent)' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} МБ
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="btn btn--danger btn--icon btn--sm"
                    title="Удалить файл"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              )}

              {/* Форма отправки */}
              <form onSubmit={handleSendMessage} className="chat-input">
                {/* Скрытые input'ы для файлов */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleFileSelect(e)}
                  className="chat-input__file-input"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'photo')}
                  className="chat-input__file-input"
                  style={{ display: 'none' }}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileSelect(e, 'video')}
                  className="chat-input__file-input"
                  style={{ display: 'none' }}
                />
                
                {/* Кнопки для загрузки медиа */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn--icon chat-input__btn"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={sendMutation.isPending || uploadingFile}
                    title="Загрузить фото"
                  >
                    <FileImage size={20} />
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn--icon chat-input__btn"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={sendMutation.isPending || uploadingFile}
                    title="Загрузить видео"
                  >
                    <Video size={20} />
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn--icon chat-input__btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendMutation.isPending || uploadingFile}
                    title="Прикрепить файл (документ)"
                  >
                    <Paperclip size={20} />
                  </button>
                </div>

                <button
                  type="button"
                  className={`btn btn--icon chat-input__btn ${showQuickReplies ? 'chat-input__btn--active' : ''}`}
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  disabled={sendMutation.isPending || uploadingFile}
                  title="Быстрые ответы"
                >
                  <MessageSquare size={20} />
                </button>

                <input
                  ref={messageInputRef}
                  type="text"
                  className="form-input chat-input__input"
                  placeholder="Введите сообщение..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sendMutation.isPending || uploadingFile}
                />

                <button
                  type="submit"
                  className="btn btn--primary chat-input__send"
                  disabled={(!messageText.trim() && !selectedFile) || sendMutation.isPending || uploadingFile}
                  title="Отправить (Enter)"
                >
                  {uploadingFile ? (
                    <Loader2 size={20} className="spinning" />
                  ) : sendMutation.isPending ? (
                    <Loader2 size={20} className="spinning" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
