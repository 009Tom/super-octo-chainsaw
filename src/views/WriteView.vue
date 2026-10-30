<template>
  <!-- WriteView - 写笔记页：表单 + Markdown 预览 -->
  <!-- 双端策略：电脑上「左编辑 / 右预览」并排；手机上用顶部标签切换，保证预览在手机上也能看 -->
  <div class="page-wrap">
    <!-- ===== 顶部标题 ===== -->
    <header class="card p-4 sm:p-6 mb-4">
      <h1 class="text-xl sm:text-2xl font-extrabold text-ink-900">✍️ 写一篇新笔记</h1>
      <p class="mt-1 text-[13px] sm:text-sm text-ink-500">
        Markdown 实时渲染，保存后会有小烟花 🎆（内容存在浏览器本地）
      </p>
    </header>

    <!-- ===== 提交成功提示 ===== -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
    >
      <div v-if="savedTip" class="mb-4 p-4 rounded-xl bg-white border border-accent text-[15px] text-ink-700">
        🎉 保存成功！已存进浏览器本地，<RouterLink to="/notes" class="text-primary font-semibold underline underline-offset-2">去笔记列表查看</RouterLink>
      </div>
    </Transition>

    <!-- 手机/平板用的视图切换（电脑上并排显示，这排标签自动隐藏） -->
    <div class="lg:hidden flex gap-2 mb-3">
      <button class="chip flex-1 justify-center" :class="tab === 'edit' ? 'chip-on' : ''" @click="tab = 'edit'">
        📝 编辑
      </button>
      <button class="chip flex-1 justify-center" :class="tab === 'preview' ? 'chip-on' : ''" @click="tab = 'preview'">
        👀 预览
      </button>
    </div>

    <form class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5" @submit.prevent="handleSubmit">
      <!-- ===== 编辑区 ===== -->
      <div class="card p-4 sm:p-5 space-y-4" :class="tab === 'edit' ? '' : 'hidden lg:block'">
        <!-- 标题 -->
        <div>
          <label for="title" class="label">标题 *</label>
          <input
            id="title"
            v-model.trim="form.title"
            type="text"
            autocomplete="off"
            placeholder="例如：Vue 3 组合式 API 使用总结"
            class="field"
            required
          />
        </div>

        <!-- 分类 + 标签：手机上下排列，宽屏两列 -->
        <div class="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <div>
            <label for="category" class="label">分类 *</label>
            <select id="category" v-model="form.category" class="field" required>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div>
            <label for="tags" class="label">标签（逗号分隔）</label>
            <input id="tags" v-model="form.tags" type="text" autocomplete="off" placeholder="例如：Vue, 组合式API" class="field" />
          </div>
        </div>

        <!-- Markdown 快捷工具栏 + 字数 -->
        <div>
          <p class="label">内容（Markdown）*</p>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <button
              v-for="t in toolbar"
              :key="t.label"
              type="button"
              class="tool-btn"
              :title="t.tip"
              @click="insertSnippet(t.text)"
            >{{ t.label }}</button>
            <span class="ml-auto self-center text-xs text-ink-400 font-mono tabular-nums">
              {{ form.content.length }} 字
            </span>
          </div>

          <textarea
            id="content"
            ref="contentEl"
            v-model="form.content"
            rows="14"
            placeholder="## 支持标准 Markdown 语法&#10;&#10;```js&#10;console.log('代码块会自动高亮')&#10;```"
            class="field font-mono leading-6 resize-y min-h-[40vh] lg:min-h-[440px]"
            required
          ></textarea>

          <!-- 写作进度：以 1200 字为满格 -->
          <div class="mt-2 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div class="h-full rounded-full bg-primary transition-[width] duration-300" :style="{ width: progress + '%' }"></div>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="flex gap-2.5">
          <button
            type="submit"
            class="btn btn-primary flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!form.title || !form.content"
          >
            💾 保存到本地
          </button>
          <button type="button" class="btn btn-soft" @click="resetForm">清空</button>
        </div>
      </div>

      <!-- ===== 预览区 ===== -->
      <div :class="tab === 'preview' ? '' : 'hidden lg:block'">
        <p class="label flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-accent"></span> 实时预览
        </p>
        <div class="card overflow-y-auto p-4 sm:p-6 markdown-body max-h-[70vh] lg:max-h-[calc(100dvh-11rem)] lg:sticky lg:top-20">
          <template v-if="form.content">
            <h1 v-if="form.title" class="!mt-0 text-xl sm:text-2xl font-bold text-ink-900 border-b border-ink-200 pb-2 mb-4">
              {{ form.title }}
            </h1>
            <!-- 预览复用详情页同款渲染逻辑 -->
            <div v-html="previewHtml"></div>
          </template>
          <p v-else class="text-ink-400 text-sm">
            <span class="text-3xl block mb-2">👀</span>
            输入 Markdown，这里会实时显示渲染效果…
          </p>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
// WriteView.vue - 写笔记页逻辑
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { addNote, CATEGORIES } from '../utils/storage'
import { renderMarkdown } from '../utils/markdown'
import { celebrate } from '../utils/fx'

const router = useRouter()
const categories = CATEGORIES

const savedTip = ref(false) // 是否显示"保存成功"提示
const contentEl = ref(null) // 正文输入框，用于插入快捷语法
const tab = ref('edit') // 手机端在「编辑 / 预览」之间切换

// 表单数据（reactive 对象统一管理）
const form = reactive({
  title: '',
  category: categories[0],
  tags: '',
  content: ''
})

// Markdown 快捷工具栏（点一下就在光标处插入模板）
const toolbar = [
  { label: 'H2', tip: '二级标题', text: '\n## 标题\n' },
  { label: 'B', tip: '加粗', text: '**粗体**' },
  { label: 'i', tip: '斜体', text: '*斜体*' },
  { label: '`code`', tip: '行内代码', text: '`代码`' },
  { label: '```js```', tip: '代码块', text: '\n```js\n\n```\n' },
  { label: '- list', tip: '无序列表', text: '\n- 条目一\n- 条目二\n' },
  { label: '> quote', tip: '引用', text: '\n> 引用内容\n' },
  { label: '[]()', tip: '链接', text: '[文字](https://)' },
  { label: '| 表格 |', tip: '表格模板', text: '\n| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |\n' }
]

/**
 * 把一段 Markdown 模板插入到光标位置（保留原有内容）
 * @param {string} text 要插入的文本
 */
function insertSnippet(text) {
  const el = contentEl.value
  if (!el) {
    form.content += text
    return
  }
  const start = el.selectionStart ?? form.content.length
  const end = el.selectionEnd ?? start
  form.content = form.content.slice(0, start) + text + form.content.slice(end)
  // 下一帧重新聚焦并把光标放到插入内容之后
  requestAnimationFrame(() => {
    el.focus()
    const pos = start + text.length
    el.setSelectionRange(pos, pos)
  })
}

// 写作进度：以 1200 字为满格（上限 100%）
const progress = computed(() => Math.min(100, Math.round((form.content.length / 1200) * 100)))

// 实时预览的 HTML
const previewHtml = computed(() => renderMarkdown(form.content))

// 提交表单 -> 写入 localStorage
function handleSubmit() {
  if (!form.title || !form.content) return

  addNote({
    title: form.title,
    category: form.category,
    // 标签支持中文/英文逗号分隔
    tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
    content: form.content
  })

  // 放烟花庆祝一下，然后显示成功提示并清空表单
  celebrate(70)
  savedTip.value = true
  resetForm()
  setTimeout(() => router.push('/notes'), 1200)
}

// 清空表单
function resetForm() {
  form.title = ''
  form.category = categories[0]
  form.tags = ''
  form.content = ''
  tab.value = 'edit'
}
</script>

<style scoped>
/* Markdown 快捷按钮：静态小方块，hover 只换颜色 */
.tool-btn {
  @apply px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-white border border-ink-200 text-ink-500
         transition-colors duration-150 active:opacity-80;
}
@media (hover: hover) {
  .tool-btn:hover {
    @apply border-primary/50 text-primary;
  }
}
</style>
