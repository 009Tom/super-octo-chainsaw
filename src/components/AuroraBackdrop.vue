<template>
  <!-- AuroraBackdrop - 全站背景动效层（唯一"一直在动"的装饰层） -->
  <!-- 三层叠加：极光柔光团（漂移） + 网格（平移） + 光束（扫过） -->
  <div class="fixed inset-0 -z-20 overflow-hidden pointer-events-none" aria-hidden="true">
    <!-- 底色：中性浅灰，保证内容可读 -->
    <div class="absolute inset-0 bg-[#F5F7FA]"></div>

    <!-- 极光团：尺寸用 vw/vh，手机上和电脑上都能铺满 -->
    <div class="aurora aurora-blue w-[64vw] h-[64vw] max-w-none -top-[20vw] -left-[16vw] animate-aurora-1"></div>
    <div class="aurora aurora-violet w-[56vw] h-[56vw] max-w-none top-[24vh] -right-[18vw] animate-aurora-2"></div>
    <div class="aurora aurora-mint w-[50vw] h-[50vw] max-w-none -bottom-[16vw] left-[14vw] animate-aurora-3"></div>

    <!-- 网格：缓慢平移，只在页面中上部渐显（mask 控制） -->
    <div class="absolute inset-0 bg-grid animate-grid-pan"></div>

    <!-- 斜向光束：周期扫过，营造"光在走"的感觉 -->
    <div class="beam animate-beam"></div>
    <div class="beam animate-beam" style="width: 18%; animation-delay: 7s"></div>

    <!-- 底部再压一层极淡的白，保证长文阅读区对比度 -->
    <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-white/35"></div>
  </div>
</template>

<script setup>
// AuroraBackdrop.vue - 无逻辑，纯 CSS 动画层
// prefers-reduced-motion 由全局 CSS 统一降级（动画时长归零）
</script>
