// repo.js - 「伪后台」的读端：从 GitHub 仓库拉取已发布的笔记
//
// 设计要点（为什么这么绕）：
// 1) 网站是纯静态托管（Cloudflare Pages），没有后端，所以"后台"就是 GitHub 仓库本身。
//    只有你的 GitHub 账号能改文件 → 访客天然只读，不需要任何鉴权代码。
// 2) 列表走一个清单文件 notes/index.json，一次请求就能渲染全部摘要。
//    不用 GitHub API 列目录是因为：未登录限流 60 次/小时/IP，访客一多就 502。
// 3) 正文按需拉取，走 raw.githubusercontent.com（支持 CORS、不限流）。
// 4) 缓存：raw 的响应大约缓存 5 分钟。这里给 URL 追加一个"会话版本号"，
//    同一会话内命中缓存（不重复请求），刷新页面重开会话就会拿到最新内容。
// 5) 任何失败都不抛异常，而是返回 { ok:false, error }，让页面能优雅降级到本地草稿。

const CONFIG_KEY = 'repo_config_v1'

// 默认配置：仓库留空 = 功能未启用，网站只用本地草稿，行为和以前完全一致
export const DEFAULT_REPO_CONFIG = {
  enabled: false,
  user: '',            // GitHub 用户名
  repo: '',            // 仓库名（必须是 public 仓库）
  branch: 'main',      // 分支
  dir: 'notes',        // 笔记目录
  indexFile: 'index.json', // 清单文件名
  channel: 'direct',   // 拉取通道，见下方 CHANNELS
  proxyPrefix: ''      // channel = custom 时用的代理前缀
}

/**
 * 拉取通道：为什么需要这个
 * 浏览器读文件走的是 raw.githubusercontent.com，这个域名在国内经常被单独掐
 * （DNS 污染 / 连接重置），而你打开 github.com 可能是通的——因为代理规则只写了
 * github.com，没覆盖 raw。所以“本地能上 GitHub 但测试连接失败”基本就是这个问题，
 * 换一个能用的通道即可，不需要改代码。
 */
export const CHANNELS = [
  { id: 'direct', name: '直连 GitHub raw（默认，需要代理覆盖 raw 域名）' },
  { id: 'jsdelivr', name: 'jsDelivr 国内 CDN（读的是 GitHub 镜像，最常用）' },
  { id: 'ghproxy', name: 'gh-proxy 加速（套一层代理前缀）' },
  { id: 'api', name: 'GitHub API 兜底（raw 被墙但 api 能通时用，访客自带 60 次/小时限额）' },
  { id: 'custom', name: '自定义代理前缀（自建加速域名时用）' }
]

// 公共测试文件：GitHub 官方仓库里永远存在的一个文件，用它探测“这条域名通不通”
// 注意它跟你的仓库无关，所以能单独判断网络层还是配置层的问题
const PROBE = { user: 'octocat', repo: 'Hello-World', branch: 'master', path: 'README' }

// 会话版本号：页面刷新后变化，用于绕开 raw 的 5 分钟缓存
const SESSION_V = Date.now()

// ========== 配置读写 ==========

/** 读取仓库配置（自动补齐默认值） */
export function getRepoConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return { ...DEFAULT_REPO_CONFIG, ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    return { ...DEFAULT_REPO_CONFIG }
  }
}

/** 保存仓库配置 */
export function saveRepoConfig(cfg) {
  const clean = {
    ...DEFAULT_REPO_CONFIG,
    ...cfg,
    // 用户名/仓库名不需要大小写以外的多余字符，去掉误填的空格和结尾斜杠
    user: (cfg.user || '').trim().replace(/\/+$/, ''),
    repo: (cfg.repo || '').trim().replace(/\/+$/, ''),
    branch: (cfg.branch || 'main').trim().replace(/^\/+|\/+$/g, ''),
    dir: (cfg.dir || 'notes').trim().replace(/^\/+|\/+$/g, ''),
    channel: CHANNELS.some((c) => c.id === cfg.channel) ? cfg.channel : 'direct',
    proxyPrefix: (cfg.proxyPrefix || '').trim()
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(clean))
  indexCache = null // 换了仓库，清掉内存里的清单缓存
  return clean
}

/** 是否已经配置好一个可用仓库 */
export function isRepoReady(cfg = getRepoConfig()) {
  return !!(cfg.enabled && cfg.user && cfg.repo)
}

// ========== URL 构造 ==========

/** 路径分段编码（中文文件名、空格都能正确处理，斜杠保留） */
const enc = (p) => String(p).split('/').map(encodeURIComponent).join('/')

/** 按通道规则拼出真实请求地址（不带缓存参数） */
function buildUrl({ user, repo, branch, path }, cfg) {
  const raw = `https://raw.githubusercontent.com/${[user, repo, branch, path].filter(Boolean).map(enc).join('/')}`
  if (!path) return raw
  if (cfg.channel === 'jsdelivr') {
    // jsDelivr 的 GitHub 格式是 /gh/用户/仓库@分支/路径
    return `https://cdn.jsdelivr.net/gh/${enc(user)}/${enc(repo)}@${enc(branch)}/${enc(path)}`
  }
  if (cfg.channel === 'ghproxy') return `https://gh-proxy.com/${raw}`
  if (cfg.channel === 'api') {
    // contents 接口加上 Accept 头就能直接拿到文件原文；域名不同，raw 被墙时它往往还能通
    return `https://api.github.com/repos/${enc(user)}/${enc(repo)}/contents/${enc(path)}?ref=${encodeURIComponent(branch)}`
  }
  if (cfg.channel === 'custom' && cfg.proxyPrefix) {
    // 自定义前缀：直接拼在完整地址前面，例如 https://my-acc.com/https://raw.githubusercontent.com/...
    return `${cfg.proxyPrefix.replace(/\/+$/, '')}/${raw}`
  }
  return raw
}

/** 某个文件在当前通道下的地址（追加会话版本号，绕开 CDN 的分钟级缓存） */
export function rawUrl(path, cfg = getRepoConfig()) {
  const base = buildUrl({ user: cfg.user, repo: cfg.repo, branch: cfg.branch, path }, cfg)
  // api 通道的查询参数是固定的 ?ref=分支，不另加版本号，改用 no-store 避开缓存
  if (cfg.channel === 'api') return base
  return `${base}?c=${SESSION_V}`
}

/** 不同通道需要的 fetch 选项（api 通道要声明 Accept 才返回原文，并且不能读缓存） */
function fetchOpts(cfg) {
  return cfg.channel === 'api'
    ? { headers: { Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' }
    : { cache: 'default' }
}

/** 清单文件地址 */
export function indexUrl(cfg = getRepoConfig()) {
  return rawUrl([cfg.dir, cfg.indexFile].filter(Boolean).join('/'), cfg)
}

/** 某篇笔记正文的地址 */
export function bodyUrl(file, cfg = getRepoConfig()) {
  return rawUrl([cfg.dir, file].filter(Boolean).join('/'), cfg)
}

/** 给用户看的仓库主页地址（发布中心里"打开仓库"按钮用） */
export function repoWebUrl(cfg = getRepoConfig()) {
  return `https://github.com/${cfg.user}/${cfg.repo}/tree/${cfg.branch}/${cfg.dir}`
}

// ========== 网络请求 ==========

/** 带超时的 fetch，避免网络不通时页面一直转圈 */
async function getJson(url, cfg = getRepoConfig(), timeout = 8000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal, ...fetchOpts(cfg) })
    if (!res.ok) return { ok: false, status: res.status, error: httpHint(res.status) }
    // raw 找不到文件时返回的是 404 文本，走不到这里；但目录被重命名时会拿到 HTML，所以仍要防解析失败
    try {
      return { ok: true, data: await res.json() }
    } catch {
      return { ok: false, error: '清单不是合法的 JSON，请用「导出发布包」重新生成 index.json' }
    }
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? '拉取超时，请检查网络' : '网络请求失败（可能被墙或离线）' }
  } finally {
    clearTimeout(timer)
  }
}

function httpHint(status) {
  if (status === 404) return '找不到文件（404）：确认仓库是 public、目录名和分支填对了，且 index.json 真的传上去了'
  if (status === 403 || status === 451) return '该仓库不可公开访问（私有仓库或被封禁）'
  return `远端返回了 ${status}`
}

// ========== 一键诊断 ==========

/** 只探状态、不解析内容；用 no-store 保证诊断结果不被缓存欺骗 */
async function probe(url, timeout = 6000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  const t0 = Date.now()
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    return { ok: res.ok, status: res.status, ms: Date.now() - t0 }
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - t0,
      error: e.name === 'AbortError' ? '超时' : '请求发不出去（DNS 被污染或连接被重置）'
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 把“连不上”拆成四个能独立判断的环节，逐项返回结果
 * 前两项测的是网络（跟你的仓库无关），后两项测的是你的配置
 * @returns {Promise<{ok:boolean, steps:Array, conclusion:string, indexHref:string}>}
 */
export async function diagnose() {
  const cfg = getRepoConfig()
  const steps = []
  const push = (label, r, extra) => steps.push({
    label,
    ok: r.ok,
    detail: r.ok ? `${r.status}・${r.ms}ms` : `${r.status ? `HTTP ${r.status}` : r.error}（${r.ms}ms）`,
    ...extra
  })

  // 四项并行探测（串行最坏要等 4×6 秒），而且它们之间互不影响，结果更可信
  const ch = cfg.channel
  const configured = !!(cfg.user && cfg.repo)
  const noCfg = { ok: false, status: 0, ms: 0, error: '未配置仓库' }
  const withP = (u) => `${u}${u.includes('?') ? '&' : '?'}p=${SESSION_V}`

  // ① 直连 raw 域名：用一个公共文件，判断“这台设备能不能访问 GitHub 的原始文件域名”
  // ② 当前通道（同一个公共文件，换个域名再试） ③ 仓库存在吗、是 public 吗 ④ 清单文件在不在
  const [direct, viaNow, repoRaw, idx] = await Promise.all([
    probe(withP(buildUrl(PROBE, { ...cfg, channel: 'direct' }))),
    ch === 'direct' ? Promise.resolve(null) : probe(withP(buildUrl(PROBE, { ...cfg, channel: ch }))),
    configured
      ? probe(withP(`https://api.github.com/repos/${encodeURIComponent(cfg.user)}/${encodeURIComponent(cfg.repo)}`))
      : Promise.resolve(noCfg),
    configured ? probe(indexUrl(cfg)) : Promise.resolve(noCfg)
  ])
  const via = viaNow || direct
  // api 域名有响应（哪怕是 404）就说明这一层网络是通的，可以走兜底通道
  const apiAlive = !!repoRaw && repoRaw.status > 0

  push('① 直连 raw.githubusercontent.com', direct)
  push(`② 当前通道（${(CHANNELS.find((c) => c.id === ch) || {}).name || ch}）`, via)
  push('③ 仓库存在且为 Public', repoRaw || { ok: false, status: 0, ms: 0, error: '未配置仓库' })
  push('④ 清单 index.json 可读', idx, { href: configured ? indexUrl(cfg) : '' })

  // 结论：从最重要的那个问题开始说
  let conclusion
  if (!via.ok && !direct.ok) {
    conclusion = '这台设备访问不了 GitHub 的原始文件域名。github.com 能打开不代表 raw 能打开（代理规则常常只覆盖 github.com）。' +
      (ch === 'jsdelivr'
        ? 'jsDelivr 也不通的话，换“GitHub API 兜底”或 gh-proxy。'
        : apiAlive
          ? '你这里 api.github.com 是通的，直接把「拉取通道」换成「GitHub API 兜底」最稳。'
          : '把上面的「拉取通道」换成 jsDelivr 国内 CDN 再试一次；还不行就试 gh-proxy 或 API 兜底。')
  } else if (!via.ok) {
    conclusion = `当前通道用不了（${via.status ? `HTTP ${via.status}` : via.error}），换一个通道试试。`
  } else if (configured && !repoRaw.ok) {
    conclusion = repoRaw.status === 404
      ? '通道是通的，但 GitHub 说这个仓库不存在——要么是用户名/仓库名错了，要么是私有仓库（私有仓库前端读不到，改成 Public）。'
      : '能访问 raw，但访问 api.github.com 失败。这不影响读笔记，先不管它，看第 ④ 项。'
  } else if (!idx.ok) {
    conclusion = '网络与仓库都正常，就差清单文件：' + (idx.status === 404
      ? `这个地址不存在——把上面的清单完整地址复制到浏览器打开确认一下。常见原因：index.json 没上传、传到了仓库根目录而不是 ${cfg.dir || 'notes'} 目录、分支不是 ${cfg.branch}。`
      : idx.error)
  } else {
    conclusion = '全部正常。如果列表还是空，说明清单读到了但里面没有笔记，回 Step 2 导出发布包并上传。'
  }

  return { ok: via.ok && idx.ok, steps, conclusion }
}

// ========== 清单（列表数据） ==========

let indexCache = null // { notes, updated, at }
const INDEX_TTL = 60 * 1000 // 一分钟内重复进列表页不再请求

/**
 * 拉取已发布笔记列表
 * @returns {Promise<{ok:boolean, notes:Array, updated?:string, error?:string, fromCache?:boolean}>}
 */
export async function fetchPublishedNotes(force = false) {
  const cfg = getRepoConfig()
  if (!isRepoReady(cfg)) return { ok: false, notes: [], error: 'notconfigured' }

  if (!force && indexCache && Date.now() - indexCache.at < INDEX_TTL) {
    return { ok: true, notes: indexCache.notes, updated: indexCache.updated, fromCache: true }
  }

  const r = await getJson(indexUrl(cfg), cfg)
  if (!r.ok) return { ok: false, notes: indexCache ? indexCache.notes : [], error: r.error, stale: !!indexCache }

  const list = Array.isArray(r.data?.notes) ? r.data.notes : []
  const notes = list.map((n) => normalizePublished(n)).filter(Boolean)
  // 与本地列表一致：按更新时间倒序
  notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  indexCache = { notes, updated: r.data.updated, at: Date.now() }
  return { ok: true, notes, updated: r.data.updated }
}

/** 把清单里的一项补成前端统一的笔记形状 */
function normalizePublished(n) {
  if (!n || !n.id || !n.title) return null
  return {
    id: `pub:${n.id}`,          // 加前缀，避免和本地草稿 id 撞车
    slug: n.id,                 // 原始 id，用于定位文件
    file: n.file || `${n.id}.md`,
    title: n.title,
    category: n.category || '前端',
    tags: Array.isArray(n.tags) ? n.tags : [],
    createdAt: n.createdAt || n.updatedAt || '',
    updatedAt: n.updatedAt || n.createdAt || '',
    excerpt: n.excerpt || '',
    content: '',                // 正文按需拉取
    source: 'published'
  }
}

// ========== 正文 ==========

const bodyCache = new Map() // file -> markdown

/**
 * 拉取某篇已发布笔记的 Markdown 正文（已剥掉 front-matter）
 * @returns {Promise<{ok:boolean, content?:string, error?:string}>}
 */
export async function fetchPublishedBody(note) {
  const cfg = getRepoConfig()
  if (!isRepoReady(cfg)) return { ok: false, error: 'notconfigured' }

  const file = note.file || `${note.slug}.md`
  if (bodyCache.has(file)) return { ok: true, content: bodyCache.get(file) }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(bodyUrl(file, cfg), { signal: ctrl.signal, ...fetchOpts(cfg) })
    if (!res.ok) return { ok: false, error: httpHint(res.status) }
    const md = await res.text()
    const body = splitFrontMatter(md).body
    bodyCache.set(file, body)
    return { ok: true, content: body }
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? '拉取超时' : '网络请求失败' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 拆出 YAML front-matter 与正文
 * 只处理本站会生成的简单格式（key: value 与 key: [a, b]），不引入 YAML 依赖
 */
export function splitFrontMatter(md) {
  const text = String(md || '')
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { meta: {}, body: text }
  const meta = {}
  m[1].split(/\r?\n/).forEach((line) => {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kv) return
    const raw = kv[2].trim()
    meta[kv[1]] = raw.startsWith('[') && raw.endsWith(']')
      ? raw.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
      : raw.replace(/^["']|["']$/g, '')
  })
  return { meta, body: text.slice(m[0].length) }
}

/** 列表页/详情页共用的摘要（已发布笔记没有全文，用清单里的 excerpt） */
export function noteExcerpt(note, len = 90) {
  const src = note.content || note.excerpt || ''
  if (!src) return ''
  return src
    .replace(/^---[\s\S]*?---\s*/, '') // 万一正文里还带着 front-matter
    .replace(/[#>*`\-[\]()!]/g, ' ')   // 去掉 Markdown 符号
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, len)
}
