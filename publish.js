// publish.js - 「伪后台」的写端：把本地笔记导出成可以上传到 GitHub 的文件
//
// 注意：这里**不调用 GitHub 的写入 API**。写入仍然由你在 GitHub 网页上手动提交，
// 因为网站是公开访问的，一旦把 token 放进前端就等于把仓库的写权限交给了所有访客。
// 所以本文件只负责三件事：
//   1) 把笔记序列化成带 front-matter 的 .md
//   2) 生成清单 index.json（前端列表靠它，避免 GitHub API 限流）
//   3) 记录"哪些已经发布过"，好让你一眼看出还有哪几篇没上传

const PUBLISHED_KEY = 'published_map_v1' // { [noteId]: { slug, file, hash, at } }

// ========== 文件名与正文 ==========

/**
 * 生成文件名用的 slug
 * 中文标题里没有 ASCII 字符时会退化成 note-xxxx，所以额外拼上 id 尾巴保证唯一
 */
export function slugify(note) {
  const ascii = String(note.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const tail = String(note.id).replace(/[^0-9a-z]/g, '').slice(-6)
  return `${ascii || 'note'}-${tail}`
}

/** 极简哈希：用来判断"这篇发布之后又改过没有" */
function hashOf(note) {
  const s = `${note.title}|${note.category}|${(note.tags || []).join(',')}|${note.content}`
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** 笔记 → Markdown 文本（含 YAML front-matter，GitHub 网页上也能直接读） */
export function toMarkdown(note) {
  const fm = [
    '---',
    `id: ${slugify(note)}`,
    `title: ${note.title}`,
    `category: ${note.category}`,
    `tags: [${(note.tags || []).join(', ')}]`,
    `createdAt: ${note.createdAt}`,
    `updatedAt: ${note.updatedAt}`,
    '---',
    '',
    note.content.trim(),
    ''
  ].join('\n')
  return fm
}

/** 全部笔记 → index.json 内容（清单里带上摘要，列表页就不用再拉正文） */
export function buildIndexJson(notes) {
  return JSON.stringify(
    {
      version: 1,
      updated: new Date().toISOString(),
      count: notes.length,
      notes: notes.map((n) => ({
        id: slugify(n),
        file: `${slugify(n)}.md`,
        title: n.title,
        category: n.category,
        tags: n.tags || [],
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        excerpt: makeExcerpt(n.content)
      }))
    },
    null,
    2
  )
}

/** 清单里的摘要：去掉 Markdown 符号，取前 90 字 */
function makeExcerpt(content) {
  return String(content || '')
    .replace(/```[\s\S]*?```/g, ' ') // 代码块整段跳过，不然摘要全是代码
    .replace(/[#>*`\-[\]()!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

// ========== 发布状态记录 ==========

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(PUBLISHED_KEY)) || {}
  } catch {
    return {}
  }
}

/**
 * 给每条草稿打上发布状态，供发布中心显示徽标
 * @returns {Array<{note:object, status:'new'|'published'|'changed', slug:string, file:string, at?:string}>}
 */
export function withPublishState(notes) {
  const map = readMap()
  return notes.map((note) => {
    const rec = map[note.id]
    const slug = slugify(note)
    return {
      note,
      slug,
      file: `${slug}.md`,
      status: !rec ? 'new' : rec.hash !== hashOf(note) ? 'changed' : 'published',
      at: rec?.at
    }
  })
}

/** 导出后调用，记住"这个版本已经交给你上传了" */
export function markPublished(notes) {
  const map = readMap()
  const at = new Date().toISOString()
  notes.forEach((note) => {
    map[note.id] = { slug: slugify(note), file: `${slugify(note)}.md`, hash: hashOf(note), at }
  })
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(map))
}

/** 撤销记录（想重新导出一遍时用） */
export function unmarkPublished(ids) {
  const map = readMap()
  ids.forEach((id) => delete map[id])
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(map))
}

// ========== 下载 / 复制 ==========

/** 触发浏览器下载一个文本文件 */
export function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 立刻 revoke 会让部分浏览器下载中断，留 10 秒
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/**
 * 一次下载多篇：浏览器会拦截"连续多个下载"，所以每个之间留一点间隔，
 * 并在页面上提示用户允许弹窗/多文件下载
 */
export async function downloadFiles(files, gap = 350) {
  files.forEach((f) => downloadText(f.name, f.text, f.type))
  if (files.length > 1) await new Promise((r) => setTimeout(r, gap * files.length))
}

/**
 * 生成一次上传所需的全部文件（.md 若干 + index.json）
 *
 * 为什么要拆成两个参数：index.json 是「线上应该有哪些笔记」的完整清单，
 * 网站列表整个靠它。如果只用本次勾选的笔记生成清单，传上去就会把
 * 之前已发布、这次没被选中的笔记全部挤掉（它们从网站上消失）。
 * @param {Array} notes    本次要上传正文的笔记（生成 .md 文件）
 * @param {Array} allNotes 线上最终应该存在的全部笔记（生成 index.json），缺省 = notes
 */
export function buildBundle(notes, allNotes = notes) {
  const files = notes.map((n) => ({ name: `${slugify(n)}.md`, text: toMarkdown(n), type: 'text/markdown' }))
  files.push({ name: 'index.json', text: buildIndexJson(allNotes), type: 'application/json' })
  return files
}

/**
 * 把整个发布包拼成一段纯文本（一次下载/复制，避免浏览器拦截多文件）
 * 每段前面有 ===== 文件名 ===== 标记，方便对照着在 GitHub 上新建文件
 */
export function bundleAsText(notes, allNotes = notes) {
  return buildBundle(notes, allNotes)
    .map((f) => `===== ${f.name} =====\n${f.text}`)
    .join('\n\n')
}
