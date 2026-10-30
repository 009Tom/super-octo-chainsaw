// vite.config.js - Vite 构建配置
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173, // 开发服务器端口
    open: true, // 启动后自动打开浏览器
    proxy: {
      // DeepSeek API 代理：浏览器请求 /api/deepseek/* 时，
      // 由本地开发服务器转发到 https://api.deepseek.com/*，规避跨域限制
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, '')
      }
    }
  },
  // npm run preview（预览打包产物）时用同一份代理配置
  preview: {
    proxy: {
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, '')
      }
    }
  }
})
