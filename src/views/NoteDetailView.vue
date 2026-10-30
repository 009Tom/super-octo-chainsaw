<template>
  <!-- NoteDetailView - 笔记详情页：渲染 Markdown 正文（内容层静态，阅读优先） -->
  <div v-if="note" class="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-16">
    <!-- ===== 顶部操作栏：手机上也能轻松点（44px 触摸区） ===== -->
    <div class="flex items-center justify-between gap-2 mb-4">
      <button class="btn btn-soft btn-sm" @click="goBack">← 返回列表</button>
      <button class="btn btn-danger btn-sm" @click="handleDelete">🗑 删除</button>
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
      <!-- v-html 插入的是自己本地生成的内容（代码块已经过 highlight.js 转义），风险可控 -->
      <div class="markdown-body" v-html="renderedHtml"></div>
    </article>

    <!-- 底部操作：再读一篇的入口 -->
    <div class="flex items-center justify-between mt-5 gap-3">
      <RouterLink to="/notes" class="btn btn-soft btn-sm">← 回列表选下一篇</RouterLink>
      <RouterLink to="/write" class="btn btn-primary btn-sm">✍️ 写新笔记</RouterLink>
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
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getNoteById, deleteNote, formatDate } from '../utils/storage'
import { renderMarkdown } from '../utils/markdown'

const route = useRoute()
const router = useRouter()

// 根据 URL 参数 id 查找笔记
const note = computed(() => getNoteById(route.params.id))

// 把 Markdown 转成 HTML（含代码高亮）
const renderedHtml = computed(() => renderMarkdown(note.value?.content || ''))

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
