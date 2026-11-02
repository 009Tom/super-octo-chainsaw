// siteConfig.js - 部署级配置（会随 npm run build 打包进 dist，对所有访客生效）
//
// 为什么需要这个文件：
// 仓库配置本来只存在你自己浏览器的 localStorage 里，那台设备之外的任何人
// （包括访问你线上网站的朋友）都拿不到它，于是他们看到的只有本地示例笔记，
// 根本读不到你发布到 GitHub 的内容。把仓库信息在这里写死一份，打包进网站，
// 访客打开就能直接读到已发布笔记。
//
// 这里写的都是公开信息，不构成泄密：数据仓库本身就必须是 Public，
// 前端能读到它正是我们要的效果。绝对不要在这个文件里放任何 token / 密钥。
//
// 部署前把 user 和 repo 改成你自己的（改完要重新 npm run build 并部署）。
// user / repo 留空 = 不启用远端数据源，网站行为和纯本地草稿版完全一致。
export const SITE_REPO = {
  enabled: true, // 内置了仓库就默认开启；user/repo 为空时会自动退回本地草稿
  user: '009Tom', // ← GitHub 用户名
  repo: 'super-octo-chainsaw', // ← 存放笔记的数据仓库名（必须 Public）
  branch: 'main',
  // 笔记在仓库里的子目录。留空 '' = 文件直接放在仓库根目录。
  // 必须和仓库里的实际位置一致，否则网站会报 404 找不到清单。
  dir: 'notes',
  indexFile: 'index.json',
  // 拉取通道：'direct' 直连 raw / 'jsdelivr' 国内 CDN / 'ghproxy' / 'api' GitHub API 兜底 / 'custom'
  // 实测结论（2026-10，国内网络）：raw 超时、jsDelivr 也拉不到，只有 gh-proxy 和 api.github.com 能通，
  // 所以默认用 'api'（官方域名，全世界都能访问，不依赖第三方镜像）。
  // 代价：未登录的 GitHub API 限额 60 次/小时/IP，个人站足够；若你的访客很多，
  // 改成 'ghproxy'（无限额但依赖第三方实例存活）或 'jsdelivr'（海外访问快，国内常常不通）。
  channel: 'api',
  proxyPrefix: ''
}

// 站点名称等展示类配置也放这里，改一处全站生效
export const SITE_INFO = {
  name: '源码印记',
  subtitle: '我的个人学习记录'
}
