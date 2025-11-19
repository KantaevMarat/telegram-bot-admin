import { useState } from 'react';
import { ButtonConfig, ButtonTestResult } from '../../types/button.types';
import { TestTube, CheckCircle, XCircle, Loader } from 'lucide-react';

interface ButtonTestPanelProps {
  config: ButtonConfig;
  onTest: (config: ButtonConfig) => Promise<ButtonTestResult>;
}

export default function ButtonTestPanel({ config, onTest }: ButtonTestPanelProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ButtonTestResult | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const testResult = await onTest(config);
      setResult(testResult);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Ошибка выполнения теста',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--background-secondary)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
          Тестирование кнопки
        </h4>
        <button
          type="button"
          onClick={handleTest}
          className="btn btn--primary btn--sm"
          disabled={testing}
        >
          {testing ? (
            <>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Тестирование...
            </>
          ) : (
            <>
              <TestTube size={16} />
              Запустить тест
            </>
          )}
        </button>
      </div>

      {result && (
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            background: result.success ? 'var(--success-light)' : 'var(--error-light)',
            border: `1px solid ${result.success ? 'var(--success)' : 'var(--error)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {result.success ? (
              <CheckCircle size={16} style={{ color: 'var(--success)' }} />
            ) : (
              <XCircle size={16} style={{ color: 'var(--error)' }} />
            )}
            <strong style={{ color: result.success ? 'var(--success)' : 'var(--error)' }}>
              {result.success ? 'Тест успешен' : 'Тест провален'}
            </strong>
          </div>

          {result.error && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--error)', marginTop: '8px' }}>
              {result.error}
            </div>
          )}

          {result.payload && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Payload:
              </div>
              <pre
                style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px',
                  background: 'var(--background)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}
              >
                {JSON.stringify(result.payload, null, 2)}
              </pre>
            </div>
          )}

          {result.response && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Response:
              </div>
              <pre
                style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px',
                  background: 'var(--background)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}
              >
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </div>
          )}

          {result.logs && result.logs.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Логи:
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px',
                  background: 'var(--background)',
                  borderRadius: 'var(--radius-sm)',
                  maxHeight: '150px',
                  overflow: 'auto',
                }}
              >
                {result.logs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '4px', fontFamily: 'monospace' }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
        💡 Тест симулирует нажатие кнопки с тестовыми параметрами (userId: test_user, chatId: test_chat)
      </div>
    </div>
  );
}

