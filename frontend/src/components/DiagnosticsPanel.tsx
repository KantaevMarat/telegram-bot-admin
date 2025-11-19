import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, RefreshCw, Copy } from 'lucide-react';
import { API_URL, api } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface DiagnosticsPanelProps {
  onClose?: () => void;
}

export function DiagnosticsPanel({ onClose }: DiagnosticsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [copied, setCopied] = useState(false);
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const gatherDiagnostics = () => {
      const diag: any = {
        timestamp: new Date().toISOString(),
        api: {
          url: API_URL,
          baseURL: api.defaults.baseURL || window.location.origin + '/api',
        },
        location: {
          href: window.location.href,
          origin: window.location.origin,
          hostname: window.location.hostname,
          protocol: window.location.protocol,
        },
        telegram: {
          exists: typeof window !== 'undefined' && !!window.Telegram,
          hasWebApp: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
          hasInitData: typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData,
          initDataLength: typeof window !== 'undefined' && window.Telegram?.WebApp?.initData?.length || 0,
        },
        auth: {
          isAuthenticated,
          hasToken: !!token,
          tokenLength: token?.length || 0,
        },
        env: {
          mode: import.meta.env.MODE,
          prod: import.meta.env.PROD,
          dev: import.meta.env.DEV,
          viteApiUrl: import.meta.env.VITE_API_URL || '(not set)',
        },
      };

      // Test API connection using api client (which handles auth automatically)
      api.get('/admin/stats')
        .then(response => {
          diag.apiTest = {
            status: response.status,
            statusText: response.statusText,
            ok: true,
            headers: response.headers as any,
            data: response.data,
          };
          setDiagnostics(diag);
        })
        .catch(error => {
          diag.apiTest = {
            error: error.response?.data?.message || error.message,
            code: error.code,
            name: error.name,
            status: error.response?.status,
            statusText: error.response?.statusText,
            ok: false,
          };
          setDiagnostics(diag);
        });
    };

    gatherDiagnostics();
  }, [token, isAuthenticated]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 10000,
      padding: '20px',
      overflow: 'auto',
    }}>
      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>🔍 Диагностика системы</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={copyToClipboard}
              className="btn btn--secondary btn--sm"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Copy size={16} />
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="btn btn--secondary btn--icon btn--sm"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* API Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🌐 API статус</h3>
            </div>
            <div className="card-body">
              <p><strong>URL:</strong> {diagnostics.api?.url || 'Loading...'}</p>
              <p><strong>Base URL:</strong> {diagnostics.api?.baseURL || 'Loading...'}</p>
              {diagnostics.apiTest && (
                <>
                  {diagnostics.apiTest.ok ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', marginTop: '8px' }}>
                      <CheckCircle size={16} />
                      <span>✅ API доступен (Status: {diagnostics.apiTest.status})</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', marginTop: '8px' }}>
                      <AlertCircle size={16} />
                      <span>❌ API недоступен (Status: {diagnostics.apiTest.status})</span>
                    </div>
                  )}
                  {diagnostics.apiTest.error && (
                    <p style={{ color: 'var(--error)', marginTop: '8px' }}>
                      <strong>Ошибка:</strong> {diagnostics.apiTest.error}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Telegram WebApp */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📱 Telegram WebApp</h3>
            </div>
            <div className="card-body">
              <p><strong>Exists:</strong> {diagnostics.telegram?.exists ? '✅ Да' : '❌ Нет'}</p>
              <p><strong>Has WebApp:</strong> {diagnostics.telegram?.hasWebApp ? '✅ Да' : '❌ Нет'}</p>
              <p><strong>Has initData:</strong> {diagnostics.telegram?.hasInitData ? '✅ Да' : '❌ Нет'}</p>
              <p><strong>initData length:</strong> {diagnostics.telegram?.initDataLength || 0}</p>
            </div>
          </div>

          {/* Auth Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🔐 Авторизация</h3>
            </div>
            <div className="card-body">
              <p><strong>Авторизован:</strong> {diagnostics.auth?.isAuthenticated ? '✅ Да' : '❌ Нет'}</p>
              <p><strong>Есть токен:</strong> {diagnostics.auth?.hasToken ? '✅ Да' : '❌ Нет'}</p>
              <p><strong>Длина токена:</strong> {diagnostics.auth?.tokenLength || 0}</p>
            </div>
          </div>

          {/* Location */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🌐 Локация</h3>
            </div>
            <div className="card-body">
              <p><strong>URL:</strong> {diagnostics.location?.href}</p>
              <p><strong>Origin:</strong> {diagnostics.location?.origin}</p>
              <p><strong>Hostname:</strong> {diagnostics.location?.hostname}</p>
              <p><strong>Protocol:</strong> {diagnostics.location?.protocol}</p>
            </div>
          </div>

          {/* Environment */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">⚙️ Окружение</h3>
            </div>
            <div className="card-body">
              <p><strong>Mode:</strong> {diagnostics.env?.mode}</p>
              <p><strong>Production:</strong> {diagnostics.env?.prod ? '✅ Да' : '❌ Нет'}</p>
              <p><strong>Development:</strong> {diagnostics.env?.dev ? '✅ Да' : '❌ Нет'}</p>
              <p><strong>VITE_API_URL:</strong> {diagnostics.env?.viteApiUrl}</p>
            </div>
          </div>

          {/* Full JSON */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📋 Полная диагностика (JSON)</h3>
            </div>
            <div className="card-body">
              <pre style={{
                background: 'var(--bg-secondary)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '400px',
              }}>
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => window.location.reload()}
            className="btn btn--secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
            Обновить страницу
          </button>
        </div>
      </div>
    </div>
  );
}



