// postcss.config.js - PostCSS 配置（Tailwind 需要通过它接入 Vite）
export default {
  plugins: {
    tailwindcss: {},  // Tailwind CSS 插件
    autoprefixer: {}  // 自动添加浏览器前缀
  }
}
