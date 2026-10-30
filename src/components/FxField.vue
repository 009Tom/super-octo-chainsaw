<template>
  <!-- FxField - 背景粒子场（全站唯一的 JS 动效层） -->
  <!-- fixed + pointer-events-none：贴在内容之下，只在空白处可见，不阻挡任何点击 -->
  <canvas ref="canvasEl" class="fixed inset-0 w-full h-full pointer-events-none -z-10"></canvas>
</template>

<script setup>
// FxField.vue - Canvas 粒子场
// 动效集中在"背景"：粒子随鼠标形成涡流、鼠标拖尾、邻近粒子连线、点击迸发
// 内容层保持静态，因此这里的可见度可以做得比之前高很多
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasEl = ref(null)
let ctx = null
let raf = 0
let w = 0
let h = 0
let dpr = 1

// 粒子池 / 鼠标状态 / 鼠标拖尾
const dots = []
const mouse = { x: -9999, y: -9999, active: false }
const trail = [] // 最近若干帧的鼠标位置，用来画拖尾
const TRAIL_MAX = 18

// 背景层专用配色：柔和但可见（蓝 / 紫 / 粉 / 青）
const PALETTE = ['#60A5FA', '#A78BFA', '#F0ABFC', '#5EEAD4']
// 迸发配色主题
const TONES = {
  rainbow: PALETTE,
  success: ['#34D399', '#6EE7B7', '#60A5FA', '#FBBF24'],
  love: ['#F0ABFC', '#EC4899', '#A78BFA', '#FBBF24']
}

/** 创建一颗常驻漂浮粒子 */
function makeDot(x, y) {
  return {
    x: x ?? Math.random() * w,
    y: y ?? Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.9 + 1.1,
    life: Infinity, // 迸发粒子用它渐隐
    color: PALETTE[(Math.random() * PALETTE.length) | 0]
  }
}

/** 粒子数量：按面积算，手机上自动变少；上限保护性能 */
function dotCount() {
  const base = Math.floor((w * h) / 11000)
  return Math.max(36, Math.min(150, base))
}

/** 重置粒子池 */
function seed() {
  dots.length = 0
  for (let i = 0; i < dotCount(); i++) dots.push(makeDot())
}

/** 画一帧 */
function draw() {
  ctx.clearRect(0, 0, w, h)

  for (let i = 0; i < dots.length; i++) {
    const p = dots[i]

    // --- 鼠标涡流：切向力 + 轻微吸引，让粒子绕着指针转 ---
    if (mouse.active) {
      const dx = p.x - mouse.x
      const dy = p.y - mouse.y
      const dist = Math.hypot(dx, dy)
      if (dist < 170 && dist > 0.01) {
        const k = (170 - dist) / 170 // 0~1，越近越强
        const nx = dx / dist
        const ny = dy / dist
        // 切向（垂直于半径）形成旋转；径向轻微吸引形成"漩涡"
        p.vx += (-ny) * k * 0.30 - nx * k * 0.055
        p.vy += nx * k * 0.30 - ny * k * 0.055
      }
    }

    // 阻尼 + 微量随机扰动，避免彻底静止
    p.vx *= 0.95
    p.vy *= 0.95
    p.vx += (Math.random() - 0.5) * 0.03
    p.vy += (Math.random() - 0.5) * 0.03
    p.x += p.vx
    p.y += p.vy

    if (p.life !== Infinity) {
      // 迸发粒子：寿命到了就回收
      p.life -= 1
      if (p.life <= 0) {
        dots.splice(i, 1)
        i -= 1
        continue
      }
    } else {
      // 常驻粒子越界后从对侧回绕（环形空间，视觉连续）
      if (p.x < -24) p.x = w + 24
      if (p.x > w + 24) p.x = -24
      if (p.y < -24) p.y = h + 24
      if (p.y > h + 24) p.y = -24
    }

    // --- 连线：邻近粒子连成星座 ---
    for (let j = i + 1; j < dots.length; j++) {
      const q = dots[j]
      const d = Math.hypot(p.x - q.x, p.y - q.y)
      if (d < 130) {
        ctx.strokeStyle = p.color
        ctx.globalAlpha = (1 - d / 130) * 0.2
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      }
    }

    // --- 与鼠标直接连线：指针移到空白处会"牵动"一片粒子 ---
    if (mouse.active) {
      const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y)
      if (dm < 200) {
        ctx.strokeStyle = '#3B82F6'
        ctx.globalAlpha = (1 - dm / 200) * 0.3
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(mouse.x, mouse.y)
        ctx.stroke()
      }
    }

    // --- 粒子本体 ---
    ctx.globalAlpha = p.life === Infinity ? 0.55 : Math.min(1, p.life / 50)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }

  drawTrail()

  ctx.globalAlpha = 1
  raf = requestAnimationFrame(draw)
}

/** 鼠标拖尾：一串逐渐变小变淡的圆点 */
function drawTrail() {
  if (!mouse.active || trail.length < 2) return
  for (let i = 0; i < trail.length; i++) {
    const t = trail[i]
    const ratio = (i + 1) / trail.length
    ctx.globalAlpha = ratio * 0.28
    ctx.fillStyle = '#60A5FA'
    ctx.beginPath()
    ctx.arc(t.x, t.y, ratio * 5.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** 点击迸发 */
function handleClick(e) {
  const x = e.clientX ?? (e.touches && e.touches[0]?.clientX)
  const y = e.clientY ?? (e.touches && e.touches[0]?.clientY)
  if (x == null || y == null) return
  spawnBurst(x, y, 20, 'rainbow', 2.4)
}

/**
 * 通用迸发（也响应其他页面通过 fx-burst 事件发起的庆祝）
 * @param {number} x 中心横坐标
 * @param {number} y 中心纵坐标
 * @param {number} count 粒子数
 * @param {string} tone 配色主题
 * @param {number} speed 初速
 */
function spawnBurst(x, y, count = 20, tone = 'rainbow', speed = 2.4) {
  const colors = TONES[tone] || TONES.rainbow
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
    const v = speed + Math.random() * 2.6
    dots.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - (tone === 'success' ? 1.8 : 0), // 庆祝时整体向上喷
      r: Math.random() * 2.2 + 1.4,
      life: 48 + Math.random() * 22,
      color: colors[(Math.random() * colors.length) | 0]
    })
  }
}

/** 接收其他组件发来的烟花请求 */
function handleBurstEvent(e) {
  const { x = w / 2, y = h / 2, count = 26, tone = 'rainbow' } = e.detail || {}
  spawnBurst(x, y, count, tone, 3.2)
}

function setPointer(x, y) {
  mouse.x = x
  mouse.y = y
  mouse.active = true
  trail.push({ x, y })
  if (trail.length > TRAIL_MAX) trail.shift()
}

function handleMove(e) {
  setPointer(e.clientX, e.clientY)
}

/** 触屏：手指划过屏幕也能驱动粒子 */
function handleTouch(e) {
  const t = e.touches && e.touches[0]
  if (t) setPointer(t.clientX, t.clientY)
}

function handleTouchEnd() {
  handleLeave()
}

function handleLeave() {
  mouse.active = false
  mouse.x = -9999
  mouse.y = -9999
  trail.length = 0
}

/** 尺寸自适应（含高分屏 DPR，粒不发虚） */
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = window.innerWidth
  h = window.innerHeight
  canvasEl.value.width = Math.floor(w * dpr)
  canvasEl.value.height = Math.floor(h * dpr)
  canvasEl.value.style.width = `${w}px`
  canvasEl.value.style.height = `${h}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  seed()
}

/** 切到后台就停循环，省电（手机上尤其重要） */
function handleVisibility() {
  if (document.hidden) {
    cancelAnimationFrame(raf)
    raf = 0
  } else if (!raf) {
    raf = requestAnimationFrame(draw)
  }
}

let resizeTimer = null
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(resize, 180) // 拖窗口/手机旋转时防抖重建
}

onMounted(() => {
  // 系统要求"减少动效"就完全不启动 canvas
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  ctx = canvasEl.value.getContext('2d')
  resize()
  draw()

  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseout', handleLeave)
  window.addEventListener('touchmove', handleTouch, { passive: true })
  window.addEventListener('touchend', handleTouchEnd)
  window.addEventListener('click', handleClick)
  window.addEventListener('fx-burst', handleBurstEvent)
  document.addEventListener('visibilitychange', handleVisibility)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', handleMove)
  window.removeEventListener('mouseout', handleLeave)
  window.removeEventListener('touchmove', handleTouch)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('click', handleClick)
  window.removeEventListener('fx-burst', handleBurstEvent)
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>
