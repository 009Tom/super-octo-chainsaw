<template>
  <!-- SplashIntro - 开屏动画（四幕：字符雨 → 粒子汇聚成 logo → 文字与进度 → 虹膜式消散） -->
  <Transition name="splash">
    <div
      v-if="visible"
      class="fixed inset-0 z-[70] overflow-hidden"
      style="background: radial-gradient(120% 90% at 50% 30%, #16233B 0%, #0D1526 55%, #080D18 100%)"
    >
      <!-- 唯一的 Canvas 层：字符雨 + 汇聚粒子 + 光环 -->
      <canvas ref="canvasEl" class="absolute inset-0 w-full h-full"></canvas>

      <!-- 背景微光（纯 CSS，给深色底加一点纵深） -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute left-1/2 top-[30%] w-[70vmin] h-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
             style="background: radial-gradient(circle, rgba(59,130,246,.20), transparent 62%)"></div>
        <div class="absolute left-[18%] bottom-[14%] w-[40vmin] h-[40vmin] rounded-full blur-3xl animate-breathe"
             style="background: radial-gradient(circle, rgba(94,234,212,.14), transparent 65%)"></div>
      </div>

      <!-- 中央内容：粒子会在 logoSlot 的位置汇聚成图形 -->
      <div class="relative h-full flex flex-col items-center justify-center px-6 select-none pointer-events-none">
        <!-- 汇聚落点占位（尺寸决定 logo 大小，手机上自动缩小） -->
        <div ref="logoSlot" class="w-[min(60vw,230px)] h-[min(30vw,116px)]"></div>

        <!-- 站名：遮罩逐行揭开 -->
        <div class="mt-5 overflow-hidden">
          <h1 class="splash-title" :class="{ on: stage >= 2 }">学习笔记 Lab</h1>
        </div>

        <!-- 副标题：上浮淡入 -->
        <div class="mt-2 overflow-hidden">
          <p class="splash-sub" :class="{ on: stage >= 3 }">
            记录 · 复盘 · 持续进化
          </p>
        </div>

        <!-- 进度条：真实 rAF 计时，旁边是百分比 -->
        <div class="mt-8 w-[min(72vw,300px)] flex items-center gap-3">
          <div class="flex-1 h-[3px] rounded-full bg-white/12 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-[#60A5FA] via-[#A78BFA] to-[#5EEAD4]"
                 :style="{ width: progress + '%' }"></div>
          </div>
          <span class="font-mono text-[11px] tabular-nums text-slate-400 w-9 text-right">
            {{ progress }}%
          </span>
        </div>

        <!-- 状态文字：随幕次切换 -->
        <p class="mt-3 font-mono text-[11px] tracking-wider text-slate-500">{{ statusText }}<span class="animate-caret text-sky-400">_</span></p>
      </div>

      <!-- 跳过按钮（不想看的人立刻关掉，触摸区足够大） -->
      <button
        class="absolute right-4 bottom-5 min-h-[40px] px-4 rounded-full text-xs text-slate-400
               border border-white/10 hover:text-white hover:border-white/30 transition-colors"
        @click="finish"
      >
        跳过 →
      </button>
    </div>
  </Transition>
</template>

<script setup>
// SplashIntro.vue - 开屏动画（本次会话只播一次）
// 与全站设计分层一致：这里属于"开屏层"，播完即销毁 Canvas 与 rAF，不影响正文性能
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

const visible = ref(false)
const canvasEl = ref(null)
const logoSlot = ref(null)

// 幕次：0 字符雨 / 1 粒子汇聚 / 2 站名揭开 / 3 副标题 + 进度 / 4 退场
const stage = ref(0)
const progress = ref(0)

// 时间轴（毫秒）
// 调试用：URL 加 ?slow 可把整段时钟放慢 6 倍，方便逐帧看粒子汇聚（正常访问不受影响）
const SLOW = /[?&]slow/.test(location.search) ? 6 : 1
const T = {
  born: 620 * SLOW,     // 粒子开始汇聚
  title: 1500 * SLOW,   // 站名揭开
  sub: 1950 * SLOW,     // 副标题
  barStart: 1500 * SLOW,
  barEnd: 3150 * SLOW,  // 进度条走满
  out: 3450 * SLOW      // 开始退场
}

const STATUS = {
  0: 'initializing',
  1: 'rendering logo',
  2: 'loading notes',
  3: 'ready'
}
const statusText = computed(() => STATUS[Math.min(stage.value, 3)])

// ===== Canvas 相关状态 =====
let ctx = null
let raf = 0
let w = 0
let h = 0
let dpr = 1
let t0 = 0
const COLORS = ['#60A5FA', '#7DD3FC', '#A78BFA', '#5EEAD4', '#E0F2FE']

// 字符雨：按列管理
const RAIN_CHARS = '01<>{}[]();/=+*#&λμπcp'
let cols = []

// 汇聚粒子
const parts = []

/** 初始化字符雨列 */
function seedRain() {
  const gap = 16
  const n = Math.ceil(w / gap)
  cols = Array.from({ length: n }, (_, i) => ({
    x: i * gap + gap / 2,
    y: Math.random() * -h,
    speed: 1.4 + Math.random() * 2.6,
    chars: Array.from({ length: 8 + ((Math.random() * 8) | 0) },
      () => RAIN_CHARS[(Math.random() * RAIN_CHARS.length) | 0])
  }))
}

/** 画一列字符雨（越往下越亮，模拟"下落发光"） */
function drawRain(alpha) {
  ctx.save()
  ctx.font = '12px ui-monospace, Menlo, Consolas, monospace'
  ctx.textAlign = 'center'
  for (const c of cols) {
    c.y += c.speed
    if (c.y - c.chars.length * 14 > h) {
      c.y = Math.random() * -120
      c.speed = 1.4 + Math.random() * 2.6
    }
    for (let k = 0; k < c.chars.length; k++) {
      const y = c.y - k * 14
      if (y < -14 || y > h + 14) continue
      const head = k === 0
      ctx.fillStyle = head ? `rgba(191,219,254,${alpha})` : `rgba(96,165,250,${alpha * (0.5 - k / (c.chars.length * 2.4))})`
      ctx.fillText(c.chars[k], c.x, y)
    }
  }
  ctx.restore()
}

/**
 * 在离屏画布上写出 "</>"，采样不透明像素作为粒子目标点
 * 用 DOM 占位元素的位置/尺寸定位，天然适配手机与电脑
 */
function sampleTargets() {
  const rect = logoSlot.value.getBoundingClientRect()
  const cw = Math.max(60, Math.floor(rect.width))
  const chh = Math.max(30, Math.floor(rect.height))

  const off = document.createElement('canvas')
  off.width = cw
  off.height = chh
  const octx = off.getContext('2d', { willReadFrequently: true })
  octx.fillStyle = '#fff'
  octx.font = `bold ${Math.floor(chh * 0.82)}px ui-monospace, Menlo, Consolas, monospace`
  octx.textAlign = 'center'
  octx.textBaseline = 'middle'
  octx.fillText('</>', cw / 2, chh / 2)

  const data = octx.getImageData(0, 0, cw, chh).data
  const pts = []
  let gap = 3
  for (let y = 0; y < chh; y += gap) {
    for (let x = 0; x < cw; x += gap) {
      if (data[(y * cw + x) * 4 + 3] > 120) pts.push([rect.left + x, rect.top + y])
    }
  }
  // 点太多时抽稀，保证手机帧率
  while (pts.length > 340) {
    for (let i = pts.length - 1; i >= 0; i -= 2) pts.splice(i, 1)
  }
  return pts
}

/** 生成粒子：目标点来自字形采样，起点铺满全屏 */
function seedParts() {
  parts.length = 0
  const pts = sampleTargets()
  for (let i = 0; i < pts.length; i++) {
    const [tx, ty] = pts[i]
    parts.push({
      x: Math.random() * w,
      y: Math.random() * h,
      tx,
      ty,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: 1 + Math.random() * 1.3,
      delay: Math.random() * 380, // 错峰汇聚，避免"瞬移"
      color: COLORS[(Math.random() * COLORS.length) | 0]
    })
  }
}

/** 画汇聚完成后的旋转光环 */
function drawRing(t) {
  const rect = logoSlot.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const rr = rect.width * 0.72
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(t * 0.00035)
  ctx.strokeStyle = 'rgba(125,211,252,.42)'
  ctx.lineWidth = 1.2
  ctx.setLineDash([rr * 0.22, rr * 0.5])
  ctx.beginPath()
  ctx.arc(0, 0, rr, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/** 主循环：一个 rAF 同时驱动幕次、进度条与 canvas */
function frame(now) {
  const t = now - t0
  ctx.clearRect(0, 0, w, h)

  // 幕次推进
  if (t < T.born) stage.value = 0
  else if (t < T.title) stage.value = 1
  else if (t < T.sub) stage.value = 2
  else stage.value = 3

  // 第一幕：字符雨（汇聚开始后渐隐）
  const rainAlpha = t < T.born ? 0.5 : Math.max(0, 0.5 - (t - T.born) / 600)
  if (rainAlpha > 0.01) drawRain(rainAlpha)

  // 第二幕起：粒子飞向字形
  if (t >= T.born) {
    for (const p of parts) {
      if (t < T.born + p.delay) {
        // 还没轮到它：轻微漂浮
        p.x += p.vx
        p.y += p.vy
      } else {
        const dx = p.tx - p.x
        const dy = p.ty - p.y
        p.x += dx * 0.085
        p.y += dy * 0.085
        // 到位后只留极小的呼吸抖动，保持"活"但不散
        if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) {
          p.x += Math.sin(t * 0.002 + p.tx) * 0.16
          p.y += Math.cos(t * 0.002 + p.ty) * 0.16
        }
      }
      const near = Math.hypot(p.tx - p.x, p.ty - p.y) < 3
      ctx.globalAlpha = near ? 0.95 : 0.55
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
      // 外圈柔光（只在到位后画，成本可控）
      if (near) {
        ctx.globalAlpha = 0.14
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    drawRing(t)
  }

  // 进度条：真实计时驱动，走满即准备退场
  if (t >= T.barStart) {
    const k = Math.min(1, (t - T.barStart) / (T.barEnd - T.barStart))
    progress.value = Math.round(k * 100)
  }

  if (t >= T.out) {
    finish()
    return
  }
  raf = requestAnimationFrame(frame)
}

/** 尺寸自适应（含高分屏） */
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = window.innerWidth
  h = window.innerHeight
  canvasEl.value.width = Math.floor(w * dpr)
  canvasEl.value.height = Math.floor(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  seedRain()
  if (parts.length) seedParts()
}

function finish() {
  if (!visible.value) return
  visible.value = false
  progress.value = 100
  stop()
}

function stop() {
  cancelAnimationFrame(raf)
  raf = 0
}

let resizeTimer = null
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (visible.value) resize()
  }, 180)
}

async function start() {
  // 等 DOM 真的挂上去，才能量到 logoSlot 的位置（采样粒子目标点要用它的矩形）
  await nextTick()
  if (!canvasEl.value || !logoSlot.value) return

  ctx = canvasEl.value.getContext('2d')
  resize()
  seedParts()
  t0 = performance.now()
  raf = requestAnimationFrame(frame)

  window.addEventListener('resize', onResize)
}

onMounted(() => {
  // 本次会话已经看过就不再打断
  if (sessionStorage.getItem('splash_seen_v2')) return
  // 系统要求减少动效：直接跳过开屏
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sessionStorage.setItem('splash_seen_v2', '1')
    return
  }

  visible.value = true
  sessionStorage.setItem('splash_seen_v2', '1')
  start()
})

onBeforeUnmount(() => {
  stop()
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
/* 站名：被父级 overflow-hidden 挡住，用 mask-up 从下方揭开 */
.splash-title {
  font-size: clamp(26px, 7.4vw, 46px);
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #EAF2FF;
  transform: translateY(105%);
  transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
}
.splash-title.on {
  transform: translateY(0);
}

/* 副标题：上浮淡入 */
.splash-sub {
  font-size: clamp(12px, 3.4vw, 15px);
  letter-spacing: 0.22em;
  color: #93AFD0;
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.splash-sub.on {
  opacity: 1;
  transform: translateY(0);
}

/* 退场：虹膜式收缩（遮罩从满屏收缩成一个点，正文由外向内显现） */
.splash-leave-active {
  clip-path: circle(145% at 50% 42%);
  transition: clip-path 0.75s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.5s ease 0.25s;
}
.splash-leave-to {
  clip-path: circle(0% at 50% 42%);
  opacity: 0.25;
}

@media (prefers-reduced-motion: reduce) {
  .splash-leave-active {
    transition: opacity 0.2s ease;
    clip-path: none;
  }
}
</style>
