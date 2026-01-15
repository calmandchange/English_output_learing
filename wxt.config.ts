import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: [
      'https://edge.microsoft.com/*',
      'https://api-edge.cognitive.microsofttranslator.com/*'
    ],
    action: {
      default_title: "English Output Learning",
    },
    default_locale: "en",
  },
  dev: {
    server: {
      port: 3000,
    },
  },
});
