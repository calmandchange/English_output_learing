import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: [
      'https://translate.googleapis.com/*',
      'https://api.deepseek.com/*',
      'https://open.bigmodel.cn/*'
    ],
    action: {
      default_title: "敲敲学英语",
      default_icon: {
        16: "/icon.png",
        32: "/icon.png",
        48: "/icon.png",
        128: "/icon.png"
      }
    },
    icons: {
      16: "/icon.png",
      32: "/icon.png",
      48: "/icon.png",
      128: "/icon.png"
    },
    default_locale: "zh_CN",
  },
  dev: {
    server: {
      port: 3000,
    },
  },
});
