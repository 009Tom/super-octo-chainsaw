<template>
  <!-- App.vue - 根组件 -->
  <!-- 层级分工（本次重构的关键）：
       -z-20 极光背景层（一直在动）
       -z-10 粒子场（跟随鼠标涡流）
       z-1   鼠标光斑（在内容之下，只在空白处可见）
       z-10  页面内容（静态、不透明白底）
       z-50  导航栏
       z-70  开屏动画 -->

  <!-- 背景动效层：极光 + 网格 + 光束 -->
  <AuroraBackdrop />

  <!-- 全站粒子场（鼠标涡流 / 触屏拖动 / 点击迸发） -->
  <FxField />

  <!-- 鼠标跟随光斑（纯装饰，跟随逻辑在脚本里用 rAF 平滑插值） -->
  <div id="cursor-glow" ref="glowEl" aria-hidden="true"></div>

  <!-- 顶部阅读进度条：实色蓝，一条细线，不做渐变 -->
  <div class="fixed top-0 left-0 right-0 h-[2px] z-[65] pointer-events-none">
    <div
      class="h-full bg-primary transition-[width] duration-150"
      :style="{ width: scrollPercent + '%' }"
    ></div>
  </div>

  <!-- 固定顶部导航栏 -->
  <Navbar />

  <!-- 路由出口：页面切换只做纯淡入，不晃动内容 -->
  <main class="pt-16 min-h-[calc(100dvh-4rem)] relative z-10">
    <RouterView v-slot="{ Component, route }">
      <Transition :name="route.meta.transition || 'page'" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>

  <!-- 页脚：静态，手机上留足点击区 -->
  <footer class="relative z-10 border-t border-ink-200 bg-white safe-b">
    <div class="max-w-6xl mx-auto px-4 py-6 flex flex-col xs:flex-row items-center justify-between gap-2 text-xs text-ink-400">
      <span>学习笔记 Lab · 本地浏览器存储，无需登录</span>
      <span class="font-mono">Vue 3 / Vite / Tailwind</span>
    </div>
  </footer>

  <!-- 开屏动画：整站只在这里挂载，首次进入播一次 -->
  <SplashIntro />
</template>

<script setup>
// App.vue - 根组件（全站特效层在这里挂载）
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Navbar from './components/Navbar.vue'
import FxField from './components/FxField.vue'
import AuroraBackdrop from './components/AuroraBackdrop.vue'
import SplashIntro from './components/SplashIntro.vue'

const glowEl = ref(null)
const scrollPercent = ref(0)
let raf = 0
let tx = 0 // 鼠标真实位置
let ty = 0
let cx = 0 // 光斑当前位置（做插值，产生"拖尾"感）
let cy = 0
let started = false

/** 光斑平滑跟随：每帧只移动差值的 12%，形成惯性感 */
function loop() {
  cx += (tx - cx) * 0.12
  cy += (ty - cy) * 0.12
  if (glowEl.value) {
    glowEl.value.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`
  }
  raf = requestAnimationFrame(loop)
}

function onMouseMove(e) {
  tx = e.clientX
  ty = e.clientY
  // 第一次移动才点亮光斑，避免进页面时它孤零零停在左上角
  if (!started && glowEl.value) {
    started = true
    glowEl.value.style.opacity = '1'
  }
}

/** 点击任意位置产生一圈涟漪 */
function onMouseDown(e) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const el = document.createElement('span')
  el.className = 'click-ripple'
  el.style.left = `${e.clientX}px`
  el.style.top = `${e.clientY}px`
  document.body.appendChild(el)
  // 动画结束后移除 DOM
  setTimeout(() => el.remove(), 760)
}

/** 顶部进度条：滚动比例 */
function onScroll() {
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  scrollPercent.value = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0
}

onMounted(() => {
  // 光斑默认隐藏，等鼠标真的动过再显示
  if (glowEl.value) glowEl.value.style.opacity = '0'

  // 触屏设备不需要光斑跟随
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches
  if (hasFinePointer) {
    window.addEventListener('mousemove', onMouseMove)
    loop()
  }
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('scroll', onScroll)
})
</script>
