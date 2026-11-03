<template>
  <!-- NotesView - 笔记列表页：分类筛选 + 关键词搜索（内容静态，白卡 + 实色按钮） -->
  <div class="page-wrap">
    <!-- ===== 顶部标题栏 ===== -->
    <header class="card p-4 sm:p-6 mb-5">
      <div class="flex items-center gap-2.5 flex-wrap">
        <h1 class="text-xl sm:text-2xl font-extrabold text-ink-900">全部笔记</h1>
        <span class="badge-primary font-mono">{{ filteredNotes.length }} 篇</span>
      </div>
      <p class="mt-1 text-[13px] sm:text-sm text-ink-500">按分类、关键词找出你想复看的那一篇。</p>

      <!-- ===== 搜索框 + 分类筛选 ===== -->
      <div class="flex flex-col lg:flex-row lg:items-center gap-3 mt-4">
        <!-- 关键词搜索：手机上占满一行，电脑上弹性伸展 -->
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">🔍</span>
          <input
            v-model="keyword"
            type="search"
            inputmode="search"
            placeholder="搜索标题、内容或标签…"
            class="field pl-10 pr-10"
          />
          <button
            v-if="keyword"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
            aria-label="清空搜索"
            @click="keyword = ''"
          >✕</button>
        </div>

        <!-- 分类按钮组：手机上横向滑动，选中项实心蓝 -->
        <div class="flex gap-2 overflow-x-auto no-bar pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
          <button
            v-for="cat in ['全部', ...categories]"
            :key="cat"
            class="chip shrink-0"
            :class="activeCategory === cat ? 'chip-on' : ''"
            @click="selectCategory(cat)"
          >{{ catIcon[cat] }} {{ cat }}</button>
        </div>
      </div>

      <!-- ===== 数据源切换：已发布（GitHub）/ 本地草稿 ===== -->
      <!-- 数据源切换器只给作者看：访客不需要知道「本地草稿」这个概念 -->
      <div v-if="CAN_EDIT && repoReady" class="flex items-center gap-3 flex-wrap mt-4">
        <div class="inline-flex p-1 rounded-xl bg-ink-100">
          <button
            class="min-h-[34px] px-3 rounded-lg text-[13px] font-medium transition-colors"
            :class="source === 'published' ? 'bg-white text-primary shadow-sm' : 'text-ink-500'"
            @click="source = 'published'"
          >🌐 已发布 {{ published.length }}</button>
          <button
            class="min-h-[34px] px-3 rounded-lg text-[13px] font-medium transition-colors"
            :class="source === 'draft' ? 'bg-white text-primary shadow-sm' : 'text-ink-500'"
            @click="source = 'draft'"
          >📝 本地草稿 {{ draftCount }}</button>
        </div>
        <span v-if="source === 'published' && pub.updated" class="text-xs text-ink-400">
          清单更新于 {{ formatDate(pub.updated) }}
        </span>
        <button v-if="source === 'published'" class="text-xs text-ink-400 underline" @click="loadPublished(true)">
          强制刷新
        </button>
      </div>
      <p v-else-if="CAN_EDIT" class="mt-4 text-[13px] text-ink-500">
        这里显示的是这台设备上的本地草稿。想让大家都能看，去
        <RouterLink to="/publish" class="text-primary underline">发布中心</RouterLink> 配置 GitHub 仓库。
      </p>
    </header>

    <!-- 读取状态：已发布列表是异步拉的，必须有加载态与失败提示，不能白屏 -->
    <p v-if="showLoading" class="card p-4 mb-4 text-sm text-ink-500">正在从 GitHub 读取已发布笔记…</p>
    <div
      v-else-if="source === 'published' && pub.error"
      class="mb-4 p-3 rounded-xl border bg-amber-50 border-amber-200 text-[13px] text-amber-900"
    >
      读取失败：{{ pub.error }}
      <button class="underline ml-1" @click="loadPublished(true)">重试</button>
      <span v-if="published.length">（下面显示的是上次成功读取的结果）</span>
    </div>

    <!-- ===== 笔记卡片列表（筛选变化时只做淡入淡出，不缩放不位移） ===== -->
    <TransitionGroup
      tag="div"
      name="list"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
    >
      <NoteCard v-for="(note, i) in filteredNotes" :key="note.id" :note="note" :index="i" />
    </TransitionGroup>

    <!-- 空状态 -->
    <div v-if="filteredNotes.length === 0 && !showLoading" class="card p-10 text-center mt-2">
      <p class="text-4xl mb-2" aria-hidden="true">🗒️</p>
      <p class="text-ink-500">没有找到符合条件的笔记</p>
      <p class="text-ink-400 text-sm mt-1">
        {{ source === 'published'
            ? (CAN_EDIT ? '换个关键词或分类，或去发布中心把草稿传上去' : '换个关键词或分类试试')
            : '换个关键词或分类试试？' }}
      </p>
      <!-- 访客没有写入与发布入口，空列表时不给按钮 -->
      <RouterLink v-if="CAN_EDIT" :to="source === 'published' ? '/publish' : '/write'" class="btn btn-primary mt-5">
        {{ source === 'published' ? '📤 去发布中心' : '✍️ 写一篇新的' }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
// NotesView.vue - 笔记列表页逻辑
// 双数据源：已发布（从 GitHub 仓库的 index.json 读）+ 本地草稿（localStorage）
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NoteCard from '../components/NoteCard.vue'
import { getAllNotes, CATEGORIES, formatDate } from '../utils/storage'
import { isRepoReady, fetchPublishedNotes, noteExcerpt } from '../utils/repo'
import { CAN_EDIT } from '../utils/authorMode'

const route = useRoute()
const router = useRouter()

const categories = CATEGORIES
const keyword = ref('') // 搜索关键词
const activeCategory = ref(route.query.category || '全部') // 当前分类（支持从 URL ?category=xx 初始化）

// 分类按钮上的小图标（纯粹为了好看）
const catIcon = { 全部: '🗄️', 前端: '🎨', 后端: '⚙️', 算法: '🧮', 工具: '🔧', AI: '🤖' }

// ===== 已发布数据源 =====
const repoReady = isRepoReady()
const source = ref(repoReady ? 'published' : 'draft')
const published = ref([])
const draftCount = computed(() => getAllNotes().length)
const pub = ref({ loading: false, error: '', updated: '' })
const showLoading = computed(() => source.value === 'published' && pub.value.loading && !published.value.length)

async function loadPublished(force = false) {
  pub.value = { ...pub.value, loading: true, error: '' }
  const r = await fetchPublishedNotes(force)
  if (r.ok) {
    published.value = r.notes
    pub.value = { loading: false, error: '', updated: r.updated || '' }
  } else {
    // 失败时保留上一次的结果，只把错误显示出来
    published.value = r.notes || published.value
    pub.value = { loading: false, error: r.error || '未知错误', updated: pub.value.updated }
  }
}

if (repoReady) loadPublished()

// 当前数据源的全量列表
const baseNotes = computed(() =>
  source.value === 'published' ? published.value : getAllNotes()
)

// 同时监听搜索和分类，在前端过滤
// （数据量小，直接全量过滤即可，无需后端分页）
const filteredNotes = computed(() => {
  let notes = [...baseNotes.value]
  // 分类筛选
  if (activeCategory.value !== '全部') {
    notes = notes.filter((n) => n.category === activeCategory.value)
  }
  // 关键词筛选（标题 / 正文或摘要 / 标签，忽略大小写）
  const k = keyword.value.trim().toLowerCase()
  if (k) {
    notes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(k) ||
        (n.content || noteExcerpt(n, 9999)).toLowerCase().includes(k) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(k))
    )
  }
  return notes
})

// 点击分类：更新状态并同步到 URL（方便分享链接定位分类）
function selectCategory(cat) {
  activeCategory.value = cat
  router.replace({ query: { ...route.query, category: cat === '全部' ? undefined : cat } })
}

// URL 上的分类变化时（比如从首页点击标签跳过来），同步到页面状态
watch(() => route.query.category, (val) => {
  activeCategory.value = val || '全部'
})
</script>

<style scoped>
/* 筛选时的进出动画：只做透明度补间（内容层不做位移/缩放），位置变化平滑让位 */
.list-enter-active,
.list-leave-active {
  transition: opacity 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
}
.list-leave-active {
  position: absolute;
}
.list-move {
  transition: transform 0.35s ease;
}
</style>
