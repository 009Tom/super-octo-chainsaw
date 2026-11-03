<template>
  <!-- NoteDetailView - 笔记详情页：渲染 Markdown 正文（内容层静态，阅读优先） -->
  <div v-if="note" class="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-16">
    <!-- ===== 顶部操作栏：手机上也能轻松点（44px 触摸区） ===== -->
    <div class="flex items-center justify-between gap-2 mb-4">
      <button class="btn btn-soft btn-sm" @click="goBack">← 返回列表</button>
      <!-- 已发布的笔记不在本地，改和删都要回 GitHub 仓库 -->
      <div v-if="isPublished" class="flex items-center gap-2 min-w-0">
        <span class="badge shrink-0">🌐 GitHub</span>
        <a v-if="repoReady" :href="editUrl" target="_blank" rel="noopener" class="btn btn-soft btn-sm shrink-0">
          {{ CAN_EDIT ? '在 GitHub 上改' : '在 GitHub 上查看' }}
        </a>
      </div>
      <button v-else class="btn btn-danger btn-sm" @click="handleDelete">🗑 删除</button>
    </div>

    <!-- ===== 文章卡片：不透明白底，把背景动效完全挡住 ===== -->
    <article class="card p-5 sm:p-8">
      <div class="flex flex-wrap items-center gap-2.5 mb-3">
        <span class="badge-primary">{{ note.category }}</span>
        <time class="text-xs text-ink-400 font-mono">更新于 {{ formatDate(note.updatedAt, true) }}</time>
      </div>

      <h1 class="text-[22px] sm:text-3xl font-extrabold text-ink-900 leading-tight">
        {{ note.title }}
      </h1>
      <!-- 标题下细分隔线（静态） -->
      <div class="mt-3.5 mb-4 h-[2px] rounded-full bg-primary/25"></div>

      <div v-if="note.tags && note.tags.length" class="flex flex-wrap gap-1.5 mb-6">
        <span v-for="tag in note.tags" :key="tag" class="badge">#{{ tag }}</span>
      </div>

      <!-- ===== Markdown 渲染区域 ===== -->
      <p v-if="bodyLoading" class="text-sm text-ink-500 py-6">正在从 GitHub 拉取正文…</p>
      <div v-else-if="bodyError"
           class="p-3 rounded-xl border bg-amber-50 border-amber-200 text-[13px] text-amber-900">
        正文加载失败：{{ bodyError }}
        <button class="underline ml-1" @click="resolveAndLoad">重试</button>
      </div>
      <!-- v-html 的内容来自本地草稿或你自己的仓库（代码块已经过 highlight.js 转义），风险可控 -->
      <div v-else class="markdown-body" v-html="renderedHtml"></div>
    </article>

    <!-- 底部操作：再读一篇的入口 -->
    <div class="flex items-center justify-between mt-5 gap-3">
      <RouterLink to="/notes" class="btn btn-soft btn-sm">← 回列表选下一篇</RouterLink>
      <RouterLink v-if="CAN_EDIT" to="/write" class="btn btn-primary btn-sm">✍️ 写新笔记</RouterLink>
    </div>
  </div>

  <!-- 已发布笔记需要先拉清单，期间不算“不存在” -->
  <div v-else-if="resolving" class="page-wrap">
    <div class="card p-10 text-center">
      <p class="text-sm text-ink-500">正在从 GitHub 读取…</p>
    </div>
  </div>

  <!-- 笔记不存在（id 错误或已删除） -->
  <div v-else class="page-wrap">
    <div class="card p-10 text-center">
      <p class="text-5xl mb-3" aria-hidden="true">😢</p>
      <p class="text-ink-500 mb-5">笔记不存在或已被删除</p>
      <RouterLink to="/notes" class="btn btn-primary">返回笔记列表</RouterLink>
    </div>
  </div>

  <!-- 回到顶部：固定在右下角，不占文档流，手机上不挡内容 -->
  <button
    v-show="showTop"
    class="fab"
    aria-label="回到顶部"
    @click="scrollTop"
  >↑</button>
</template>

<script setup>
// NoteDetailView.vue - 详情页逻辑
// 两种来源：本地草稿（id = note-xxx）与已发布笔记（id = pub:xxx，正文从 GitHub 拉）
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getNoteById, deleteNote, formatDate } from '../utils/storage'
import { renderMarkdown } from '../utils/markdown'
import { isRepoReady, fetchPublishedNotes, fetchPublishedBody, repoWebUrl } from '../utils/repo'
import { CAN_EDIT } from '../utils/authorMode'

const route = useRoute()
const router = useRouter()

const repoReady = isRepoReady()
const isPublished = computed(() => String(route.params.id).startsWith('pub:'))

// 本地笔记同步取；已发布笔记要先拉清单，所以是响应式变量
const localNote = computed(() => (isPublished.value ? null : getNoteById(route.params.id)))
const pubNote = ref(null)
const note = computed(() => localNote.value || pubNote.value)

const body = ref('')                 // 已发布笔记的 Markdown 正文
const bodyLoading = ref(false)
const bodyError = ref('')
const resolving = ref(false)         // 正在拉清单且还没有笔记对象

// 指向仓库里那个 .md 文件，点了就能在 GitHub 上直接编辑
const editUrl = computed(() =>
  pubNote.value ? `${repoWebUrl()}/${pubNote.value.file}` : repoWebUrl()
)

/** 解析并加载当前 URL 对应的笔记 */
async function resolveAndLoad() {
  pubNote.value = null
  body.value = ''
  bodyError.value = ''
  if (!isPublished.value) return
  if (!repoReady) {
    bodyError.value = '这台设备还没有配置 GitHub 仓库'
    return
  }

  resolving.value = true
  bodyLoading.value = true
  const list = await fetchPublishedNotes()
  const found = (list.notes || []).find((n) => n.id === route.params.id)
  pubNote.value = found || null
  resolving.value = false
  if (!found) {
    bodyLoading.value = false
    bodyError.value = '在清单里找不到这篇（可能已改名或删除）'
    return
  }

  const r = await fetchPublishedBody(found)
  bodyLoading.value = false
  if (r.ok) body.value = r.content
  else bodyError.value = r.error
}

watch(() => route.params.id, resolveAndLoad, { immediate: true })

// 把 Markdown 转成 HTML（含代码高亮）
const renderedHtml = computed(() =>
  renderMarkdown(isPublished.value ? body.value : note.value?.content || '')
)

// "回到顶部"按钮只在页面下滚后出现
const showTop = ref(false)
function onScroll() {
  showTop.value = window.scrollY > 320
}
function scrollTop() {
  // 系统要求减少动效时用瞬时滚动
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

// 返回：有历史记录就后退，否则直接去列表页
function goBack() {
  if (window.history.state?.back) {
    router.back()
  } else {
    router.push('/notes')
  }
}

// 删除笔记（确认后从 localStorage 移除并返回列表）
function handleDelete() {
  if (confirm(`确定删除《${note.value.title}》吗？此操作不可恢复。`)) {
    deleteNote(note.value.id)
    router.push('/notes')
  }
}
</script>
