<template>
  <!-- NoteCard - 笔记卡片（内容层：完全静态，不做倾斜/扫光/浮动） -->
  <!-- 交互只有两种：hover 换边框色，按下换透明度。进场用一次性淡入（v-reveal） -->
  <article
    v-reveal="index * 60"
    class="card card-link group relative h-full p-4 sm:p-5 cursor-pointer active:opacity-90"
    @click="goTo"
  >
    <!-- 分类彩带：左上角一小段实色，静态 -->
    <span class="absolute top-0 left-5 w-10 h-1 rounded-b-full" :style="{ background: accent }"></span>

    <!-- 分类标签 + 日期 -->
    <div class="flex items-center justify-between gap-2 mb-2.5">
      <span class="badge" :style="{ background: soft, color: accent }">
        {{ note.category }}
      </span>
      <span class="text-[11px] sm:text-xs text-ink-400 font-mono shrink-0">{{ formatDate(note.updatedAt) }}</span>
    </div>

    <!-- 标题 -->
    <h3 class="font-bold text-[16px] sm:text-[17px] text-ink-900 leading-snug group-hover:text-primary transition-colors duration-150">
      {{ note.title }}
    </h3>

    <!-- 摘要：提取正文前 80 字 -->
    <p class="mt-1.5 text-[13px] sm:text-sm text-ink-500 leading-6 line-clamp-2 min-h-[2.6rem]">
      {{ excerpt }}
    </p>

    <!-- 标签行 -->
    <div v-if="note.tags && note.tags.length" class="mt-2.5 flex flex-wrap gap-1.5">
      <span v-for="tag in note.tags" :key="tag" class="badge">
        # {{ tag }}
      </span>
    </div>

    <!-- 底部：创建时间 + 阅读提示（提示常驻，不再 hover 才出现，手机上更友好） -->
    <div class="mt-3.5 pt-3 border-t border-ink-100 flex items-center justify-between text-[11px] sm:text-xs text-ink-400">
      <span>{{ formatDate(note.createdAt) }} 创建</span>
      <span class="flex items-center gap-1 text-primary font-medium">
        阅读 <span aria-hidden="true">→</span>
      </span>
    </div>
  </article>
</template>

<script setup>
// NoteCard.vue - 笔记卡片（首页与列表页共用）
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { extractExcerpt } from '../utils/markdown'
import { formatDate } from '../utils/storage'

// props：note 笔记对象；index 用于错峰入场顺序
const props = defineProps({
  note: { type: Object, required: true },
  index: { type: Number, default: 0 }
})

const router = useRouter()

// 摘要：去掉 Markdown 标记后取前 80 字
const excerpt = computed(() => extractExcerpt(props.note.content, 80))

// 分类配色：文字/边框用足够深的色值，保证白底上可读（对比度 > 4.5:1）
const PAIRS = {
  前端: { accent: '#0369A1', soft: '#E0F2FE' },
  后端: { accent: '#6D28D9', soft: '#EDE9FE' },
  算法: { accent: '#B45309', soft: '#FEF3C7' },
  工具: { accent: '#047857', soft: '#D1FAE5' },
  AI: { accent: '#BE123C', soft: '#FFE4E6' }
}
const FALLBACK = [
  { accent: '#0369A1', soft: '#E0F2FE' },
  { accent: '#6D28D9', soft: '#EDE9FE' },
  { accent: '#B45309', soft: '#FEF3C7' },
  { accent: '#047857', soft: '#D1FAE5' },
  { accent: '#BE123C', soft: '#FFE4E6' }
]

/** 按分类名取配色，取不到就用哈希兜底，保证卡片之间有区分度 */
const pair = computed(() => {
  if (PAIRS[props.note.category]) return PAIRS[props.note.category]
  const sum = [...(props.note.title || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0)
  return FALLBACK[sum % FALLBACK.length]
})
const accent = computed(() => pair.value.accent)
const soft = computed(() => pair.value.soft)

/** 点击卡片进入详情页 */
function goTo() {
  router.push(`/notes/${props.note.id}`)
}
</script>

<style scoped>
/* line-clamp 兜底（Tailwind 3 内置，但保留以防版本差异） */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
