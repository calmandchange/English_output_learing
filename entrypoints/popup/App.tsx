import { useState, useEffect } from 'react';
import { getConfig, setConfig, AppConfig, TranslationService } from '@/services/config';
import { getTranslationStats, clearTranslationStats, TranslationStat } from '@/services/stats';
import './App.css';

type TabType = 'settings' | 'history';

function App() {
  const [config, setConfigState] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [stats, setStats] = useState<TranslationStat[]>([]);

  useEffect(() => {
    getConfig().then(setConfigState);
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getTranslationStats();
    setStats(data);
  };

  const handleSave = async () => {
    if (!config) return;
    await setConfig(config);
    setStatus('设置已保存 / Settings Saved');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleClearHistory = async () => {
    if (confirm('确定清空所有翻译记录吗？')) {
      await clearTranslationStats();
      setStats([]);
    }
  };

  if (!config) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <div>
        <img src="/icon/128.png" className="logo" alt="English Output Learning logo" />
      </div>
      <h1>English Output Learning</h1>

      {/* Tab 切换 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ 设置
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); loadStats(); }}
        >
          📖 历史记录
        </button>
      </div>

      {/* 设置面板 */}
      {activeTab === 'settings' && (
        <div className="card settings-card">
          <h2>Translation Settings</h2>

          <div className="form-group">
            <label>Service Provider:</label>
            <select
              value={config.translationService}
              onChange={(e) => setConfigState({ ...config, translationService: e.target.value as TranslationService })}
            >
              <option value="google">Google Translate (Free)</option>
              <option value="deepseek">DeepSeek V3 (API)</option>
              <option value="glm">Zhipu GLM-4 (API)</option>
            </select>
          </div>

          {config.translationService === 'deepseek' && (
            <div className="form-group">
              <label>DeepSeek API Key:</label>
              <input
                type="password"
                value={config.deepseekApiKey}
                onChange={(e) => setConfigState({ ...config, deepseekApiKey: e.target.value })}
                placeholder="sk-..."
              />
              <p className="hint">Get key at platform.deepseek.com</p>
            </div>
          )}

          {config.translationService === 'glm' && (
            <div className="form-group">
              <label>GLM API Key:</label>
              <input
                type="password"
                value={config.glmApiKey}
                onChange={(e) => setConfigState({ ...config, glmApiKey: e.target.value })}
                placeholder="ID.Secret"
              />
              <p className="hint">Get key at open.bigmodel.cn</p>
            </div>
          )}

          {(config.translationService === 'deepseek' || config.translationService === 'glm') && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.aiWritingAssistant}
                  onChange={(e) => setConfigState({ ...config, aiWritingAssistant: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>启用AI写作辅导</span>
              </label>
              <p className="hint">
                开启后，按Tab接受翻译时会检查语法错误并提供更地道的表达建议
              </p>
            </div>
          )}

          <button onClick={handleSave}>Save Settings</button>
          {status && <p className="status">{status}</p>}
        </div>
      )}

      {/* 历史记录面板 */}
      {activeTab === 'history' && (
        <div className="card history-card">
          <div className="history-header">
            <h2>翻译记录</h2>
            {stats.length > 0 && (
              <button className="clear-btn" onClick={handleClearHistory}>清空</button>
            )}
          </div>

          {stats.length === 0 ? (
            <p className="empty-hint">暂无翻译记录</p>
          ) : (
            <ul className="history-list">
              {stats.map((item, index) => (
                <li key={index} className="history-item">
                  <span className="english-text">{item.englishText}</span>
                  <span className="count-badge">{item.count}次</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="footer">
        <p>Ghost Text & Input Learning</p>
      </div>
    </div>
  );
}

export default App;
