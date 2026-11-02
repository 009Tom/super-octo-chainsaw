<template>
  <!-- PublishView - 发布中心：把本地草稿导出成文件，上传到 GitHub 仓库当"后台" -->
  <div class="page-wrap">
    <!-- ===== 顶部说明 ===== -->
    <header class="card p-4 sm:p-6 mb-5">
      <div class="flex items-center gap-2.5 flex-wrap">
        <h1 class="text-xl sm:text-2xl font-extrabold text-ink-900">发布中心</h1>
        <span class="badge badge-primary">GitHub 当后台</span>
      </div>
      <p class="mt-1.5 text-[13px] sm:text-sm text-ink-500 leading-relaxed">
        这个页面只负责<strong class="text-ink-700">导出文件</strong>，不直接改你的仓库。
        写权限留在你的 GitHub 账号里，别人打不开编辑器，就只能看。
      </p>
    </header>

    <!-- ===== 1. 仓库配置 ===== -->
    <section class="card p-4 sm:p-6 mb-5">
      <p class="eyebrow">Step 1</p>
      <h2 class="section-title">仓库配置</h2>

      <label class="flex items-start gap-2.5 mt-3 cursor-pointer select-none">
        <input v-model="cfg.enabled" type="checkbox" class="mt-0.5 w-4 h-4 accent-primary" />
        <span class="text-[13px] text-ink-700">
          启用「已发布」数据源（关闭时网站只显示本地草稿，和以前一样）
        </span>
      </label>

      <p v-if="siteRepoTip" class="mt-2.5 text-[12px] px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 leading-relaxed">
        {{ siteRepoTip }}
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div>
          <label class="label">GitHub 用户名</label>
          <input v-model="cfg.user" class="field" placeholder="例如 tom-dev" autocomplete="off" />
        </div>
        <div>
          <label class="label">仓库名（必须 public）</label>
          <input v-model="cfg.repo" class="field" placeholder="例如 learning-notes-data" autocomplete="off" />
        </div>
        <div>
          <label class="label">分支</label>
          <input v-model="cfg.branch" class="field" placeholder="main" autocomplete="off" />
        </div>
        <div>
          <label class="label">笔记目录</label>
          <input v-model="cfg.dir" class="field" placeholder="notes" autocomplete="off" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div>
          <label class="label">拉取通道（“连不上”先换这个）</label>
          <select v-model="cfg.channel" class="field">
            <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div v-if="cfg.channel === 'custom'">
          <label class="label">代理前缀</label>
          <input v-model="cfg.proxyPrefix" class="field" placeholder="https://your-proxy.com/" autocomplete="off" />
        </div>
        <p v-else class="text-[12px] text-ink-400 leading-relaxed self-end pb-1">
          实际会请求：<code class="font-mono break-all">{{ canTest ? sampleIndexUrl : '（填好用户名与仓库名后显示）' }}</code>
        </p>
      </div>

      <div class="flex flex-wrap gap-2 mt-4">
        <button class="btn btn-primary btn-sm" @click="save">💾 保存配置</button>
        <button class="btn btn-soft btn-sm" :disabled="testing || !canTest" @click="test">
          {{ testing ? '连接中…' : '🔌 测试连接' }}
        </button>
        <button class="btn btn-soft btn-sm" :disabled="diagging || !canTest" @click="runDiag">
          {{ diagging ? '逐项排查中…' : '🩺 一键诊断' }}
        </button>
        <a v-if="canTest" :href="webUrl" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">
          ↗ 打开仓库目录
        </a>
      </div>
      <p v-if="!canTest" class="mt-2 text-[12px] text-ink-400">先把用户名和仓库名填上（只填名字，不要把 https://github.com/... 整串粘进来）。</p>
      <p v-else-if="!cfg.enabled" class="mt-2 text-[12px] px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
        还没勾选上面的「启用」：测试与诊断照常可用，但网站的笔记列表仍只显示本地草稿。
      </p>

      <!-- 连接结果 -->
      <p v-if="testMsg" class="mt-3 text-[13px] px-3 py-2 rounded-xl border"
         :class="testOk ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'">
        {{ testMsg }}
      </p>

      <!-- 诊断结果：四项分别对应“网络通不通 / 仓库能不能读 / 清单在不在” -->
      <div v-if="diag" class="mt-3 rounded-xl border border-ink-200 bg-ink-50/70 p-3">
        <ul class="space-y-1.5 text-[12.5px]">
          <li v-for="s in diag.steps" :key="s.label" class="flex items-start gap-2">
            <span class="font-bold shrink-0" :class="s.ok ? 'text-emerald-600' : 'text-red-500'">{{ s.ok ? '✓' : '✗' }}</span>
            <span class="text-ink-700 min-w-0">{{ s.label }}</span>
            <span class="text-ink-400 ml-auto shrink-0 font-mono">{{ s.detail }}</span>
          </li>
        </ul>
        <a v-if="canTest" :href="sampleIndexUrl" target="_blank" rel="noopener" class="mt-2 block text-[12px] text-primary underline break-all">
          ↗ 清单完整地址，复制到浏览器打开就能直接看到结果
        </a>
        <p class="mt-2.5 pt-2.5 border-t border-ink-200 text-[13px] leading-relaxed"
           :class="diag.ok ? 'text-emerald-800' : 'text-ink-700'">
          {{ diag.conclusion }}
        </p>
      </div>

      <!-- 仓库地址：很多人把整串 URL 粘到用户名框里 -->
      <p class="mt-3 text-xs text-ink-400 leading-relaxed">
        配置只存在你这台设备的 localStorage 里，不会被打包进网站，访客看不到也改不了。
      </p>
    </section>

    <!-- ===== 2. 导出发布包 ===== -->
    <section class="card p-4 sm:p-6 mb-5">
      <p class="eyebrow">Step 2</p>
      <h2 class="section-title">导出发布包</h2>
      <p class="mt-1 text-[13px] text-ink-500">
        勾选要发布的草稿，导出后把它们和 <code class="font-mono text-primary">index.json</code> 一起传到仓库的
        <code class="font-mono text-primary">{{ cfg.dir || 'notes' }}</code> 目录。
      </p>

      <div v-if="items.length" class="flex flex-wrap gap-2 mt-4 mb-3">
        <button class="btn btn-ghost btn-sm" @click="selectAll">全选</button>
        <button class="btn btn-ghost btn-sm" @click="selectPending">只选待发布</button>
        <button class="btn btn-ghost btn-sm" @click="selected = []">清空</button>
        <span class="chip self-center">勾选 {{ selected.length }} / {{ items.length }} 篇</span>
        <span class="chip self-center" title="index.json 会写完整清单，不会把未勾选的老笔记挤掉">清单共 {{ onlineNotes.length }} 篇</span>
      </div>

      <!-- 草稿清单 -->
      <ul v-if="items.length" class="space-y-2">
        <li v-for="it in items" :key="it.note.id"
            class="flex items-start gap-3 p-3 rounded-xl border border-ink-200 bg-ink-50/60">
          <input v-model="selected" type="checkbox" :value="it.note.id"
                 class="mt-1 w-4 h-4 accent-primary shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <RouterLink :to="`/notes/${it.note.id}`" class="font-semibold text-ink-900 text-sm truncate">
                {{ it.note.title }}
              </RouterLink>
              <span class="badge" :class="statusClass(it.status)">{{ statusText(it.status) }}</span>
            </div>
            <p class="mt-1 font-mono text-[11px] text-ink-400 truncate">{{ it.file }}</p>
          </div>
          <button class="btn btn-ghost btn-sm shrink-0" title="只下载这一篇" @click="downloadOne(it)">↓</button>
        </li>
      </ul>
      <div v-else class="mt-4 p-8 text-center">
        <p class="text-3xl mb-2" aria-hidden="true">🗂️</p>
        <p class="text-ink-500">还没有草稿</p>
        <RouterLink to="/write" class="btn btn-primary btn-sm mt-4">✍️ 去写一篇</RouterLink>
      </div>

      <!-- 导出动作 -->
      <div v-if="items.length" class="flex flex-wrap gap-2 mt-5 pt-4 border-t border-ink-100">
        <button class="btn btn-primary btn-sm" :disabled="!picked.length" @click="exportBundle">
          📦 下载发布包（{{ picked.length + 1 }} 个文件）
        </button>
        <button class="btn btn-soft btn-sm" :disabled="!picked.length" @click="exportOneFile">
          📄 下载成 1 个合并文件
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="!picked.length" @click="copyBundle">
          ⧉ 复制全部内容
        </button>
      </div>
      <p v-if="exportHint" class="mt-3 text-xs text-ink-500">{{ exportHint }}</p>
    </section>

    <!-- ===== 3. 上传步骤 ===== -->
    <section class="card p-4 sm:p-6">
      <p class="eyebrow">Step 3</p>
      <h2 class="section-title">上传到 GitHub</h2>
      <ol class="mt-3 space-y-2 text-[13px] text-ink-700 leading-relaxed list-decimal list-inside">
        <li>新建仓库时选 <strong>Public</strong>（私有仓库前端读不到，除非暴露 token，绝对不要）。</li>
        <li>仓库里建一个 <code class="font-mono text-primary">{{ cfg.dir || 'notes' }}</code> 目录。</li>
        <li>
          打开
          <a v-if="canTest" :href="uploadUrl" target="_blank" rel="noopener" class="text-primary underline">
            {{ cfg.user }}/{{ cfg.repo }} 的上传页（已进到 {{ cfg.dir || 'notes' }} 目录）
          </a>
          <span v-else>GitHub 的 <em>Add file → Upload files</em></span>
          ，把刚下载的 <code class="font-mono">.md</code> 和 <code class="font-mono">index.json</code> 一起拖进去。
          <strong class="text-ink-900">不用手动新建文件</strong>：上传页会在你当前所在的目录里创建文件，
          同名文件（比如上次的 index.json）会直接覆盖。
        </li>
        <li>确认页面顶部显示的路径是 <code class="font-mono text-primary">{{ cfg.repo }} / {{ cfg.dir || 'notes' }}</code> 再提交，
          传到仓库根目录的话网站是读不到的。</li>
        <li>点 <strong>Commit changes</strong>，回到网站刷新即可（GitHub 有约 5 分钟缓存，稍等就更新）。</li>
        <li>以后每次改笔记都是同样的三步；<strong>网站本身不需要重新部署</strong>。</li>
      </ol>
      <p class="mt-4 text-xs text-ink-400">
        提示：一次下载多个文件时，浏览器可能拦「自动下载」，在地址栏右侧点一下允许即可；
        嫌麻烦就用「下载成 1 个合并文件」，对照里面的文件名逐个新建。
      </p>
    </section>
  </div>
</template>

<script setup>
// PublishView.vue - 发布中心（/publish）
import { ref, computed, onMounted } from 'vue'
import { getAllNotes } from '../utils/storage'
import {
  getRepoConfig, saveRepoConfig, isRepoReady, repoWebUrl, uploadWebUrl, indexUrl,
  fetchPublishedNotes, diagnose, CHANNELS, DEFAULT_REPO_CONFIG
} from '../utils/repo'
import {
  withPublishState, buildBundle, bundleAsText, downloadText,
  downloadFiles, markPublished, slugify
} from '../utils/publish'

const cfg = ref(getRepoConfig())
const items = ref([])
const selected = ref([])
const testing = ref(false)
const diagging = ref(false)
const diag = ref(null)
const channels = CHANNELS
const testMsg = ref('')
const testOk = ref(false)
const exportHint = ref('')

const ready = computed(() => isRepoReady(cfg.value))
// 随代码打包的默认仓库（src/siteConfig.js）：它决定了访客能不能读到笔记
const siteRepoTip = (() => {
  const d = DEFAULT_REPO_CONFIG
  if (!d.user || !d.repo) return ''
  return `本站已内置发布仓库 ${d.user}/${d.repo}（写在 src/siteConfig.js，随代码打包），` +
    '访客不需要任何配置就能读到已发布笔记。' +
    (d.enabled ? '' : '但内置配置里没启用，需要你在下面勾选保存。')
})()
// 测试与诊断不该被“启用”勾选卡住：只填了用户名/仓库名就能跑
const canTest = computed(() => !!(cfg.value.user && cfg.value.repo))
const webUrl = computed(() => repoWebUrl(cfg.value))
// 当前配置拼出来的清单地址（去掉会话参数，给人肉检查用）
const sampleIndexUrl = computed(() => indexUrl(cfg.value).replace(/\?c=\d+$/, ''))
const uploadUrl = computed(() => uploadWebUrl(cfg.value))
const picked = computed(() => items.value.filter((it) => selected.value.includes(it.note.id)))
// index.json 必须是「线上最终应该存在」的完整清单：本次勾选的 + 以前已经发布过的。
// 只按勾选项生成清单的话，传上去会让老笔记从网站上全部消失。
// status !== 'new' 就代表 published_map 里有记录，即仓库里已经有它的 .md 文件。
const onlineNotes = computed(() =>
  items.value
    .filter((it) => selected.value.includes(it.note.id) || it.status !== 'new')
    .map((it) => it.note)
)

onMounted(() => {
  items.value = withPublishState(getAllNotes())
  selectPending()
})

// ===== 状态徽标 =====
const STATUS = {
  new: ['未发布', 'bg-amber-100 text-amber-800'],
  changed: ['有改动', 'bg-sky-100 text-sky-800'],
  published: ['已发布', 'bg-emerald-100 text-emerald-800']
}
const statusText = (s) => (STATUS[s] || STATUS.new)[0]
const statusClass = (s) => (STATUS[s] || STATUS.new)[1]

// ===== 选择 =====
function selectAll() { selected.value = items.value.map((it) => it.note.id) }
function selectPending() {
  selected.value = items.value.filter((it) => it.status !== 'published').map((it) => it.note.id)
}

// ===== 配置 =====
function save() {
  cfg.value = saveRepoConfig(cfg.value)
  testMsg.value = ready.value ? '配置已保存。可以点「测试连接」验证一下。' : '配置已保存（未启用，网站只显示本地草稿）。'
  testOk.value = true
}

async function test() {
  testing.value = true
  testMsg.value = ''
  const r = await fetchPublishedNotes(true)
  testing.value = false
  if (r.ok) {
    testOk.value = true
    testMsg.value = `连接正常：读到 ${r.notes.length} 篇已发布笔记` +
      (r.updated ? `（清单更新于 ${new Date(r.updated).toLocaleString('zh-CN')}）` : '')
  } else {
    testOk.value = false
    testMsg.value = r.error === 'notconfigured'
      ? '还差一步：勾选顶部的「启用已发布数据源」并保存配置。'
      : `连接失败：${r.error}。不确定的话点「一键诊断」，它会分项告诉你是网络、仓库还是文件的问题。`
  }
}

// 一键诊断：四项分别探测，结果逐项列出来，不用猜是哪一步错了
async function runDiag() {
  diagging.value = true
  diag.value = null
  try {
    diag.value = await diagnose()
  } finally {
    diagging.value = false
  }
}

// ===== 导出 =====
function downloadOne(it) {
  const bundle = buildBundle([it.note])
  downloadText(bundle[0].name, bundle[0].text, 'text/markdown')
}

function exportBundle() {
  const notes = picked.value.map((it) => it.note)
  downloadFiles(buildBundle(notes, onlineNotes.value))
  markPublished(notes)
  items.value = withPublishState(getAllNotes())
  exportHint.value = `已导出 ${notes.length} 篇正文 + 1 份 index.json（清单含全部 ${onlineNotes.value.length} 篇，不会丢老笔记）。` +
    '如果浏览器拦了多文件下载，改用「下载成 1 个合并文件」。'
}

function exportOneFile() {
  const notes = picked.value.map((it) => it.note)
  downloadText(`publish-bundle-${new Date().toISOString().slice(0, 10)}.txt`, bundleAsText(notes, onlineNotes.value))
  markPublished(notes)
  items.value = withPublishState(getAllNotes())
  exportHint.value = `合并文件里有 ${notes.length} 篇正文和 1 份完整 index.json（共 ${onlineNotes.value.length} 篇），每段开头都标了文件名，照着新建即可。`
}

async function copyBundle() {
  try {
    await navigator.clipboard.writeText(bundleAsText(picked.value.map((it) => it.note), onlineNotes.value))
    exportHint.value = '发布包已复制到剪贴板（index.json 为完整清单）。'
  } catch {
    exportHint.value = '浏览器拒绝了剪贴板写入，请改用下载按钮。'
  }
}
</script>
