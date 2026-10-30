// storage.js - 本地数据存储层（localStorage 封装）
// 网站没有后端，所有笔记数据都存在浏览器 localStorage 里。
// 第一次访问时会自动写入几条示例笔记（seed），方便预览效果。

const STORAGE_KEY = 'learning_notes_v1'

// 支持的分类列表（写死在这里，方便统一维护；AI 分类存放聊天助手存的笔记）
export const CATEGORIES = ['前端', '后端', '算法', '工具', 'AI']

// ========== 示例笔记数据（首次运行时写入 localStorage） ==========
const SEED_NOTES = [
  {
    id: 'seed-1',
    title: 'Vue 3 响应式原理：ref 和 reactive 的区别',
    category: '前端',
    tags: ['Vue', '响应式'],
    createdAt: '2026-08-12T09:30:00.000Z',
    updatedAt: '2026-08-12T09:30:00.000Z',
    content: `# Vue 3 响应式原理

Vue 3 使用 \`Proxy\` 替代了 Vue 2 的 \`Object.defineProperty\`，性能与兼容性都更好。

## ref vs reactive

| 特性 | ref | reactive |
| --- | --- | --- |
| 适用类型 | 任意类型 | 对象 / 数组 |
| 访问方式 | 需要 \`.value\` | 直接访问 |
| 整体替换 | 支持 | 不支持（会丢失响应性） |

\`\`\`js
import { ref, reactive } from 'vue'

// ref：适合基本类型
const count = ref(0)
count.value++

// reactive：适合对象
const state = reactive({ name: 'Tom', age: 20 })
state.age++
\`\`\`

> 经验法则：基本类型用 ref，对象用 reactive，不确定就用 ref。

## 小结

1. 响应式的核心是 **依赖收集 + 派发更新**
2. \`effect\` 是响应式系统的底层引擎
`
  },
  {
    id: 'seed-2',
    title: 'Node.js 事件循环通俗解读',
    category: '后端',
    tags: ['Node.js', '并发'],
    createdAt: '2026-09-02T14:20:00.000Z',
    updatedAt: '2026-09-02T14:20:00.000Z',
    content: `# Node.js 事件循环

Node.js 是单线程的，但通过 **事件循环（Event Loop）** 实现了非阻塞 I/O。

## 六个阶段

- **timers**：执行 setTimeout / setInterval 回调
- **pending callback**：执行上一轮延迟的系统回调
- **idle / prepared**：内部使用
- **poll**：获取新的 I/O 事件，执行对应回调
- **check**：执行 setImmediate 回调
- **close callback**：执行关闭事件的回调

\`\`\`js
setTimeout(() => console.log('timer'), 0)
setImmediate(() => console.log('immediate'))
// 在 I/O 回调中：immediate 先于 timer
\`\`\`

> 微任务（Promise）在每一个阶段切换之间被清空。
`
  },
  {
    id: 'seed-3',
    title: '二分查找的边界问题总结',
    category: '算法',
    tags: ['二分', 'LeetCode'],
    createdAt: '2026-09-20T20:00:00.000Z',
    updatedAt: '2026-09-20T20:00:00.000Z',
    content: `# 二分查找的边界问题

二分查找最难的地方在于 **边界条件**：什么时候 \`left = mid\`，什么时候 \`left = mid + 1\`。

## 通用模板（左闭右闭）

\`\`\`python
def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
\`\`\`

## 记忆要点

1. \`while left <= right\` 对应左闭右闭区间
2. 求 **左边界** 时收缩 right，求 **右边界** 时收缩 left
3. 死循环多半因为 \`mid\` 取整方向，必要时 \`mid = left + (right - left + 1) // 2\`
`
  },
  {
    id: 'seed-4',
    title: 'Git 常用命令与后悔药',
    category: '工具',
    tags: ['Git', '效率'],
    createdAt: '2026-10-15T11:00:00.000Z',
    updatedAt: '2026-10-15T11:00:00.000Z',
    content: `# Git 常用命令与后悔药

## 日常操作

\`\`\`bash
git status              # 查看工作区状态
git add -p              # 交互式分块暂存
git commit --amend      # 修改最后一次提交
git log --oneline --graph -20
\`\`\`

## 后悔药

- 撤销暂存：\`git restore --staged file\`
- 丢弃修改：\`git restore file\`
- 误删提交：\`git reflog\` 找到 hash，再 \`git reset --hard <hash>\`

> reflog 至少保留 90 天，几乎能救回所有本地误操作。
`
  }
]

// ========== 内部工具 ==========

/**
 * 读取全部笔记（不做初始化）
 */
function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // JSON 解析失败时视为数据损坏，返回 null
    return null
  }
}

/**
 * 确保 localStorage 中已有数据：首次访问写入示例笔记
 */
function ensureSeeded() {
  if (localStorage.getItem(STORAGE_KEY) === null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTES))
  }
}

// ========== 对外 API ==========

/**
 * 获取所有笔记，按更新时间倒序
 * @returns {Array} 笔记列表
 */
export function getAllNotes() {
  ensureSeeded()
  const notes = readRaw() || []
  return [...notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

/**
 * 根据 id 获取单条笔记
 * @param {string} id 笔记 id
 * @returns {object|null}
 */
export function getNoteById(id) {
  const notes = readRaw() || []
  return notes.find((n) => n.id === id) || null
}

/**
 * 新增笔记
 * @param {{title: string, category: string, content: string, tags?: string[]}} note
 * @returns {object} 保存后的完整笔记对象
 */
export function addNote(note) {
  ensureSeeded()
  const notes = readRaw() || []
  const now = new Date().toISOString()
  const full = {
    id: `note-${Date.now()}`, // 用时间戳生成唯一 id
    title: note.title,
    category: note.category,
    tags: note.tags || [],
    content: note.content,
    createdAt: now,
    updatedAt: now
  }
  notes.push(full)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  return full
}

/**
 * 删除笔记
 * @param {string} id 笔记 id
 */
export function deleteNote(id) {
  const notes = (readRaw() || []).filter((n) => n.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

/**
 * 按分类筛选笔记
 * @param {string} category 分类名，传 '全部' 或空值返回所有
 */
export function getNotesByCategory(category) {
  const all = getAllNotes()
  if (!category || category === '全部') return all
  return all.filter((n) => n.category === category)
}

/**
 * 关键词搜索（标题 + 正文 + 标签）
 * @param {string} keyword
 */
export function searchNotes(keyword) {
  const all = getAllNotes()
  if (!keyword.trim()) return all
  const k = keyword.trim().toLowerCase()
  return all.filter(
    (n) =>
      n.title.toLowerCase().includes(k) ||
      n.content.toLowerCase().includes(k) ||
      n.tags.some((t) => t.toLowerCase().includes(k))
  )
}

/**
 * 重置为示例数据（调试用）
 */
export function resetToSeed() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTES))
}

/**
 * 统一的日期格式化（卡片、详情页共用，避免各写一份）
 * @param {string} iso ISO 时间字符串
 * @param {boolean} [withTime] 是否带上时分（详情页的“更新于”用）
 * @returns {string} 例如 2026/10/30 或 2026/10/30 14:05
 */
export function formatDate(iso, withTime = false) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  })
}
