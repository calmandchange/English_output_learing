import { useState, useEffect } from 'react';
import { getConfig, setConfig, AppConfig, TranslationService } from '@/services/config';
import './App.css';

function App() {
  const [config, setConfigState] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    getConfig().then(setConfigState);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    await setConfig(config);
    setStatus('设置已保存 / Settings Saved');
    setTimeout(() => setStatus(''), 2000);
  };

  if (!config) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <div>
        <img src="/icon/128.png" className="logo" alt="English Output Learning logo" />
      </div>
      <h1>English Output Learning</h1>

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

        <button onClick={handleSave}>Save Settings</button>
        {status && <p className="status">{status}</p>}
      </div>

      <div className="footer">
        <p>Ghost Text & Input Learning</p>
      </div>
    </div>
  );
}

export default App;
