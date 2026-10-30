<template>
  <!-- Navbar - 顶部导航（内容层：静态白底，不做渐变/扫光/浮动） -->
  <header
    class="fixed top-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-md border-b transition-colors duration-200"
    :class="scrolled ? 'border-ink-200' : 'border-transparent'"
  >
    <nav class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
      <!-- Logo：实色方块，无动画 -->
      <RouterLink to="/" class="flex items-center gap-2.5 shrink-0">
        <span class="w-9 h-9 rounded-xl bg-primary text-white font-bold text-base flex items-center justify-center">
          &lt;/&gt;
        </span>
        <span class="hidden xs:block font-bold text-lg text-ink-900 leading-none">
          学习笔记 <span class="text-primary">Lab</span>
        </span>
      </RouterLink>

      <!-- 桌面菜单 -->
      <div class="hidden md:flex items-center gap-1">
        <RouterLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="relative px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
          :class="isActive(item.path) ? 'text-primary' : 'text-ink-500 hover:text-ink-900'"
        >
          {{ item.name }}
          <!-- 激活下划线：实色，静态 -->
          <span
            v-if="isActive(item.path)"
            class="absolute left-3.5 right-3.5 -bottom-0.5 h-[2px] rounded-full bg-primary"
          ></span>
        </RouterLink>

        <RouterLink to="/write" class="btn btn-primary btn-sm ml-2">
          ✍️ 写笔记
        </RouterLink>
      </div>

      <!-- 移动端：当前页面名 + 菜单按钮 -->
      <div class="md:hidden flex items-center gap-2">
        <span class="text-sm font-semibold text-ink-900">{{ currentName }}</span>
        <button
          class="w-11 h-11 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white"
          :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <span class="block w-5 h-0.5 bg-ink-700 rounded-full transition-transform duration-200"
                :class="menuOpen ? 'rotate-45 translate-y-2' : ''"></span>
          <span class="block w-5 h-0.5 bg-ink-700 rounded-full transition-opacity duration-150"
                :class="menuOpen ? 'opacity-0' : ''"></span>
          <span class="block w-5 h-0.5 bg-ink-700 rounded-full transition-transform duration-200"
                :class="menuOpen ? '-rotate-45 -translate-y-2' : ''"></span>
        </button>
      </div>
    </nav>

    <!-- 移动端抽屉：从右侧滑入，条目高度 48px 好点 -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div v-if="menuOpen" class="md:hidden fixed inset-0 top-16 bg-ink-900/25" @click="menuOpen = false"></div>
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="menuOpen"
        class="md:hidden fixed right-0 top-16 bottom-0 w-[74%] max-w-[300px] z-50
               bg-white border-l border-ink-200 shadow-xl p-3 flex flex-col gap-1 safe-b"
      >
        <RouterLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center justify-between min-h-[48px] px-4 rounded-xl text-[15px] font-medium transition-colors"
          :class="isActive(item.path) ? 'bg-primary-50 text-primary font-semibold' : 'text-ink-700'"
          @click="menuOpen = false"
        >
          {{ item.name }}
          <span v-if="isActive(item.path)" class="w-1.5 h-1.5 rounded-full bg-primary"></span>
        </RouterLink>

        <div class="mt-2 pt-3 border-t border-ink-200">
          <RouterLink to="/write" class="btn btn-primary w-full" @click="menuOpen = false">
            ✍️ 写笔记
          </RouterLink>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup>
// Navbar.vue - 导航栏
// 桌面：横向菜单；手机：右侧抽屉 + 遮罩。内容层保持静态，切换路由后自动收起
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const menuOpen = ref(false)
const scrolled = ref(false)

// 导航菜单配置（"关于我"已换成开发者工具箱）
const menuItems = [
  { name: '首页', path: '/' },
  { name: '笔记列表', path: '/notes' },
  { name: 'AI 助手', path: '/chat' },
  { name: '工具箱', path: '/tools' }
]

/**
 * 判断菜单项是否处于激活状态（"首页"精确匹配，其余用前缀匹配）
 * @param {string} path 菜单路径
 */
const isActive = computed(() => (path) =>
  path === '/' ? route.path === '/' : route.path.startsWith(path)
)

// 手机上标题栏显示当前页面名，省掉一个 Logo 位置的拥挤
const currentName = computed(() => {
  const hit = menuItems.find((m) => (m.path === '/' ? route.path === '/' : route.path.startsWith(m.path)))
  return hit ? hit.name : '学习笔记'
})

// 切换路由后自动关闭抽屉
watch(() => route.path, () => { menuOpen.value = false })

// 滚动超过 8px 时显示底部分隔线
function onScroll() {
  scrolled.value = window.scrollY > 8
}

// 屏幕转宽时清掉移动抽屉状态
function onResize() {
  if (window.innerWidth >= 768) menuOpen.value = false
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
})
</script>
