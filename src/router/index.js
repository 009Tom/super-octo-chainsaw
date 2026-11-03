// router/index.js - Vue Router 路由配置
// 每个页面对应一个路由；使用懒加载（import()）可以让打包体积更小、首屏更快
import { createRouter, createWebHistory } from 'vue-router'

// 路由表：path -> 页面组件
const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/notes',
    name: 'notes',
    component: () => import('../views/NotesView.vue'),
    meta: { title: '笔记列表' }
  },
  {
    // 动态路由参数：/notes/xxx 中的 xxx 是笔记 id
    path: '/notes/:id',
    name: 'note-detail',
    component: () => import('../views/NoteDetailView.vue'),
    meta: { title: '笔记详情' }
  },
  // ===== 写笔记 / 发布中心：只在本机开发环境注册，线上构建里不存在 =====
  // 为什么按构建环境剥离，而不是只在界面上藏掉入口：
  // 1) 这两个页面依赖本机 localStorage 里的草稿，线上打开永远是空列表，
  //    对作者没用，却会把后台发布流程整个展示给访客。
  // 2) import.meta.env.DEV 会被 Vite 打包时替换成 false，这个三元表达式随即被
  //    死代码消除，WriteView / PublishView 连 chunk 都不会生成。访客访问
  //    /write 或 /publish 会命中下面的兜底规则，静默回到首页。
  // 3) 这里必须直接写 import.meta.env.DEV，不要改成从 utils/authorMode 导入的
  //    CAN_EDIT：跨模块常量 Rollup 不保证能折叠，chunk 可能就剔不掉了。
  ...(import.meta.env.DEV
    ? [
        {
          path: '/write',
          name: 'write',
          component: () => import('../views/WriteView.vue'),
          meta: { title: '写笔记' }
        },
        {
          // 发布中心：把本地草稿导出成文件，上传到 GitHub 仓库当伪后台
          path: '/publish',
          name: 'publish',
          component: () => import('../views/PublishView.vue'),
          meta: { title: '发布中心' }
        }
      ]
    : []),
  {
    // AI 学习助手（DeepSeek 对话）
    path: '/chat',
    name: 'chat',
    component: () => import('../views/ChatView.vue'),
    meta: { title: 'AI 助手' }
  },
  {
    // 开发者工具箱（原“关于我”页，已换成程序员常用网站/工具导航）
    path: '/tools',
    name: 'tools',
    component: () => import('../views/ToolsView.vue'),
    meta: { title: '开发者工具箱' }
  },
  {
    // 旧地址兼容：/about 重定向到工具箱
    path: '/about',
    redirect: '/tools'
  },
  {
    // 兜底：访问不存在的地址时回到首页
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  // HTML5 history 模式，URL 更干净（没有 # 号）
  history: createWebHistory(),
  routes,
  // 每次切换路由时滚动到页面顶部
  scrollBehavior() {
    return { top: 0 }
  }
})

// 全局前置守卫：动态修改浏览器标签页标题
router.beforeEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} | 源码印记`
    : '源码印记'
})

export default router
