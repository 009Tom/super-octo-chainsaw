// data/tools.js - 开发者工具箱清单（工具箱页面与首页统计共用一份数据）
// 每项：name 名称 / url 地址 / icon 图标 / cat 分类 / desc 一句话用途
export const TOOLS = [
  // ===== 文档手册 =====
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/zh-CN/', icon: '📘', cat: '文档手册', desc: 'HTML/CSS/JS 权威说明书，前端查 API 的第一站' },
  { name: 'Vue 3 官方文档', url: 'https://cn.vuejs.org/', icon: '💚', cat: '文档手册', desc: '本站所用的框架文档，中文翻译质量很高' },
  { name: 'Vite 指南', url: 'https://cn.vitejs.dev/', icon: '⚡', cat: '文档手册', desc: '构建工具官方文档，配置项与插件生态说明' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com/docs', icon: '🎯', cat: '文档手册', desc: '原子类速查表，所有工具类都能搜到' },
  { name: 'Can I use', url: 'https://caniuse.com/', icon: '🌐', cat: '文档手册', desc: '查浏览器兼容性，决定能不能放心用新特性' },
  { name: 'DevDocs', url: 'https://devdocs.io/', icon: '🗂️', cat: '文档手册', desc: '几十种语言/框架文档聚合在一个页面，可离线搜索' },
  { name: 'TypeScript 手册', url: 'https://www.typescriptlang.org/zh/docs/', icon: '🔷', cat: '文档手册', desc: 'TS 类型系统入门与进阶，自带 Playground 试玩' },
  { name: '阮一峰 ES6 教程', url: 'https://es6.ruanyifeng.com/', icon: '📖', cat: '文档手册', desc: '中文 ECMAScript 新版语法讲解，例子克制清晰' },

  // ===== 在线运行 =====
  { name: 'Vue Playground', url: 'https://play.vuejs.org/', icon: '🧪', cat: '在线运行', desc: '浏览器里直接写 Vue 组件并实时预览，无需装环境' },
  { name: 'CodePen', url: 'https://codepen.io/', icon: '🖊️', cat: '在线运行', desc: 'HTML/CSS/JS 在线 Demo 社区，找动效灵感首选' },
  { name: 'StackBlitz', url: 'https://stackblitz.com/', icon: '🚀', cat: '在线运行', desc: '浏览器里跑完整的 Node/Vue/React 项目，秒开' },
  { name: 'CodeSandbox', url: 'https://codesandbox.io/', icon: '📦', cat: '在线运行', desc: '在线全栈开发环境，适合分享可复现的最小例子' },
  { name: 'Excalidraw', url: 'https://excalidraw.com/', icon: '✏️', cat: '在线运行', desc: '手绘风格白板，画架构图和流程图特别顺手' },

  // ===== 效率工具 =====
  { name: 'Regex101', url: 'https://regex101.com/', icon: '🔣', cat: '效率工具', desc: '正则实时调试，会逐段解释匹配过程（支持 JS 引擎）' },
  { name: 'JSON.cn 解析', url: 'https://www.json.cn/', icon: '🧾', cat: '效率工具', desc: 'JSON 格式化 / 校验 / 压缩，中文界面' },
  { name: '工具楼 tool.lu', url: 'https://tool.lu/', icon: '🧮', cat: '效率工具', desc: '时间戳、Base64、URL、UUID 等日常转换合集' },
  { name: 'Squoosh', url: 'https://squoosh.app/', icon: '🖼️', cat: '效率工具', desc: '在线图片压缩，可实时对比画质与体积' },
  { name: 'Crontab Guru', url: 'https://crontab.guru/', icon: '⏰', cat: '效率工具', desc: '可视化写定时任务表达式，左边改右边立刻解释' },
  { name: 'Carbon', url: 'https://carbon.now.sh/', icon: '🎨', cat: '效率工具', desc: '把代码截图成漂亮图片，写博客 / 分享用' },
  { name: 'Explain Shell', url: 'https://explainshell.com/', icon: '🐚', cat: '效率工具', desc: '粘贴一条 Linux 命令，逐段解释每个参数含义' },

  // ===== 设计资源 =====
  { name: 'Iconify', url: 'https://iconify.design/', icon: '🔶', cat: '设计资源', desc: '十几万套开源图标统一搜索，可直接复制 SVG/组件' },
  { name: 'iconfont 矢量库', url: 'https://www.iconfont.cn/', icon: '🇨🇳', cat: '设计资源', desc: '阿里中文图标库，图标和中文字体都能下载' },
  { name: 'unDraw', url: 'https://undraw.co/', icon: '🎭', cat: '设计资源', desc: '开源插画库，改一下主题色就能和网站配色统一' },
  { name: 'Coolors', url: 'https://coolors.co/', icon: '🌈', cat: '设计资源', desc: '按空格键随机生成配色方案，可导出色值' },
  { name: 'Easings 缓动图', url: 'https://easings.net/zh-cn', icon: '📈', cat: '设计资源', desc: '各种 easing 曲线的动画演示，选缓动不再靠猜' },
  { name: 'Google Fonts', url: 'https://fonts.google.com/', icon: '🔤', cat: '设计资源', desc: '免费可商用字体库，含可变字体变量调节' },

  // ===== 算法面试 =====
  { name: '力扣（中文）', url: 'https://leetcode.cn/', icon: '🧩', cat: '算法面试', desc: '刷题主战场，按标签和难度筛面试题' },
  { name: 'VisuAlgo', url: 'https://visualgo.net/zh', icon: '🕹️', cat: '算法面试', desc: '数据结构与算法动画演示，理解过程比背模板有用' },
  { name: 'Learn Git Branching', url: 'https://learngitbranching.js.org/?locale=zh_CN', icon: '🌳', cat: '算法面试', desc: '游戏化命令行学 Git 分支与 rebase，中文支持好' },
  { name: 'SQLBolt', url: 'https://sqlbolt.com/', icon: '🗄️', cat: '算法面试', desc: '交互式 SQL 入门练习，边讲边在浏览器里执行' },

  // ===== 社区学习 =====
  { name: '掘金', url: 'https://juejin.cn/', icon: '⛏️', cat: '社区学习', desc: '中文前端/后端技术社区，专栏质量高' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com/', icon: '🧭', cat: '社区学习', desc: '全球问答库，报错信息丢进搜索框基本都有答案' },
  { name: 'GitHub Trending', url: 'https://github.com/trending', icon: '📈', cat: '社区学习', desc: '每日热门开源项目，按语言筛选看新轮子' },
  { name: '阮一峰周刊', url: 'https://www.ruanyifeng.com/blog/', icon: '📮', cat: '社区学习', desc: '科技爱好者周刊，每周五更新，养眼养脑' },
  { name: 'DeepSeek 开放平台', url: 'https://platform.deepseek.com/', icon: '🤖', cat: '社区学习', desc: '申请 API Key 与充值，本站 AI 助手就在这里取 Key' }
]

// 分类列表（按首次出现顺序去重）
export const TOOL_CATS = [...new Set(TOOLS.map((t) => t.cat))]
