# Chrome 插件商店上架指南 (WXT 版)

本文档根据当前项目架构 (WXT + React + TypeScript) 为你总结上架流程与注意事项。

## 1. 准备工作 (Preparation)

在上传代码之前，你需要准备以下素材。**这一步最耗时，建议优先准备。**

### 1.1 隐私政策 (Privacy Policy)
*   **必需**: 现在的 Chrome 商店强制要求提供隐私政策 URL。
*   **内容**: 必须明确说明你收集了什么数据（本项目主要涉及用户划词内容），以及如何使用（仅用于调用翻译接口，不存储/不出售）。
*   **建议**: 如果没有网站，可以使用 [Notion](https://www.notion.so/) 或 GitHub Gist 创建一个公开页面。或使用免费生成器如 [GetTerms](https://getterms.io/)。

### 1.2 视觉素材 (Store Assets)
商店展示需要专门的图片，不能直接用截图工具。
*   **应用图标**: 
    *   需要一个 `128x128` 像素的 PNG 图标（在商店列表显示）。
    *   WXT 会自动处理 Manifest 中的图标，但**商店上传**需要单独的 128px 文件。
*   **应用截图**:
    *   尺寸: **1280x800** 像素 (或 640x400)。
    *   数量: 至少 1 张，建议 3-5 张展示核心功能（划词翻译、AI 建议、设置页）。
*   **宣传图 (Tile)**:
    *   尺寸: **440x280** 像素。
    *   用于商店首页推荐位，设计要精美。

## 2. 构建发布包 (Build & Package)

WXT 框架极大地简化了构建流程，它会自动处理 Manifest V3 的合规性问题。

### 2.1 运行构建命令
在项目根目录运行终端：

```bash
npm run zip
```
或
```bash
npx wxt zip
```

### 2.2 检查产物
构建完成后，WXT 会在 `.output/` 目录下生成一个 `.zip` 文件（例如 `English_Output_Learning-0.0.0-firefox.zip` 或类似名称，Chrome 版通常不带后缀或是 `chrome.zip`）。
*   **注意**: 确保上传的是 `npm run zip` 生成的包，**不要**手动压缩文件夹。WXT 的 zip 命令会自动排除 `node_modules` 等无关文件，并进行生产环境混淆。

## 3. 商店填写与提审 (Submission)

1.  登录 [Chrome Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard).
2.  点击 **"New Item"** (新建项目)，上传刚才生成的 `.zip` 包。

### 3.1 隐私与权限说明 (Privacy tab) - **关键步骤**
Manifest V3 对权限审核非常严格，需要在 "Privacy" 标签页逐一解释：

| 权限 (Permission) | 解释填写建议 (Justification) |
| :--- | :--- |
| **ActiveTab** | "Used to access the user's selected text on the current page for translation only when the user interacts with the extension." (仅在用户交互时获取当前页面选中文本进行翻译) |
| **Scripting** | "Used to visualize the translation results and ghost text overlay on the webpage." (用于在网页上渲染翻译结果和虚影效果) |
| **Storage** | "Used to save user preferences, such as translation target language and display settings." (仅用于保存用户偏好设置，如目标语言) |
| **Host Permission**<br>(`*.microsofttranslator.com`) | "Required to communicate with the Bing Translator API to provide translation services." (用于连接必应翻译 API 提供翻译服务) |

**关于远程代码 (Remote Code)**:
*   WXT 默认将所有依赖打包进扩展，符合 "No Remote Code" 规定。
*   勾选 "No, my extension does not use remote code"。

## 4. 常见拒审原因与避坑 (Common Pitfalls)

### 4.1 单一用途 (Single Purpose)
*   **风险**: 描述写得太泛（例如 "一个好用的工具箱"）。
*   **对策**: 描述必须聚焦。
    *   ✅ "An AI-powered tool for learning English through contextual translation and writing suggestions."
    *   ❌ "A tool to translate, check weather, and play games."

### 4.2 权限最小化 (Least Privilege)
*   **检查**: 确保 `wxt.config.ts` 中没有包含未使用的权限。当前配置看起来是合理的 (`storage`, `activeTab`, `scripting`)。

### 4.3 虚假宣传与关键词堆砌
*   **注意**: 不要在描述中堆砌关键词（如 "Free, Best, Top 1"），也不要提及无关品牌。

### 4.4 核心功能无法测试
*   **对策**: 如果你的插件需要登录才能用，必须在提交备注中提供**测试账号**。本项目看似无需登录，则无需提供。

## 5. 后续维护
*   **审核时间**: 首次审核通常需要 **1-3 个工作日**，偶尔可能长达 1-2 周。
*   **版本更新**: 只是修复 Bug 的小版本更新通常审核较快。

祝上架顺利！🚀
