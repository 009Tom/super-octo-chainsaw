// main.js - 应用入口
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 路由配置
import './assets/main.css' // 全局样式（Tailwind + 动效工具类 + Markdown 样式）
import reveal from './directives/reveal' // 滚动进场动画指令

// 没有使用 Pinia：笔记数据量小、组件间共享简单，
// 直接用 localStorage 工具模块（src/utils/storage.js）即可满足需求。
// 如果将来状态变复杂，可以在此处 app.use(createPinia()) 平滑升级。

const app = createApp(App)

// 注册全局指令 v-reveal：元素滚动进入视口时淡入上浮（可传数字做错峰延迟）
app.directive('reveal', reveal)

app.use(router) // 注册路由

app.mount('#app') // 挂载到 index.html 中的 <div id="app">
