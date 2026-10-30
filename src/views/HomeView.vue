<template>
  <!-- HomeView - 首页（内容层全部静态：白卡 + 实色按钮，动效交给背景层） -->
  <div class="page-wrap space-y-8">
    <!-- ===== Hero：只留站名与入口，不写个人信息 ===== -->
    <section class="card p-5 sm:p-8">
      <p class="eyebrow">Learning Notes · Lab</p>
      <h1 class="mt-2 text-2xl sm:text-4xl font-extrabold text-ink-900 leading-tight tracking-tight">
        学习笔记 <span class="text-primary">Lab</span>
      </h1>
      <p class="mt-2.5 text-sm sm:text-base text-ink-500 leading-relaxed max-w-2xl">
        笔记 · AI 助手 · 开发者工具箱。学到的东西写成 Markdown 存下来，随时翻出来复习。
      </p>

      <!-- 数据统计：静态白底描边，数字用深色，一眼能读 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <div v-for="stat in stats" :key="stat.label" class="rounded-xl border border-ink-200 bg-ink-50 px-3 py-3 text-center">
          <div class="text-xl sm:text-2xl font-black text-ink-900 font-mono tabular-nums">
            {{ stat.display.value }}<span class="text-sm font-semibold text-ink-400">{{ stat.suffix }}</span>
          </div>
          <div class="text-[11px] sm:text-xs text-ink-500 mt-0.5">{{ stat.label }}</div>
        </div>
      </div>

      <!-- 入口按钮：主按钮实色蓝 + 白字，对比度足够 -->
      <div class="flex flex-wrap gap-2.5 mt-6">
        <RouterLink to="/notes" class="btn btn-primary">📚 浏览全部笔记</RouterLink>
        <RouterLink to="/chat" class="btn btn-primary">🤖 问问 AI 助手</RouterLink>
        <RouterLink to="/tools" class="btn btn-soft">🧰 开发者工具箱</RouterLink>
        <button class="btn btn-ghost" @click="replaySplash">▶ 重放开屏动画</button>
      </div>

      <!-- 技术栈：静态胶囊行，手机上横向可滑 -->
      <div class="mt-6 pt-5 border-t border-ink-100">
        <p class="eyebrow mb-2.5">Stack</p>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="t in techs" :key="t" class="badge font-mono">{{ t }}</span>
        </div>
      </div>
    </section>

    <!-- ===== 分类导航 ===== -->
    <section v-reveal>
      <h2 class="section-title mb-3.5">按分类快速进入</h2>
      <!-- 手机上不换行、可横滑（no-bar 隐藏滚动条） -->
      <div class="flex gap-2 overflow-x-auto no-bar pb-1 sm:flex-wrap sm:overflow-visible">
        <RouterLink
          v-for="cat in categories"
          :key="cat"
          :to="`/notes?category=${encodeURIComponent(cat)}`"
          class="chip shrink-0"
        >
          <span aria-hidden="true">{{ catIcon[cat] || '📌' }}</span>
          {{ cat }}
          <span class="text-ink-400">{{ countOf(cat) }}篇</span>
        </RouterLink>
      </div>
    </section>

    <!-- ===== 最新学习笔记 ===== -->
    <section>
      <div class="flex items-center justify-between mb-3.5">
        <h2 class="section-title">最新笔记</h2>
        <RouterLink to="/notes" class="btn btn-soft btn-sm shrink-0 ml-3">
          查看全部 →
        </RouterLink>
      </div>

      <!-- 卡片网格：手机 1 列 / 平板 2 列 / 电脑 3 列 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <NoteCard v-for="(note, i) in latestNotes" :key="note.id" :note="note" :index="i" />
      </div>

      <!-- 空状态：静态卡片 -->
      <div v-if="latestNotes.length === 0" class="card p-10 text-center">
        <div class="text-4xl mb-2" aria-hidden="true">🌱</div>
        <p class="text-ink-500">还没有笔记</p>
        <RouterLink to="/write" class="btn btn-primary mt-4">去写第一篇 →</RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
// HomeView.vue - 首页逻辑（统计 + 分类 + 最新笔记）
import { computed, reactive } from 'vue'
import NoteCard from '../components/NoteCard.vue'
import { getAllNotes, CATEGORIES } from '../utils/storage'
import { TOOLS } from '../data/tools'

const categories = CATEGORIES

// 只取最新 6 篇（getAllNotes 已按更新时间倒序）
const allNotes = getAllNotes()
const latestNotes = computed(() => allNotes.slice(0, 6))

/** 统计某分类下的笔记数量，显示在胶囊上 */
function countOf(cat) {
  return allNotes.filter((n) => n.category === cat).length
}

const catIcon = { 前端: '🎨', 后端: '⚙️', 算法: '🧮', 工具: '🔧', AI: '🤖' }

// ===== 技术栈（静态展示） =====
const techs = ['Vue 3', 'Vite', 'Tailwind CSS', 'JavaScript', 'Node.js', 'Git', 'Markdown',
  'DeepSeek AI', 'highlight.js', 'localStorage', 'Vue Router', '响应式设计']

// ===== 统计数字 =====
const stats = reactive([
  { label: '累计笔记', suffix: ' 篇', display: { value: 0 } },
  { label: '知识分类', suffix: ' 类', display: { value: 0 } },
  { label: '收录工具', suffix: ' 个', display: { value: 0 } },
  { label: '坚持天数', suffix: ' 天', display: { value: 0 } }
])
// 统计数字：笔记数与工具数从真实数据取，坚持天数为手写常量（想改直接改这里）
const STREAK_DAYS = 128
const targets = [allNotes.length, CATEGORIES.length, TOOLS.length, STREAK_DAYS]

/**
 * 数字增长动画：只在首屏一次、1.2s 结束。
 * 系统要求减少动效时直接显示终值。
 */
function runCountUp() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stats.forEach((s, i) => { s.display.value = targets[i] })
    return
  }
  const start = performance.now()
  const duration = 1200
  function tick(now) {
    const p = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    stats.forEach((s, i) => { s.display.value = Math.round(targets[i] * eased) })
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

runCountUp()

// ===== 重放开屏动画：清掉"已看过"标记并刷新 =====
function replaySplash() {
  sessionStorage.removeItem('splash_seen_v2')
  location.reload()
}
</script>
