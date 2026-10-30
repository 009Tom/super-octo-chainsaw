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
    </header>

    <!-- ===== 笔记卡片列表（筛选变化时只做淡入淡出，不缩放不位移） ===== -->
    <TransitionGroup
      tag="div"
      name="list"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
    >
      <NoteCard v-for="(note, i) in filteredNotes" :key="note.id" :note="note" :index="i" />
    </TransitionGroup>

    <!-- 空状态 -->
    <div v-if="filteredNotes.length === 0" class="card p-10 text-center mt-2">
      <p class="text-4xl mb-2" aria-hidden="true">🗒️</p>
      <p class="text-ink-500">没有找到符合条件的笔记</p>
      <p class="text-ink-400 text-sm mt-1">换个关键词或分类试试？</p>
      <RouterLink to="/write" class="btn btn-primary mt-5">✍️ 写一篇新的</RouterLink>
    </div>
  </div>
</template>

<script setup>
// NotesView.vue - 笔记列表页逻辑
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NoteCard from '../components/NoteCard.vue'
import { getAllNotes, CATEGORIES } from '../utils/storage'

const route = useRoute()
const router = useRouter()

const categories = CATEGORIES
const keyword = ref('') // 搜索关键词
const activeCategory = ref(route.query.category || '全部') // 当前分类（支持从 URL ?category=xx 初始化）

// 分类按钮上的小图标（纯粹为了好看）
const catIcon = { 全部: '🗄️', 前端: '🎨', 后端: '⚙️', 算法: '🧮', 工具: '🔧', AI: '🤖' }

// 同时监听搜索和分类，从 localStorage 取数据后在前端过滤
// （数据量小，直接全量过滤即可，无需后端分页）
const filteredNotes = computed(() => {
  let notes = getAllNotes()
  // 分类筛选
  if (activeCategory.value !== '全部') {
    notes = notes.filter((n) => n.category === activeCategory.value)
  }
  // 关键词筛选（标题 / 正文 / 标签，忽略大小写）
  const k = keyword.value.trim().toLowerCase()
  if (k) {
    notes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(k) ||
        n.content.toLowerCase().includes(k) ||
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
