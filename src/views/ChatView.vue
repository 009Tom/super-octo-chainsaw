<template>
  <!-- ChatView - AI 学习助手：接入 DeepSeek 流式对话 -->
  <!-- 双端：用 dvh 适配手机地址栏/键盘高度，消息区内部滚动，输入区始终可见 -->
  <div class="max-w-3xl mx-auto px-3 sm:px-6 flex flex-col h-[calc(100dvh-11rem)] min-h-[440px]">
    <!-- ===== 头部：标题 + 状态 + 操作按钮 ===== -->
    <div class="flex items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <!-- 头像：静态实色方块 -->
        <div class="w-10 h-10 shrink-0 rounded-xl bg-primary text-white grid place-items-center text-sm font-black">AI</div>
        <div class="min-w-0">
          <h1 class="text-lg sm:text-xl font-extrabold text-ink-900 leading-tight">学习助手</h1>
          <p class="text-[11px] sm:text-xs text-ink-400 mt-0.5 font-mono truncate">
            DeepSeek · {{ settings.model }}
          </p>
        </div>
      </div>
      <div class="flex gap-2 shrink-0">
        <button class="btn btn-soft btn-sm" @click="showSettings = !showSettings">⚙ 设置</button>
        <button class="btn btn-soft btn-sm" @click="handleClear">🗑 清空</button>
      </div>
    </div>

    <!-- ===== 未配置 API Key 时的引导 ===== -->
    <div v-if="!settings.apiKey" class="mb-4 p-4 rounded-xl bg-primary-50 border border-primary-100 text-sm text-gray-700">
      <p class="font-medium text-primary-dark mb-1">第一次使用，需要填一下你的 DeepSeek API Key 🔑</p>
      <ol class="list-decimal pl-5 space-y-0.5 text-gray-600">
        <li>打开 <a href="https://platform.deepseek.com/api_keys" target="_blank" class="text-primary hover:underline">DeepSeek 开放平台</a> 注册并创建 API Key</li>
        <li>充值少量额度（对话成本很低，几块钱能用很久）</li>
        <li>点右上角「⚙ 设置」粘贴 Key → 必须点一下「保存设置」（只输入不点按钮不会生效）</li>
      </ol>
      <p class="text-xs text-gray-400 mt-2">Key 只保存在你自己的浏览器 localStorage 里，不会上传到任何第三方。</p>
    </div>

    <!-- ===== 设置面板 ===== -->
    <div v-if="showSettings" class="mb-3 p-4 rounded-xl bg-white border border-ink-200 overflow-y-auto max-h-[46vh] sm:max-h-none sm:overflow-visible">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2">
          <label class="label">API Key</label>
          <input
            v-model.trim="draft.apiKey"
            :type="revealKey ? 'text' : 'password'"
            placeholder="sk-xxxxxxxxxxxxxxxx"
            class="field"
          />
        </div>
        <div>
          <label class="label">模型</label>
          <select
            v-model="draft.model"
            class="field"
          >
            <option v-for="m in models" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div>
          <label class="label">接口地址</label>
          <select
            v-model="baseUrlChoice"
            class="field"
          >
            <option v-for="p in baseUrlPresets" :key="p.value" :value="p.value">{{ p.label }}</option>
            <option value="__custom__">自定义（其他兼容 OpenAI 的服务）</option>
          </select>
          <!-- 选了自定义时，再输一个完整域名 -->
          <input
            v-if="isCustomBaseUrl"
            v-model.trim="customBaseUrl"
            placeholder="https://你的代理域名/v1"
            class="field mt-2 font-mono"
          />
        </div>
        <div>
          <label class="label">
            随机性 temperature：<span class="text-primary">{{ draft.temperature }}</span>
          </label>
          <input
            v-model.number="draft.temperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            :disabled="draftSupportsThinking && draft.thinking"
            class="w-full accent-primary disabled:opacity-40"
          />
          <!-- 官方文档：思考模式不支持 temperature，传了也不生效 -->
          <p class="text-xs text-ink-400">{{ draftSupportsThinking && draft.thinking ? '思考模式下此参数不生效' : '0 更严谨，2 更有创造性' }}</p>
        </div>
        <!-- 思考模式（仅新版模型支持） -->
        <div v-if="draftSupportsThinking" class="sm:col-span-2 flex flex-wrap items-center gap-4">
          <label class="flex items-center gap-1.5 text-xs text-ink-700 cursor-pointer">
            <input v-model="draft.thinking" type="checkbox" class="accent-primary" />开启思考模式（先推理再回答，更准确但更耗时）
          </label>
          <select
            v-if="draft.thinking"
            v-model="draft.reasoningEffort"
            class="px-3 py-1.5 rounded-lg border border-ink-200 text-xs bg-white focus:outline-none focus:border-primary"
          >
            <option value="low">思考强度：low</option>
            <option value="medium">思考强度：medium</option>
            <option value="high">思考强度：high</option>
          </select>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 mt-3">
        <button class="btn btn-primary btn-sm" @click="handleSaveSettings">保存设置</button>
        <!-- 一键自检：把“network error”拆成具体原因 -->
        <button class="btn btn-soft btn-sm disabled:opacity-50" :disabled="testing" @click="handleSelfTest">
          {{ testing ? '自检中…' : '🩺 网络自检' }}
        </button>
        <label class="flex items-center gap-1.5 text-xs text-ink-500 cursor-pointer">
          <input v-model="revealKey" type="checkbox" class="accent-primary" />显示 Key
        </label>
        <span v-if="saveTip" class="text-xs text-green-600">✅ 已保存到本地</span>
      </div>

      <!-- 自检结果 -->
      <div v-if="testResults.length" class="mt-3 space-y-1.5">
        <div
          v-for="(r, i) in testResults"
          :key="i"
          class="flex items-start gap-2 text-xs p-2.5 rounded-lg"
          :class="r.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'"
        >
          <span>{{ r.ok ? '✅' : '❌' }}</span>
          <div>
            <p class="font-medium">{{ r.name }}</p>
            <p class="opacity-80 break-all">{{ r.detail }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 消息区（内部滚动，手机上保留惯性滑动） ===== -->
    <div ref="scrollArea" class="card flex-1 overflow-y-auto p-3 sm:p-5 space-y-4" style="-webkit-overflow-scrolling: touch">
      <!-- 欢迎语 + 快捷提问 -->
      <div v-if="messages.length === 0" class="h-full grid place-items-center text-center py-6">
        <div>
          <p class="text-4xl mb-3">🤖</p>
          <p class="text-ink-700 font-medium mb-1">有任何学习上的问题，尽管问我</p>
          <p class="text-ink-400 text-sm mb-5">比如概念解释、代码报错排查、知识点总结成 Markdown 笔记</p>
          <div class="flex flex-wrap justify-center gap-2">
            <button
              v-for="q in quickQuestions"
              :key="q"
              class="chip text-[12px]"
              @click="useQuickQuestion(q)"
            >{{ q }}</button>
          </div>
        </div>
      </div>

      <!-- 消息气泡 -->
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="flex gap-3"
        :class="msg.role === 'user' ? 'flex-row-reverse' : ''"
      >
        <!-- 头像 -->
        <div
          class="w-8 h-8 rounded-lg grid place-items-center text-xs font-medium shrink-0"
          :class="msg.role === 'user' ? 'bg-ink-200 text-ink-700' : 'bg-primary text-white'"
        >{{ msg.role === 'user' ? '我' : 'AI' }}</div>

        <!-- 内容 -->
        <div
          class="max-w-[86%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-3 text-[15px] leading-7 break-words"
          :class="msg.role === 'user'
            ? 'bg-primary text-white rounded-tr-sm'
            : 'bg-ink-50 text-ink-700 rounded-tl-sm border border-ink-200'"
        >
          <!-- 用户消息：纯文本；AI 消息：思考过程（可展开）+ Markdown 正文 -->
          <template v-if="msg.role === 'user'">{{ msg.content }}</template>
          <template v-else>
            <details v-if="msg.reasoning" class="mb-2 text-xs text-ink-500">
              <summary class="cursor-pointer select-none">💭 思考过程</summary>
              <div class="mt-1.5 pl-3 border-l-2 border-ink-200 whitespace-pre-wrap leading-6">{{ msg.reasoning }}</div>
            </details>
            <div class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
          </template>

          <!-- 助手消息操作：复制 / 存为笔记（手机上留足点击区） -->
          <div v-if="msg.role === 'assistant' && msg.content && !loading" class="flex gap-1 mt-3 pt-2 border-t border-ink-200">
            <button class="min-h-[36px] px-2.5 rounded-lg text-xs text-ink-500 hover:text-primary hover:bg-white transition-colors" @click="copyText(msg.content)">复制</button>
            <button class="min-h-[36px] px-2.5 rounded-lg text-xs text-ink-500 hover:text-primary hover:bg-white transition-colors" @click="saveAsNote(msg.content)">存为笔记</button>
          </div>
        </div>
      </div>

      <!-- 等待回复的动画（包括思考阶段） -->
      <div v-if="loading && streamingText === '' && streamingReasoning === ''" class="flex gap-3">
        <div class="w-8 h-8 rounded-lg bg-primary text-white grid place-items-center text-xs font-medium shrink-0">AI</div>
        <div class="px-4 py-3 rounded-2xl rounded-tl-sm bg-ink-50 border border-ink-200 text-ink-400 text-sm">
          思考中<span class="animate-pulse">…</span>
        </div>
      </div>

      <!-- 流式输出中的实时内容（思考过程 + 正文） -->
      <div v-if="streamingText || streamingReasoning" class="flex gap-3">
        <div class="w-8 h-8 rounded-lg bg-primary text-white grid place-items-center text-xs font-medium shrink-0">AI</div>
        <div class="max-w-[86%] sm:max-w-[80%] rounded-2xl rounded-tl-sm px-3.5 sm:px-4 py-3 bg-ink-50 border border-ink-200">
          <!-- 正在思考：先显示推理文本（灰色小字） -->
          <div v-if="streamingReasoning && !streamingText" class="text-xs text-ink-400 leading-6 whitespace-pre-wrap">
            💭 {{ streamingReasoning }}
          </div>
          <div v-if="streamingText" class="markdown-body" v-html="renderMarkdown(streamingText)"></div>
          <span v-if="loading" class="inline-block w-1.5 h-4 bg-primary align-middle animate-pulse"></span>
        </div>
      </div>

      <!-- 错误提示 -->
      <p v-if="error" class="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
        ⚠️ {{ error }}
      </p>
    </div>

    <!-- ===== 输入区（flex 列底部，手机上始终可见） ===== -->
    <div class="mt-3 p-2 rounded-2xl bg-white border border-ink-200 focus-within:border-primary transition-colors safe-b">
      <textarea
        ref="inputEl"
        v-model="input"
        rows="2"
        placeholder="问我任何问题…（Enter 发送，Shift + Enter 换行）"
        class="w-full px-3 py-2 resize-none bg-transparent text-[15px] leading-6 focus:outline-none"
        @keydown.enter.exact.prevent="handleSend"
      ></textarea>
      <div class="flex items-center justify-between gap-2 px-1 pb-1">
        <span class="text-xs text-ink-400 tabular-nums">{{ input.length }} 字</span>
        <div class="flex gap-2">
          <button v-if="loading" class="btn btn-soft btn-sm" @click="handleStop">⏸ 停止</button>
          <button :disabled="!input.trim() || loading" class="btn btn-primary btn-sm disabled:opacity-40 disabled:cursor-not-allowed" @click="handleSend">
            发送 ↵
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// ChatView.vue - AI 学习助手逻辑
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { renderMarkdown } from '../utils/markdown'
import { addNote } from '../utils/storage'
import { burst } from '../utils/fx'
import {
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  MODELS,
  BASE_URL_PRESETS,
  supportsThinking,
  selfTest,
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
  chatCompletion,
  SYSTEM_PROMPT
} from '../utils/deepseek'

const router = useRouter()

const settings = ref(getSettings())          // 当前生效的设置
const draft = reactive({ ...DEFAULT_SETTINGS, ...settings.value }) // 设置面板的临时表单
const showSettings = ref(false)
const revealKey = ref(false)
const saveTip = ref(false)

// 模型下拉选项（包含新版 flash / v4-pro 与已停用的旧名）
const models = MODELS
// 接口地址预设（代理 / 直连）
const baseUrlPresets = BASE_URL_PRESETS
const customBaseUrl = ref('')           // 选“自定义”时的输入值
// 已保存的地址不在预设列表里，就归为“自定义”
const isCustomBaseUrl = computed(() => !baseUrlPresets.some((p) => p.value === draft.baseUrl))
// 下拉框绑定值：自定义时统一显示“__custom__”，避免 select 空白
const baseUrlChoice = computed({
  get: () => (isCustomBaseUrl.value ? '__custom__' : draft.baseUrl),
  set: (val) => { draft.baseUrl = val === '__custom__' ? customBaseUrl.value : val }
})
// 自定义输入框变化时同步到真正生效的地址
watch(customBaseUrl, (val) => { if (isCustomBaseUrl.value) draft.baseUrl = val })
// 网络自检
const testing = ref(false)
const testResults = ref([])
// 当前表单选的模型是否支持思考模式
const draftSupportsThinking = computed(() => supportsThinking(draft.model))

const messages = ref([])                     // 对话历史 [{ role, content, reasoning? }]
const input = ref('')
const loading = ref(false)                   // 是否正在请求/接收
const streamingText = ref('')                // 流式接收中的正文
const streamingReasoning = ref('')           // 流式接收中的思考过程
const error = ref('')

const scrollArea = ref(null)
const inputEl = ref(null)
let abortController = null                    // 用于“停止生成”

// 快捷提问（点一下直接填入输入框）
const quickQuestions = [
  '用一句话解释 Vue 的 nextTick',
  '帮我总结闭包的概念和常见应用场景',
  '这段报错可能是什么原因引起的？',
  '把下面的内容整理成 Markdown 笔记'
]

// 首次进入：读取本地保存的聊天记录
onMounted(() => {
  messages.value = getChatHistory()
  // 已保存的是自定义地址时，回填到输入框
  if (isCustomBaseUrl.value) customBaseUrl.value = draft.baseUrl
  scrollToBottom()
})

// ========== 消息发送 ==========
async function handleSend() {
  const text = input.value.trim()
  if (!text || loading.value) return

  // 防止“填了 Key 但忘记点保存”：表单里有 Key 而尚未生效时，自动保存一次
  if (!settings.value.apiKey && draft.apiKey) handleSaveSettings()

  error.value = ''
  input.value = ''
  messages.value.push({ role: 'user', content: text })
  scrollToBottom()

  loading.value = true
  streamingText.value = ''
  streamingReasoning.value = ''
  abortController = new AbortController()

  // 组装上下文：system 提示 + 最近 20 条历史（控制 token 消耗）
  // 只保留 role/content，把本地存的 reasoning 字段剔掉，避免接口收到未知字段
  const payload = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.value.slice(-20).map(({ role, content }) => ({ role, content }))
  ]

  try {
    // chatCompletion 返回 { content, reasoning }，两个回调分别写入预览区
    const { content, reasoning } = await chatCompletion(
      payload,
      {
        onDelta: (delta) => {
          streamingText.value += delta
          scrollToBottom()
        },
        onReasoning: (delta) => {
          streamingReasoning.value += delta
          scrollToBottom()
        }
      },
      abortController.signal
    )
    // 接收完毕，正式写入对话历史（思考过程一并保存，可折叠查看）
    messages.value.push({
      role: 'assistant',
      content: content || '（模型没有返回内容）',
      reasoning
    })
    // 回答完成时放一小簇粒子作为提醒
    burst(window.innerWidth / 2, window.innerHeight * 0.62, 14, 'rainbow')
  } catch (e) {
    if (e.name === 'AbortError') {
      // 用户主动停止：把已收到的部分保留下来
      if (streamingText.value || streamingReasoning.value) {
        messages.value.push({
          role: 'assistant',
          content: streamingText.value + '\n\n_（已手动停止）_',
          reasoning: streamingReasoning.value
        })
      }
    } else {
      error.value = e.message || '请求失败，请检查网络或 API Key。'
    }
  } finally {
    streamingText.value = ''
    streamingReasoning.value = ''
    loading.value = false
    abortController = null
    saveChatHistory(messages.value)
    scrollToBottom()
    inputEl.value?.focus()
  }
}

// 快捷提问
function useQuickQuestion(q) {
  input.value = q
  inputEl.value?.focus()
}

// 停止生成
function handleStop() {
  abortController?.abort()
}

// ========== 设置 ==========
function handleSaveSettings() {
  const next = { ...draft, temperature: Number(draft.temperature) }
  // 选了自定义但没填地址时，回到默认代理地址
  if (!next.baseUrl) next.baseUrl = BASE_URL_PRESETS[0].value
  saveSettings(next)
  settings.value = next
  saveTip.value = true
  setTimeout(() => (saveTip.value = false), 2000)
}

// 网络自检：依次测代理、直连、当前 Key，结果列在设置面板里
async function handleSelfTest() {
  testing.value = true
  testResults.value = []
  error.value = ''
  try {
    testResults.value = await selfTest()
  } finally {
    testing.value = false
  }
}

// ========== 聊天记录操作 ==========
function handleClear() {
  if (messages.value.length && !confirm('确定清空当前对话吗？')) return
  messages.value = []
  error.value = ''
  clearChatHistory()
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => alert('已复制到剪贴板'))
}

// 把 AI 回答直接存成一篇学习笔记
function saveAsNote(content) {
  // 取正文第一行（去掉 Markdown 标题符号）作为标题
  const firstLine = content.split('\n').find((l) => l.trim()) || 'AI 助手回答'
  const title = firstLine.replace(/^#+\s*/, '').slice(0, 30) || 'AI 助手回答'
  addNote({ title, category: 'AI', tags: ['AI助手', 'DeepSeek'], content })
  if (confirm('已保存为笔记，要去笔记列表看看吗？')) router.push('/notes?category=AI')
}

// ========== 工具 ==========
// 滚动到底部，保证新消息可见
function scrollToBottom() {
  nextTick(() => {
    if (scrollArea.value) scrollArea.value.scrollTop = scrollArea.value.scrollHeight
  })
}
</script>
