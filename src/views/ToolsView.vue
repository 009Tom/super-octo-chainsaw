<template>
  <!-- ToolsView - 开发者工具箱：程序员常用的网站与工具导航（数据来自 src/data/tools.js） -->
  <!-- 内容层静态：白卡 + 实色按钮，hover 只换边框色 -->
  <div class="page-wrap">
    <!-- ===== 顶部标题区 ===== -->
    <header class="card p-4 sm:p-6 mb-5">
      <h1 class="text-xl sm:text-2xl font-extrabold text-ink-900">开发者工具箱 ⚡</h1>
      <p class="mt-1.5 text-[13px] sm:text-sm text-ink-500 leading-6 max-w-2xl">
        平时写代码离不开的网站合集——查文档、跑代码、转正则、调色、压缩图片、刷算法都在这里。
        点击卡片在新标签页打开，共
        <strong class="text-primary font-mono">{{ TOOLS.length }}</strong> 个工具，
        <strong class="text-ink-700 font-mono">{{ TOOL_CATS.length }}</strong> 类。
      </p>

      <!-- 搜索框 + 随机推荐 -->
      <div class="flex flex-col sm:flex-row gap-3 mt-4">
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">🔍</span>
          <input
            v-model.trim="keyword"
            type="search"
            inputmode="search"
            placeholder="搜索工具名称、用途或关键词，比如「正则」「JSON」"
            class="field pl-10 pr-10"
          />
          <button
            v-if="keyword"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
            aria-label="清空搜索"
            @click="keyword = ''"
          >✕</button>
        </div>
        <!-- 随机推荐：点一下随机打开一个工具 -->
        <button class="btn btn-primary shrink-0" @click="luckyPick">🎲 随机用一个</button>
      </div>

      <!-- 分类切换：手机上横向滑动 -->
      <div class="flex gap-2 overflow-x-auto no-bar pb-1 mt-4 sm:flex-wrap sm:overflow-visible sm:pb-0">
        <button
          v-for="c in ['全部', ...TOOL_CATS]"
          :key="c"
          class="chip shrink-0"
          :class="activeCat === c ? 'chip-on' : ''"
          @click="activeCat = c"
        >
          {{ c }}
          <span v-if="c !== '全部'" class="opacity-70">{{ countOf(c) }}</span>
        </button>
      </div>
    </header>

    <!-- ===== 工具卡片网格：手机 1 列 / 小屏 2 列 / 平板 3 列 / 电脑 4 列 ===== -->
    <TransitionGroup
      tag="div"
      name="tool"
      class="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
    >
      <a
        v-for="t in filtered"
        :key="t.name"
        :href="t.url"
        target="_blank"
        rel="noopener noreferrer"
        class="card card-link group relative block p-4 no-underline active:opacity-90"
      >
        <!-- 图标 + 名称 -->
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 shrink-0 rounded-xl grid place-items-center text-lg bg-ink-100 border border-ink-200">
            {{ t.icon }}
          </span>
          <div class="min-w-0">
            <h3 class="font-bold text-[15px] text-ink-900 truncate group-hover:text-primary transition-colors duration-150">
              {{ t.name }}
            </h3>
            <p class="text-[11px] text-ink-400 font-mono truncate">{{ hostOf(t.url) }}</p>
          </div>
        </div>

        <!-- 用途说明 -->
        <p class="mt-2.5 text-[13px] text-ink-500 leading-6 line-clamp-2 min-h-[2.5rem]">
          {{ t.desc }}
        </p>

        <!-- 底部：分类 + 打开提示（常驻，手机上也能看见） -->
        <div class="mt-3 pt-2.5 border-t border-ink-100 flex items-center justify-between gap-2">
          <span class="badge">{{ t.cat }}</span>
          <span class="text-xs text-primary font-medium flex items-center gap-1">
            打开 <span aria-hidden="true">↗</span>
          </span>
        </div>
      </a>
    </TransitionGroup>

    <!-- 空状态：搜索没命中 -->
    <div v-if="filtered.length === 0" class="card p-10 text-center mt-2">
      <div class="text-4xl mb-2" aria-hidden="true">🔭</div>
      <p class="text-ink-500">没找到和「{{ keyword || activeCat }}」相关的工具</p>
      <button class="btn btn-soft mt-4" @click="keyword = ''; activeCat = '全部'">重置筛选</button>
    </div>

    <!-- 底部小提示 -->
    <p class="mt-6 text-center text-xs text-ink-400 leading-6 px-2">
      💡 在页面空白处移动鼠标，背景粒子会跟着形成涡流；随手点击还会有烟花 ✨
    </p>
  </div>
</template>

<script setup>
// ToolsView.vue - 工具箱逻辑：搜索 + 分类筛选 + 随机推荐
import { ref, computed } from 'vue'
import { TOOLS, TOOL_CATS } from '../data/tools'

const keyword = ref('')
const activeCat = ref('全部')

/** 某分类下的工具数量 */
function countOf(cat) {
  return TOOLS.filter((t) => t.cat === cat).length
}

// 关键字 + 分类双重过滤
const filtered = computed(() => {
  const kw = keyword.value.toLowerCase()
  return TOOLS.filter((t) => {
    const catOk = activeCat.value === '全部' || t.cat === activeCat.value
    const kwOk = !kw || `${t.name} ${t.desc} ${t.cat}`.toLowerCase().includes(kw)
    return catOk && kwOk
  })
})

/** 从 url 里取出域名显示在卡片上 */
function hostOf(url) {
  return url.replace(/^https?:\/\//, '').split('/')[0]
}

/** 随机推荐：从当前筛选结果里挑一个直接打开 */
function luckyPick() {
  const list = filtered.value.length ? filtered.value : TOOLS
  const pick = list[Math.floor(Math.random() * list.length)]
  window.open(pick.url, '_blank', 'noopener')
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 筛选/搜索时的进出动画：只做透明度补间 */
.tool-enter-active,
.tool-leave-active {
  transition: opacity 0.3s ease;
}
.tool-enter-from,
.tool-leave-to {
  opacity: 0;
}
.tool-leave-active {
  position: absolute;
}
.tool-move {
  transition: transform 0.35s ease;
}
</style>
