// deepseek.js - DeepSeek API 接入工具
// DeepSeek 兼容 OpenAI 的 Chat Completions 接口，这里用浏览器原生 fetch 直接调用，
// 无需安装 SDK。API Key 由用户在自己的浏览器里填写，仅保存在 localStorage 中，
// 不会上传到任何第三方（纯前端直连 DeepSeek 服务器）。

const SETTINGS_KEY = 'deepseek_settings_v1'
const HISTORY_KEY = 'deepseek_chat_history_v1'

// 默认配置（模型名以 DeepSeek 官方文档为准，可在设置面板修改）
// ⚠️ 2026-04-24 官方公告：旧模型名 deepseek-chat / deepseek-reasoner 已于 2026-07-24 停用，
//    当前可用模型为 deepseek-flash（V4.1-Flash，通用快）与 deepseek-v4-pro（推理强）。
export const DEFAULT_SETTINGS = {
  apiKey: '',                          // 在 https://platform.deepseek.com/api_keys 申请
  model: 'deepseek-flash',             // 默认：deepseek-flash（也可选 deepseek-v4-pro）
  // 接口地址按环境自动选：
  // - 本地 npm run dev：走 Vite 代理 /api/deepseek（见 vite.config.js），同源请求无跨域问题
  // - 打包后部署到纯静态托管（Cloudflare Pages / Vercel 等）：没有 dev 代理可用，直连 api.deepseek.com
  baseUrl: import.meta.env.DEV ? '/api/deepseek' : 'https://api.deepseek.com',
  temperature: 1.3,                    // 采样温度：越大越发散，越小越严谨
  thinking: true,                      // 思考模式：开启后模型先推理再作答（耗时、耗 token 更多）
  reasoningEffort: 'high'              // 思考强度：low / medium / high
}

// 可选模型列表（供设置面板的下拉框使用）
// 新名字支持 thinking 参数；为兼容已缓存的旧配置，列表里仍保留旧名（会映射到对应新模型）
export const MODELS = [
  { value: 'deepseek-flash', label: 'deepseek-flash（V4.1-Flash・通用对话，快且便宜）', supportsThinking: true },
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro（V4-Pro・推理/编程更强）', supportsThinking: true },
  { value: 'deepseek-chat', label: 'deepseek-chat（旧名，已停用，仅保留兼容）', supportsThinking: false },
  { value: 'deepseek-reasoner', label: 'deepseek-reasoner（旧名，已停用，仅保留兼容）', supportsThinking: false }
]

/** 查询指定模型是否支持思考模式参数 */
export function supportsThinking(model) {
  return MODELS.find((m) => m.value === model)?.supportsThinking ?? false
}

// 系统提示词：把 DeepSeek 设定成"学习助手"角色，回答风格贴合本站场景
export const SYSTEM_PROMPT = '你是一个耐心的编程学习助手，服务对象是一位正在记录学习笔记的开发者。' +
  '请用简体中文回答问题，适当使用 Markdown 排版，代码用代码块包裹并标注语言。回答尽量简洁清晰。'

// ========== 设置读写 ==========

// 旧模型名 -> 新模型名映射（官方已于 2026-07-24 停用旧名）
const MODEL_MIGRATION = {
  'deepseek-chat': 'deepseek-flash',
  'deepseek-reasoner': 'deepseek-v4-pro'
}

/** 获取 DeepSeek 设置（合并默认值 + 自动迁移已停用的旧模型名） */
export function getSettings() {
  let saved = {}
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    saved = raw ? JSON.parse(raw) : {}
  } catch {
    saved = {}
  }
  const merged = { ...DEFAULT_SETTINGS, ...saved }

  // 迁移：历史上保存过 deepseek-chat / deepseek-reasoner 的，自动换成新版模型名
  if (MODEL_MIGRATION[merged.model]) {
    merged.model = MODEL_MIGRATION[merged.model]
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
  }
  return merged
}

/** 保存 DeepSeek 设置 */
export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// ========== 聊天记录读写 ==========

/**
 * 获取历史消息列表
 * @returns {Array<{role: string, content: string}>}
 */
export function getChatHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** 保存聊天记录（本地持久化，刷新页面不丢失） */
export function saveChatHistory(messages) {
  // 最多保留最近 100 条，避免 localStorage 膨胀
  localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-100)))
}

/** 清空聊天记录 */
export function clearChatHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

// ========== 核心：流式对话 ==========

/**
 * 把 DeepSeek 的错误响应翻译成可读中文提示（内部复用）
 * @param {Response} res fetch 响应对象
 * @param {string} text 响应体文本
 */
function apiFailMessage(res, text) {
  // DeepSeek 错误体一般是 {"error":{"message":"...","type":"..."}}
  let serverMsg = ''
  let isHtml = false
  try {
    serverMsg = JSON.parse(text).error?.message || ''
  } catch {
    // 不是 JSON：常见于代理不存在时开发服务器返回的 HTML 页面
    isHtml = /^\s*<(html|!doctype|script)/i.test(text) || text.includes('<!DOCTYPE')
  }

  if (res.status === 401) return `API Key 无效（${serverMsg || '服务端返回 401'}），请重新粘贴保存。`
  if (res.status === 402) return `DeepSeek 余额不足，请充值后重试。（${serverMsg}）`
  if (res.status === 429) return '请求过于频繁（429），稍等几秒再试。'
  if (res.status === 400 && /model|not\s*found|unsupported/i.test(text)) {
    return `模型名无效或已下线（${serverMsg || text.slice(0, 120)}），请在设置里改选 deepseek-flash / deepseek-v4-pro。`
  }
  if (isHtml) {
    return `接口地址 ${getSettings().baseUrl} 没有返回 JSON，拿到的是页面 HTML——说明开发服务器的代理没生效。请重启 npm run dev（改过 vite.config.js 必须重启），或把接口地址改为直连 https://api.deepseek.com。`
  }
  return `请求失败（HTTP ${res.status}）：${serverMsg || text.slice(0, 200) || '未知错误'}`
}

/**
 * 调用 DeepSeek 流式聊天接口
 * @param {Array} messages 完整对话上下文（含 system 提示）
 * @param {{onDelta?: (delta: string, full: string) => void, onReasoning?: (delta: string, full: string) => void}} handlers
 *        onDelta：正文增量回调；onReasoning：思考过程增量回调（开启思考模式时才有）
 * @param {AbortSignal} [signal] 可选：用于“停止生成”的中断信号
 * @returns {Promise<{content: string, reasoning: string}>}
 */
export async function chatCompletion(messages, handlers = {}, signal) {
  const { onDelta = () => {}, onReasoning = () => {} } = handlers
  const { apiKey, model, baseUrl, temperature, thinking, reasoningEffort } = getSettings()

  if (!apiKey) {
    throw new Error('还没有配置 API Key，请先点击右上角「设置」填写。')
  }

  // 请求体：stream: true 让服务端以 SSE（Server-Sent Events）逐段返回
  const body = { model, messages, stream: true }
  // 只有支持思考模式的模型才下发 thinking / reasoning_effort
  // 官方说明：思考模式不支持 temperature（传了不报错也不生效），所以仅在非思考模式下携带
  if (supportsThinking(model)) {
    body.thinking = { type: thinking ? 'enabled' : 'disabled' }
    if (thinking) {
      body.reasoning_effort = reasoningEffort
    } else {
      body.temperature = temperature
    }
  } else {
    body.temperature = temperature
  }

  let res
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal
    })
  } catch (e) {
    // 把浏览器的英文错误（Failed to fetch / NetworkError）翻译成可定位的中文提示
    if (e.name === 'AbortError') throw e
    const err = new Error(
      `请求没能发出或中途断开（${e.name}: ${e.message}）。` +
      `当前接口地址：${baseUrl}。若它是 /api/ 开头的代理路径，请确认 npm run dev 已启动、` +
      `且浏览器访问的是终端里显示的那个地址（如 http://localhost:5173）；` +
      `也可以到设置里改选「直连 api.deepseek.com」试一下。`
    )
    err.code = 'network'
    throw err
  }

  // 统一处理 HTTP 错误，转成友好中文提示
  if (!res.ok) {
    throw new Error(apiFailMessage(res, await res.text().catch(() => '')))
  }

  // 逐块读取响应流，并按 SSE 格式解析
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''   // 跨块的未完成行
  let full = ''      // 已累积的完整正文
  let reasoning = '' // 已累积的思考过程

  // 读取循环本身可能因网络/代理中断而抛错，需要单独兜底
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE 每条消息以 "data: " 开头、以换行分隔；[DONE] 表示结束
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 最后一行可能不完整，留到下一轮

      for (const line of lines) {
        const data = line.trim().startsWith('data:') ? line.trim().slice(5).trim() : ''
        if (!data || data === '[DONE]') continue
        try {
          const chunk = JSON.parse(data).choices?.[0]?.delta || {}
          // 正文增量
          if (chunk.content) {
            full += chunk.content
            onDelta(chunk.content, full)
          }
          // 思考过程增量（开启 thinking 后服务端会返回 reasoning_content）
          if (chunk.reasoning_content) {
            reasoning += chunk.reasoning_content
            onReasoning(chunk.reasoning_content, reasoning)
          }
        } catch {
          // 单行解析失败不影响整体，忽略即可
        }
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') throw e
    // 已经收到部分内容：当成一次正常回复收尾，不让用户之前的等待白费
    if (full || reasoning) {
      return {
        content: full + (full ? '\n\n_（网络中断，以上为已收到的部分）_' : ''),
        reasoning
      }
    }
    const err = new Error(
      `接收回复时连接被断开（${e.name}: ${e.message}）。常见原因：开发服务器重启、代理/VPN 干扰、或长时间思考后连接被中断。` +
      `可先关掉「思考模式」再试，或到设置里改用「直连 api.deepseek.com」。`
    )
    err.code = 'network'
    throw err
  }

  // 同时返回正文与思考过程，方便页面展示与存档
  return { content: full, reasoning }
}

// ========== 接口地址预设 ==========
// 已验证两种可用：代理路径（同源，避开跨域）与直连域名（DeepSeek 允许浏览器跨域调用）
export const BASE_URL_PRESETS = [
  { value: '/api/deepseek', label: '开发代理 /api/deepseek（仅 npm run dev 时可用）' },
  { value: 'https://api.deepseek.com', label: '直连 api.deepseek.com（打包部署后默认用这个）' }
]

// ========== 一键网络自检 ==========
/**
 * 依次测试：代理路径 / 直连域名 / 当前 Key 是否可用
 * 用于把“network error”这种笼统报错拆成可定位的结论
 * @returns {Promise<Array<{name: string, ok: boolean, detail: string}>>}
 */
export async function selfTest() {
  const { apiKey, model } = getSettings()
  const probes = [
    { name: '开发代理 /api/deepseek', base: '/api/deepseek' },
    { name: '直连 api.deepseek.com', base: 'https://api.deepseek.com' }
  ]
  const results = []

  for (const p of probes) {
    const started = Date.now()
    try {
      // 故意用一个无效的短 Key：能拿到 401 就说明“链路通”，只是没权限
      const res = await fetch(`${p.base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-selftest' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }], stream: false, max_tokens: 1 })
      })
      const text = await res.text().catch(() => '')
      const reachedUpstream = /deepseek|auth|key|model/i.test(text)
      results.push({
        name: p.name,
        ok: reachedUpstream,
        detail: reachedUpstream
          ? `链路正常（HTTP ${res.status}，${Date.now() - started}ms，已进入 DeepSeek 服务）`
          : `HTTP ${res.status}，响应不是 DeepSeek 的错误信息，代理可能未生效：${text.slice(0, 100) || '(空)'}`
      })
    } catch (e) {
      results.push({ name: p.name, ok: false, detail: `请求失败：${e.name}: ${e.message}` })
    }
  }

  // 用用户真正保存的 Key 发一次最小请求（成功即说明一切就绪）
  if (apiKey) {
    try {
      const base = getSettings().baseUrl
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: '回复“OK”两个字' }], stream: false, max_tokens: 8 })
      })
      const text = await res.text().catch(() => '')
      results.push({
        name: `当前 Key + ${base}`,
        ok: res.ok,
        detail: res.ok
          ? `认证成功，模型可用：${JSON.parse(text).choices?.[0]?.message?.content || '(有回复)'}`
          : apiFailMessage(res, text)
      })
    } catch (e) {
      results.push({ name: '当前 Key 真实请求', ok: false, detail: `请求失败：${e.name}: ${e.message}` })
    }
  } else {
    results.push({ name: '当前 Key 真实请求', ok: false, detail: '本地没检测到已保存的 API Key（请确认点过「保存设置」，且用的是同一个浏览器）' })
  }

  return results
}
