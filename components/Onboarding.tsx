import { useState } from 'react';
import { setConfig, TranslationService } from '@/services/config';

interface OnboardingProps {
    onComplete: () => void;
}

/**
 * 首次使用引导组件
 * 三步式引导：欢迎 → 选择服务 → 完成
 */
export const Onboarding = ({ onComplete }: OnboardingProps) => {
    const [step, setStep] = useState(1);
    const [selectedService, setSelectedService] = useState<TranslationService>('google');

    const handleComplete = async () => {
        // 保存用户选择的翻译服务和完成引导状态
        await setConfig({
            translationService: selectedService,
            onboardingCompleted: true
        });
        onComplete();
    };

    return (
        <div className="onboarding-container">
            {/* 步骤指示器 */}
            <div className="onboarding-stepper">
                {[1, 2, 3].map((s) => (
                    <div key={s} className={`step-dot ${step >= s ? 'active' : ''}`} />
                ))}
            </div>

            {/* Step 1: 欢迎页面 */}
            {step === 1 && (
                <div className="onboarding-step fade-in">
                    <div className="onboarding-icon">👋</div>
                    <h2 className="onboarding-title">欢迎使用 敲敲学英语!</h2>
                    <p className="onboarding-desc">
                        让英语输出变得更自然、更高效。<br />
                        只需 30 秒完成设置。
                    </p>
                    <button className="onboarding-btn primary" onClick={() => setStep(2)}>
                        开始设置
                    </button>
                </div>
            )}

            {/* Step 2: 选择翻译服务 */}
            {step === 2 && (
                <div className="onboarding-step fade-in">
                    <div className="onboarding-icon">🌐</div>
                    <h2 className="onboarding-title">选择翻译服务</h2>
                    <p className="onboarding-desc">推荐先试用免费的 Google 翻译</p>

                    <div className="service-options">
                        <label className={`service-option ${selectedService === 'google' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="service"
                                value="google"
                                checked={selectedService === 'google'}
                                onChange={() => setSelectedService('google')}
                            />
                            <div className="service-info">
                                <span className="service-name">Google Translate</span>
                                <span className="service-tag free">免费</span>
                            </div>
                        </label>

                        <label className={`service-option ${selectedService === 'deepseek' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="service"
                                value="deepseek"
                                checked={selectedService === 'deepseek'}
                                onChange={() => setSelectedService('deepseek')}
                            />
                            <div className="service-info">
                                <span className="service-name">DeepSeek V3</span>
                                <span className="service-tag api">需要 API Key</span>
                            </div>
                        </label>

                        <label className={`service-option ${selectedService === 'glm' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="service"
                                value="glm"
                                checked={selectedService === 'glm'}
                                onChange={() => setSelectedService('glm')}
                            />
                            <div className="service-info">
                                <span className="service-name">智谱 GLM-4</span>
                                <span className="service-tag api">需要 API Key</span>
                            </div>
                        </label>
                    </div>

                    <div className="onboarding-actions">
                        <button className="onboarding-btn secondary" onClick={() => setStep(1)}>
                            返回
                        </button>
                        <button className="onboarding-btn primary" onClick={() => setStep(3)}>
                            下一步
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: 完成设置 + 功能演示 */}
            {step === 3 && (
                <div className="onboarding-step fade-in">
                    <div className="onboarding-icon">🎉</div>
                    <h2 className="onboarding-title">设置完成！</h2>

                    <div className="quick-demo">
                        <h3 className="demo-title">📚 核心功能</h3>
                        <div className="demo-item">
                            <code>中文 + Tab</code>
                            <span>触发翻译</span>
                        </div>
                        <div className="demo-item">
                            <code>英文 + Tab</code>
                            <span>AI 写作辅导</span>
                        </div>
                        <div className="demo-item">
                            <code>Tab</code>
                            <span>接受建议 / 补全</span>
                        </div>
                    </div>

                    <div className="onboarding-actions">
                        <button className="onboarding-btn secondary" onClick={() => setStep(2)}>
                            返回
                        </button>
                        <button className="onboarding-btn primary" onClick={handleComplete}>
                            开始学习 🚀
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Onboarding;
