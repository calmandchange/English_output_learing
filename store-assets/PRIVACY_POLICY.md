# 隐私政策 | Privacy Policy

**敲敲学英语 (Tap Tap Learn English)**

*最后更新: 2026年1月26日*

---

## 简介
「敲敲学英语」是一款致力于帮助用户通过输出式练习提升英语能力的浏览器扩展。我们严格遵守数据最小化原则，仅收集和使用实现核心功能所必需的数据。

## 数据收集与存储
本扩展采用**本地优先 (Local-First)** 的架构设计，您的绝大多数数据仅存储在您的设备上。

### 1. 本地存储 (Local Storage)
我们使用 `chrome.storage.local` 在您的浏览器本地存储以下数据。这些数据**永远不会**上传到我们的服务器：
- **个人词库**: 您添加的单词、翻译及复习进度。
- **学习统计**: 翻译次数、每日学习量、连续打卡天数。
- **写作错误记录**: 用于生成"学习洞察"的匿名化错误分类数据（如"语法错误"、"拼写错误"）。

### 2. 同步存储 (Sync Storage)
我们使用 `chrome.storage.sync` 存储您的偏好设置（如目标语言、功能开关），以便在您登录同一谷歌账号的不同设备间同步配置。

### 3. 我们不收集的数据
- ❌ **我们没有任何私有服务器**，因此无法收集您的任何个人信息。
- ❌ 我们不收集您的浏览历史或网页访问记录。
- ❌ 我们不收集您的姓名、邮箱或电话等身份信息。

## 数据使用与第三方服务
为了提供翻译和 AI 写作建议功能，您的文本数据可能会根据您的设置发送给以下第三方服务提供商。**这些文本仅用于即时处理，不会被用于训练模型或永久存储。**

### 1. Google Translate API (默认)
- **用途**: 提供基础的单词和句子翻译。
- **隐私**: 请求直接从您的浏览器发送至 Google 服务器。请参阅 [Google 隐私权政策](https://policies.google.com/privacy)。

### 2. DeepSeek API (可选)
- **用途**: 当您配置 API Key 后，用于提供高质量翻译和写作建议。
- **隐私**: 仅在您主动启用并填写 Key 时使用。请参阅 [DeepSeek 隐私政策](https://www.deepseek.com/privacy)。

### 3. Zhipu GLM API (可选)
- **用途**: 当您配置 API Key 后，作为备选的 AI 服务提供商。
- **隐私**: 仅在您主动启用并填写 Key 时使用。请参阅 [智谱 AI 隐私政策](https://open.bigmodel.cn/privacy)。

## 权限说明
为了实现功能，本扩展需要申请以下权限：

| 权限 | 用途 |
|------|------|
| `storage` | 用于在本地保存您的词库、统计数据和偏好设置。 |
| `activeTab` | 仅在您主动触发时（如点击图标或快捷键），访问当前页面的选中文本以进行翻译。 |
| `scripting` | 用于将翻译结果、虚影提示 (Ghost Text) 和写作建议浮窗渲染到当前网页上。 |
| `host_permissions` | 允许扩展直接向上述第三方翻译服务 (Google/DeepSeek/Zhipu) 发送请求。 |

## 数据安全
- 您的 API Key（如 DeepSeek/GLM Key）仅保存在 `chrome.storage.sync` 中，并在发送请求时通过 HTTPS 加密传输，绝不会泄露给我们或第三方。

## 您的权利
您可以随时：
1. **导出或删除数据**: 通过卸载扩展，所有 `chrome.storage.local` 中的数据将被立即从浏览器中清除。
2. **管理权限**: 在浏览器的扩展管理页面随时关闭特定权限。

## 儿童隐私
本扩展不专门面向 13 岁以下儿童，也不会有意收集儿童的个人信息。

## 联系我们
如有任何隐私相关问题，请通过 Chrome 网上应用店的开发者联系方式与我们取得联系。

---

# Privacy Policy (English)

**Tap Tap Learn English**

*Last Updated: January 26, 2026*

---

## Introduction
"Tap Tap Learn English" is a browser extension designed to help users improve their English skills through output-based practice. We adhere to data minimization principles and only collect/use data necessary for core functionality.

## Data Collection & Storage
This extension follows a **Local-First** architecture. Most of your data is stored exclusively on your device.

### 1. Local Storage
We use `chrome.storage.local` to store the following data locally in your browser. This data is **NEVER** uploaded to our servers:
- **Personal Vocabulary**: Words, translations, and review progress you save.
- **Learning Stats**: Translation counts, daily activity, and streaks.
- **Writing Error Logs**: Anonymized error categories used to generate "Learning Insights".

### 2. Sync Storage
We use `chrome.storage.sync` to store your preferences (e.g., target language, feature toggles) to sync configurations across devices logged into the same Google account.

### 3. What We Do NOT Collect
- ❌ **We do not own any private servers**, so we cannot collect any of your personal information.
- ❌ We do not collect your browsing history or web activity logs.
- ❌ We do not collect personally identifiable information (PII) like names, emails, or phone numbers.

## Data Usage & Third-Party Services
To provide translation and AI writing suggestions, your text inputs may be sent to the following third-party service providers based on your settings. **Text is used for immediate processing only and is not used for model training or permanent storage.**

### 1. Google Translate API (Default)
- **Purpose**: Provides basic word and sentence translation.
- **Privacy**: Requests are sent directly from your browser to Google servers. See [Google Privacy Policy](https://policies.google.com/privacy).

### 2. DeepSeek API (Optional)
- **Purpose**: Provides high-quality translation and writing suggestions if configured.
- **Privacy**: Used only if you actively enable it and provide an API Key. See [DeepSeek Privacy Policy](https://www.deepseek.com/privacy).

### 3. Zhipu GLM API (Optional)
- **Purpose**: Alternative AI service provider if configured.
- **Privacy**: Used only if you actively enable it and provide an API Key. See [Zhipu AI Privacy Policy](https://open.bigmodel.cn/privacy).

## Permissions
To function correctly, this extension requests the following permissions:

| Permission | Purpose |
|------------|---------|
| `storage` | To save your vocabulary, stats, and preferences locally. |
| `activeTab` | To access selected text on the current page only when you actively trigger the extension. |
| `scripting` | To render translation results, ghost text, and writing suggestion popups on web pages. |
| `host_permissions` | To allow the extension to send direct requests to the translation services listed above. |

## Data Security
- Your API Keys (e.g., DeepSeek/GLM Keys) are stored only in `chrome.storage.sync` and transmitted via encrypted HTTPS. They are never shared with us or any unauthorized third parties.

## Your Rights
You can at any time:
1. **Delete Data**: Uninstalling the extension will immediately remove all data stored in `chrome.storage.local`.
2. **Manage Permissions**: Revoke specific permissions via the browser's extension management page.

## Children's Privacy
This extension is not directed at children under 13 and does not knowingly collect personal information from children.

## Contact Us
For privacy-related questions, please contact us via the developer contact information on the Chrome Web Store.
