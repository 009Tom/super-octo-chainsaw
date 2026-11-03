// authorMode.js - 「作者模式」开关
//
// 为什么需要它：
// 本站是纯静态站，没有后端、没有登录、没有权限系统，同一份代码同时发给
// 访客和作者本人。所以「谁能写」这件事只能靠构建环境来区分：
//   · 本机 npm run dev  → 是作者本人在操作，可以写笔记、可以发布
//   · npm run build 上线 → 面向所有访客，站点应当是「纯只读」的
//
// 判据用 import.meta.env.DEV 而不是自己造（比如判断域名）：
// Vite 在打包时会把它直接替换成 false，于是下面这些按钮在编译阶段就被
// 当成常量条件处理，线上既看不到入口，也不会误导访客。
//
// 注意：路由表里（router/index.js）必须直接写 import.meta.env.DEV，
// 不要改成从这里引用 CAN_EDIT —— 跨模块常量 Rollup 不保证能折叠，
// 那样 WriteView / PublishView 的 chunk 可能仍会被打进 dist。
//
// 实测结论（已逐项核对 vite 5.4.21 的构建产物）：
//   · router 里直接写 import.meta.env.DEV —— 生效。WriteView / PublishView
//     的 chunk 完全不在 dist 里，连发布逻辑 publish.js（特征串
//     published_map_v1）都没打进去。页面级隔离靠的就是这一条。
//   · 组件模板里的 v-if="CAN_EDIT" —— 分支不会被折叠，产物里仍会残留
//     "/publish"、"/write" 这样的路径字符串（把常量写进同模块内也一样，
//     esbuild 不做这个常量传播）。但运行时 CAN_EDIT 恒为 false，按钮不会
//     渲染，而且路由根本没注册，就算手搜到路径访问也只会回到首页。
// 所以：靠「路由不注册」保证进不去，靠 v-if 保证界面上看不到。
export const CAN_EDIT = import.meta.env.DEV
