// markdown.js - Markdown 渲染工具（含代码高亮）
// 使用 marked 解析 Markdown，highlight.js 做代码块高亮
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'

// 按需注册常用语言，避免打包体积过大。
// 需要其他语言时，在这里补一行即可，例如：
// import python from 'highlight.js/lib/languages/javascript'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml' // HTML 用 xml 表示
import markdown from 'highlight.js/lib/languages/markdown'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('markdown', markdown)

// 配置 marked：自定义 renderer，让代码块走 highlight.js
marked.setOptions({
  gfm: true, // 支持 GitHub 风格 Markdown（表格等）
  breaks: true // 单个换行也渲染成 <br>
})

/**
 * 把 Markdown 文本渲染成 HTML 字符串
 * @param {string} src Markdown 源码
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(src) {
  if (!src) return '<p class="text-gray-400">（暂无内容）</p>'

  // 自定义 renderer：处理代码块高亮
  const renderer = new marked.Renderer()
  renderer.code = ({ text, lang }) => {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
    const highlighted = hljs.highlight(text, { language }).value
    return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
  }

  // marked 4+ 的 parse 是同步的（未开启异步扩展时）
  return marked.parse(src, { renderer })
}

/**
 * 从 Markdown 内容里提取一段纯文本摘要（用于卡片展示）
 * @param {string} src Markdown 源码
 * @param {number} len 摘要长度
 */
export function extractExcerpt(src, len = 80) {
  if (!src) return ''
  const plain = src
    .replace(/```[\s\S]*?```/g, '') // 去掉代码块
    .replace(/[#>*`_\-\[\]()!]/g, '') // 去掉 Markdown 标记
    .replace(/\s+/g, ' ') // 合并空白
    .trim()
  return plain.length > len ? plain.slice(0, len) + '…' : plain
}
