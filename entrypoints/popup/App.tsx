import { useState, useEffect, useRef } from 'react';
import { getConfig, setConfig, AppConfig, TranslationService } from '@/services/config';
import {
  getTranslationStats,
  clearTranslationStats,
  TranslationStat,
  getTodayStats,
  getRecentLearning,
  TodayStats,
  updateStreakDays
} from '@/services/stats';
import { getLearningInsights, LearningInsight } from '@/services/insights';
import { addToVocabulary, getVocabulary, getWordsForReview, PersonalVocabulary, updateMastery, removeFromVocabulary } from '@/services/vocabulary';
import { checkAchievements, getUnlockedAchievements, Achievement } from '@/services/achievements';
import { Onboarding } from '@/components/Onboarding';
// html2canvas 已移除 - 因 CSP 阻止 eval 无法在扩展中使用
import './App.css';

type TabType = 'home' | 'vocabulary' | 'settings' | 'history' | 'help';

// SVG Icons
const Icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  lightbulb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  type: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  zap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  keyboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.001" />
      <path d="M10 8h.001" />
      <path d="M14 8h.001" />
      <path d="M18 8h.001" />
      <path d="M8 12h.001" />
      <path d="M12 12h.001" />
      <path d="M16 12h.001" />
      <line x1="6" y1="16" x2="18" y2="16" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  award: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  )
};

// Tree Growth Stages
const getTreeStage = (words: number) => {
  if (words <= 0) return 'seed';
  if (words < 20) return 'sprout';
  if (words < 50) return 'sapling';
  if (words < 100) return 'growing';
  return 'flourishing';
};

const getStageLabel = (stage: string) => {
  switch (stage) {
    case 'seed': return '知识种子';
    case 'sprout': return '破土嫩芽';
    case 'sapling': return '茁壮树苗';
    case 'growing': return '成长之树';
    case 'flourishing': return '繁茂大树';
    default: return '未知';
  }
};

const GrowthTree = ({ words, customJson }: { words: number, customJson?: string }) => {
  const stage = getTreeStage(words);

  return (
    <div className="tree-container">
      <svg className="tree-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#795548', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#5D4037', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#3E2723', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#66BB6A', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#2E7D32', stopOpacity: 1 }} />
          </linearGradient>
          <radialGradient id="highlight" cx="30%" cy="30%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#FFFFFF', stopOpacity: 0 }} />
          </radialGradient>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground */}
        <path d="M10 110 Q50 115 90 110" stroke="#8B4513" strokeWidth="2" fill="none" opacity="0.3" />
        <path d="M20 112 Q50 118 80 112" stroke="#8B4513" strokeWidth="1" fill="none" opacity="0.2" />

        {/* Seed Stage - High Detail */}
        <g style={{ display: stage === 'seed' ? 'block' : 'none' }}>
          {/* Soil Mound */}
          <path d="M35 110 Q50 102 65 110" fill="#5D4037" opacity="0.8" />
          {/* The Seed */}
          <ellipse cx="50" cy="108" rx="5" ry="3.5" fill="#4E342E" filter="url(#dropShadow)" />
          <path d="M50 108 Q52 106 48 106" stroke="#8D6E63" strokeWidth="0.5" fill="none" />
          {/* Tiny Sprout Tip */}
          <path d="M50 105 L50 100 Q52 98 54 99" stroke="#81C784" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>

        {/* Sprout Stage */}
        <g style={{ display: stage === 'sprout' ? 'block' : 'none' }} className="leaf-pop">
          <path d="M50 110 Q50 100 55 95" stroke="#66BB6A" strokeWidth="2" fill="none" />
          <path d="M55 95 Q 65 90 60 100" fill="url(#leafGrad)" filter="url(#dropShadow)" />
          <path d="M55 95 Q 45 90 50 100" fill="url(#leafGrad)" filter="url(#dropShadow)" />
        </g>

        {/* Sapling Stage */}
        <g style={{ display: stage === 'sapling' ? 'block' : 'none' }}>
          <path d="M50 110 Q50 90 52 80" stroke="url(#trunkGrad)" strokeWidth="3" fill="none" className="trunk-grow" />
          <g className="leaf-pop" style={{ animationDelay: '0.2s' }}>
            <path d="M52 80 Q 70 70 60 90" fill="url(#leafGrad)" filter="url(#dropShadow)" />
            <path d="M52 80 Q 30 70 45 90" fill="url(#leafGrad)" filter="url(#dropShadow)" />
            <path d="M52 75 Q 52 55 52 70" fill="url(#leafGrad)" filter="url(#dropShadow)" />
          </g>
        </g>

        {/* Growing Stage */}
        <g style={{ display: stage === 'growing' ? 'block' : 'none' }}>
          <path d="M50 110 Q48 80 50 60" stroke="url(#trunkGrad)" strokeWidth="4" fill="none" className="trunk-grow" />
          <g className="leaf-pop" style={{ animationDelay: '0.3s' }}>
            <circle cx="50" cy="50" r="18" fill="url(#leafGrad)" opacity="0.9" filter="url(#dropShadow)" />
            <circle cx="35" cy="65" r="14" fill="url(#leafGrad)" opacity="0.9" filter="url(#dropShadow)" />
            <circle cx="65" cy="65" r="14" fill="url(#leafGrad)" opacity="0.9" filter="url(#dropShadow)" />
            <circle cx="50" cy="75" r="14" fill="url(#leafGrad)" opacity="0.8" />
            <circle cx="45" cy="55" r="8" fill="url(#highlight)" />
          </g>
        </g>

        {/* Flourishing Stage */}
        <g style={{ display: stage === 'flourishing' ? 'block' : 'none' }}>
          <path d="M50 110 Q48 70 50 50" stroke="url(#trunkGrad)" strokeWidth="6" fill="none" className="trunk-grow" />
          <g className="leaf-pop" style={{ animationDelay: '0.4s' }}>
            <circle cx="50" cy="40" r="25" fill="url(#leafGrad)" filter="url(#dropShadow)" />
            <circle cx="25" cy="60" r="20" fill="url(#leafGrad)" filter="url(#dropShadow)" />
            <circle cx="75" cy="60" r="20" fill="url(#leafGrad)" filter="url(#dropShadow)" />
            <circle cx="50" cy="70" r="20" fill="url(#leafGrad)" filter="url(#dropShadow)" />
            <circle cx="30" cy="80" r="15" fill="url(#leafGrad)" />
            <circle cx="70" cy="80" r="15" fill="url(#leafGrad)" />

            {/* Highlights */}
            <circle cx="40" cy="35" r="10" fill="url(#highlight)" />

            {/* Fruits */}
            <circle cx="40" cy="50" r="3.5" fill="#E53935" filter="url(#dropShadow)" />
            <circle cx="60" cy="45" r="3.5" fill="#E53935" filter="url(#dropShadow)" />
            <circle cx="50" cy="65" r="3.5" fill="#E53935" filter="url(#dropShadow)" />
            <circle cx="25" cy="65" r="3" fill="#E53935" filter="url(#dropShadow)" />
            <circle cx="75" cy="65" r="3" fill="#E53935" filter="url(#dropShadow)" />
          </g>
        </g>
      </svg>
    </div>
  );
};

// Share Card Component for Screenshot
const ShareCard = ({ stats, treeStage, customJson }: { stats: TodayStats, treeStage: string, customJson?: string }) => {
  return (
    <div id="share-card-element" className="screenshot-container">
      <div className="screenshot-header">
        <img src="/icon.png" style={{ width: '48px', height: '48px', borderRadius: '8px' }} />
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>敲敲学英语</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>今日学习打卡</div>
        </div>
      </div>

      <div className="screenshot-tree">
        <GrowthTree words={stats.totalWords} customJson={customJson} />
      </div>

      <div className="screenshot-stats">
        <div className="screenshot-stat-item">
          <div className="screenshot-val">{stats.totalWords}</div>
          <div className="screenshot-lbl">今日单词</div>
        </div>
        <div className="screenshot-stat-item">
          <div className="screenshot-val">{stats.streakDays}</div>
          <div className="screenshot-lbl">连续天数</div>
        </div>
      </div>

      <div className="screenshot-footer">
        {new Date().toLocaleDateString()} • {getStageLabel(treeStage)}
      </div>
    </div>
  );
};

function App() {
  const [config, setConfigState] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [stats, setStats] = useState<TranslationStat[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats>({ totalTranslations: 0, newWords: 0, streakDays: 0, totalWords: 0 });
  const [recentLearning, setRecentLearning] = useState<TranslationStat[]>([]);
  const [insight, setInsight] = useState<LearningInsight | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // IKEA 效应 - 词库和成就
  const [vocabulary, setVocabulary] = useState<PersonalVocabulary[]>([]);
  const [reviewWords, setReviewWords] = useState<PersonalVocabulary[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [favStatus, setFavStatus] = useState<Record<string, 'idle' | 'added' | 'exists'>>({});

  useEffect(() => {
    getConfig().then((cfg) => {
      setConfigState(cfg);
      // 首次使用时显示引导
      if (!cfg.onboardingCompleted) {
        setShowOnboarding(true);
      }
    });
    loadData();
    updateStreakDays(); // Check streak on load
  }, []);

  const loadData = async () => {
    const [statsData, todayData, recentData, insightData, vocabData, reviewData, achievementsData] = await Promise.all([
      getTranslationStats(),
      getTodayStats(),
      getRecentLearning(5),
      getLearningInsights(),
      getVocabulary(),
      getWordsForReview(),
      getUnlockedAchievements(),
    ]);
    setStats(statsData);
    setTodayStats(todayData);
    setRecentLearning(recentData);
    setInsight(insightData);
    setVocabulary(vocabData);
    setReviewWords(reviewData);
    setAchievements(achievementsData);
    // 检查新成就
    checkAchievements();
  };

  const handleSave = async () => {
    if (!config) return;
    await setConfig(config);
    setStatus('设置已保存');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleClearHistory = async () => {
    if (confirm('确定清空所有翻译记录吗？')) {
      await clearTranslationStats();
      setStats([]);
      setTodayStats({ totalTranslations: 0, newWords: 0, streakDays: 0, totalWords: 0 });
      setRecentLearning([]);
    }
  };

  const handleAddToVocab = async (english: string, chinese: string) => {
    const success = await addToVocabulary(english, chinese);
    if (success) {
      setFavStatus(prev => ({ ...prev, [english]: 'added' }));
      setTimeout(() => setFavStatus(prev => ({ ...prev, [english]: 'exists' })), 2000);

      // 刷新词库数据
      const [vocabData, reviewData] = await Promise.all([getVocabulary(), getWordsForReview()]);
      setVocabulary(vocabData);
      setReviewWords(reviewData);

      // 检查成就
      checkAchievements().then(newItems => {
        if (newItems.length > 0) {
          setAchievements(prev => [...prev, ...newItems]);
          alert(`解锁新成就：${newItems.map(a => a.name).join(', ')}`);
        }
      });
    } else {
      setFavStatus(prev => ({ ...prev, [english]: 'exists' }));
    }
  };

  const handleRemoveFromVocab = async (word: string) => {
    if (confirm(`确定要从生词本移除 "${word}" 吗？`)) {
      await removeFromVocabulary(word);
      const vocabData = await getVocabulary();
      setVocabulary(vocabData);
      setReviewWords(await getWordsForReview());
      setFavStatus(prev => {
        const next = { ...prev };
        delete next[word];
        return next;
      });
    }
  };

  const handleUpdateMastery = async (word: string, currentMastery: number) => {
    const newMastery = Math.min(currentMastery + 1, 3) as 0 | 1 | 2 | 3;
    await updateMastery(word, newMastery);
    setVocabulary(await getVocabulary());
    setReviewWords(await getWordsForReview());

    // 检查成就
    checkAchievements().then(newItems => {
      if (newItems.length > 0) setAchievements(prev => [...prev, ...newItems]);
    });
  };

  const handleShare = async () => {
    // 由于 Chrome 扩展 CSP 限制，html2canvas 无法使用
    // 改为复制学习数据到剪贴板
    const shareText = `📚 敲敲学英语 学习打卡\n\n🌱 今日单词: ${todayStats.totalWords}\n📖 翻译次数: ${todayStats.totalTranslations}\n🔥 连续天数: ${todayStats.streakDays}\n⭐ 掌握词汇: ${vocabulary.filter(v => v.mastery === 3).length}\n\n📅 ${new Date().toLocaleDateString()}`;

    try {
      await navigator.clipboard.writeText(shareText);
      alert('学习数据已复制到剪贴板！可粘贴分享给好友');
    } catch (err) {
      console.error('Copy failed:', err);
      alert('复制失败，请重试');
    }
  };

  // 完成引导回调
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    getConfig().then(setConfigState); // 重新加载配置
  };

  if (!config) return <div className="loading">Loading...</div>;

  // 显示首次使用引导
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const currentStage = getTreeStage(todayStats.totalWords || 0);

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <img src="/icon.png" className="logo" alt="敲敲学英语" />
        <span className="header-title">敲敲学英语</span>
        {activeTab === 'home' && (
          <button className="share-btn" onClick={handleShare} aria-label="生成学习海报" title="点击生成学习打卡海报">
            {Icons.camera}
          </button>
        )}
      </div>

      {/* Hidden Share Card */}
      <ShareCard stats={todayStats} treeStage={currentStage} customJson={config.customAnimationJson} />

      {/* Home Tab - Today's Learning Overview */}
      {activeTab === 'home' && (
        <>
          {/* Growth Tree Section */}
          <div className="growth-section">
            <div className="growth-bg-glow"></div>
            <div className="growth-content">
              <div className="growth-title">今日单词量</div>
              <div className="growth-value">
                {todayStats.totalWords || 0}<span>words</span>
              </div>
              <GrowthTree words={todayStats.totalWords || 0} customJson={config.customAnimationJson} />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="section-title">
            {Icons.target}
            <span>今日数据</span>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value primary">{todayStats.totalTranslations}</div>
              <div className="stat-label">翻译次数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value success">{todayStats.streakDays}</div>
              <div className="stat-label">连续天数</div>
            </div>
          </div>

          {/* Recent Learning */}
          <div className="section-title">
            {Icons.book}
            <span>最近学习</span>
          </div>
          <div className="recent-card">
            {recentLearning.length === 0 ? (
              <div className="empty-state">
                {Icons.inbox}
                <p>开始输入中文，按空格翻译</p>
              </div>
            ) : (
              <ul className="recent-list">
                {recentLearning.map((item, index) => (
                  <li key={index} className="recent-item">
                    <div className="recent-content">
                      <div className="recent-english">{item.englishText}</div>
                      <div className="recent-chinese">{item.chineseText}</div>
                    </div>
                    <div className="recent-actions">
                      <span className="recent-count">{item.count}次</span>
                      <button
                        className={`fav-btn ${favStatus[item.englishText] === 'added' ? 'added' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToVocab(item.englishText, item.chineseText);
                        }}
                        title={favStatus[item.englishText] === 'exists' ? '已在词库中' : '添加到词库'}
                        disabled={favStatus[item.englishText] === 'exists'}
                      >
                        {favStatus[item.englishText] === 'exists' ? Icons.check : Icons.star}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Learning Insights */}
          {insight && insight.commonMistakes.length > 0 && (
            <>
              <div className="section-title">
                {Icons.lightbulb}
                <span>学习洞察</span>
              </div>
              <div className="insight-card">
                <div className="insight-header">
                  <span className="insight-icon">📈</span>
                  <span className="insight-title">本周重点</span>
                </div>
                <div className="insight-content">
                  <div className="insight-mistake">
                    <span className="mistake-label">常见问题：</span>
                    <span className="mistake-category">{insight.commonMistakes[0].category}</span>
                    <span className="mistake-count">({insight.commonMistakes[0].count}次)</span>
                  </div>
                  {insight.commonMistakes[0].examples.length > 0 && (
                    <div className="insight-examples">
                      {insight.commonMistakes[0].examples.slice(0, 2).map((example, i) => (
                        <div key={i} className="example-item">{example}</div>
                      ))}
                    </div>
                  )}
                  <div className="insight-recommendation">
                    💡 {insight.commonMistakes[0].suggestion}
                  </div>
                </div>
                <div className="insight-trend">
                  <span className="trend-label">词汇趋势：</span>
                  <span className={`trend-value ${insight.vocabularyGrowth.trend}`}>
                    {insight.vocabularyGrowth.trend === 'up' ? '📈 上升' :
                      insight.vocabularyGrowth.trend === 'down' ? '📉 下降' : '➡️ 稳定'}
                  </span>
                  <span className="trend-detail">
                    本周 {insight.vocabularyGrowth.thisWeek} 词
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Review Card */}
          {reviewWords.length > 0 && (
            <>
              <div className="section-title">
                {Icons.book}
                <span>今日复习 ({reviewWords.length})</span>
              </div>
              <div className="review-card">
                {reviewWords.slice(0, 10).map((word, index) => (
                  <div key={index} className="review-item">
                    <div className="review-word">
                      <span className="word-text">{word.word}</span>
                      <span className="word-trans">{word.translation}</span>
                    </div>
                    <button
                      className="review-btn"
                      onClick={() => handleUpdateMastery(word.word, word.mastery)}
                      title="标记为已复习"
                    >
                      {Icons.check}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="achievements-section">
              <div className="section-title">
                {Icons.award}
                <span>成就 ({achievements.length})</span>
              </div>
              <div className="achievement-badges">
                {achievements.map(a => (
                  <div key={a.id} className="achievement-badge" title={a.description}>
                    <span className="badge-icon">{a.icon}</span>
                    <span className="badge-name">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}


        </>
      )}

      {/* Vocabulary Tab */}
      {activeTab === 'vocabulary' && (
        <div className="card vocabulary-card">
          <div className="vocab-header">
            <h2>我的词库 ({vocabulary.length})</h2>
            <div className="vocab-stats">
              <span className="stat-pill mastered">掌握: {vocabulary.filter(v => v.mastery === 3).length}</span>
              <span className="stat-pill learning">学习中: {vocabulary.filter(v => v.mastery < 3).length}</span>
            </div>
          </div>

          {vocabulary.length === 0 ? (
            <div className="empty-state">
              {Icons.star}
              <p>还没收藏单词呢<br />去翻译几个试试吧</p>
            </div>
          ) : (
            <ul className="vocab-list">
              {vocabulary.map((item, index) => (
                <li key={index} className="vocab-item">
                  <div className="vocab-main">
                    <div className="vocab-word">{item.word}</div>
                    <div className="vocab-trans">{item.translation}</div>
                  </div>
                  <div className="vocab-meta">
                    <div className="mastery-indicator">
                      {[0, 1, 2].map(level => (
                        <div
                          key={level}
                          className={`mastery-dot ${item.mastery > level ? 'active' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleRemoveFromVocab(item.word)}
                  >
                    {Icons.trash}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card settings-card">
          <h2>翻译设置</h2>

          <div className="form-group">
            <label>翻译服务</label>
            <select
              value={config.translationService}
              onChange={(e) => setConfigState({ ...config, translationService: e.target.value as TranslationService })}
            >
              <option value="google">Google Translate (免费)</option>
              <option value="deepseek">DeepSeek V3 (API)</option>
              <option value="glm">Zhipu GLM-4 (API)</option>
            </select>
          </div>

          {config.translationService === 'deepseek' && (
            <div className="form-group">
              <label>DeepSeek API Key</label>
              <input
                type="password"
                value={config.deepseekApiKey}
                onChange={(e) => setConfigState({ ...config, deepseekApiKey: e.target.value })}
                placeholder="sk-..."
              />
              <p className="hint">获取 API Key: platform.deepseek.com</p>
            </div>
          )}

          {config.translationService === 'glm' && (
            <div className="form-group">
              <label>GLM API Key</label>
              <input
                type="password"
                value={config.glmApiKey}
                onChange={(e) => setConfigState({ ...config, glmApiKey: e.target.value })}
                placeholder="ID.Secret"
              />
              <p className="hint">获取 API Key: open.bigmodel.cn</p>
            </div>
          )}

          {(config.translationService === 'deepseek' || config.translationService === 'glm') && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.aiWritingAssistant}
                  onChange={(e) => setConfigState({ ...config, aiWritingAssistant: e.target.checked })}
                />
                <span>启用AI写作辅导</span>
              </label>
              <p className="hint">
                开启后，按Tab接受翻译时会检查语法并提供更地道的表达建议
              </p>
            </div>
          )}

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.tabAcceptsGhostText}
                onChange={(e) => setConfigState({ ...config, tabAcceptsGhostText: e.target.checked })}
              />
              <span>启用 Tab 键补全虚字</span>
            </label>
            <p className="hint">
              开启后，有虚字时按 Tab 键可直接接受补全。默认关闭以鼓励手动输入记忆。
            </p>
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.05)' }} />

          <div className="form-group">
            <label>自定义成长动画 (Lottie JSON)</label>
            <textarea
              value={config.customAnimationJson || ''}
              onChange={(e) => setConfigState({ ...config, customAnimationJson: e.target.value })}
              placeholder="粘贴 Lottie JSON 内容..."
              style={{
                width: '100%',
                height: '80px',
                padding: '0.625rem',
                borderRadius: '8px',
                background: 'var(--bg-dark)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-dark)',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                resize: 'vertical'
              }}
            />
            <p className="hint">
              去 <a href="#" onClick={() => browser.tabs.create({ url: 'https://lottiefiles.com/search?q=tree+growth&category=animations' })}>LottieFiles</a> 下载 JSON，用记事本打开复制内容粘贴到此处。
              <br />不填则使用默认动画。
            </p>
          </div>

          <button onClick={handleSave}>保存设置</button>
          {status && <p className="status">{status}</p>}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card history-card">
          <div className="history-header">
            <h2>翻译记录</h2>
            {stats.length > 0 && (
              <button className="clear-btn btn-danger" onClick={handleClearHistory}>清空</button>
            )}
          </div>

          {stats.length === 0 ? (
            <div className="empty-state">
              {Icons.inbox}
              <p>暂无翻译记录</p>
            </div>
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

      {/* Help Tab */}
      {activeTab === 'help' && (
        <div className="card help-card">
          <h2>使用帮助</h2>

          <div className="help-section">
            <h3>{Icons.keyboard} 整句翻译</h3>
            <p>
              在任意输入框输入中文，<strong>连按 3 次空格键</strong>触发整句翻译。
              翻译结果以<strong>虚字（Ghost Text）</strong>形式显示在光标后。
            </p>
          </div>

          <div className="help-section">
            <h3>{Icons.zap} 单词翻译</h3>
            <p>
              输入英文时忘记某个单词？在该位置输入中文，按 <code>Ctrl + 空格</code> 即可只翻译这个词。
            </p>
          </div>

          <div className="help-section">
            <h3>{Icons.type} 接受翻译</h3>
            <p>
              默认需要逐字手打虚字以加深记忆。
              你也可以在设置中开启 <code>Tab</code> 键一键接受功能。
            </p>
          </div>

          <div className="help-section">
            <h3>{Icons.lightbulb} AI 写作辅导</h3>
            <p>
              <strong>前提条件：</strong>
            </p>
            <p>
              1. 在设置中选择 AI 翻译服务（DeepSeek / GLM）<br />
              2. 启用"AI 写作辅导"选项<br />
              3. <strong>有虚字显示时</strong>按 <code>Tab</code> 接受
            </p>
            <p>
              AI 会检查你的输入并提供更地道的表达建议。<strong>无虚字时按 Tab 不会触发辅导。</strong>
            </p>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button
          className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => { setActiveTab('home'); loadData(); }}
          aria-label="首页"
        >
          {Icons.home}
          <span>首页</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'vocabulary' ? 'active' : ''}`}
          onClick={() => { setActiveTab('vocabulary'); loadData(); }}
          aria-label="词库"
        >
          {Icons.star}
          <span>词库</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          aria-label="设置"
        >
          {Icons.settings}
          <span>设置</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); loadData(); }}
          aria-label="记录"
        >
          {Icons.history}
          <span>记录</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'help' ? 'active' : ''}`}
          onClick={() => setActiveTab('help')}
          aria-label="帮助"
        >
          {Icons.help}
          <span>帮助</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
