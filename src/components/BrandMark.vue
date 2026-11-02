<template>
  <!--
    BrandMark - 站标图形「源码印记」
    和 favicon.svg 是同一套图形：三片半透明圆角板沿对角层叠，顶板中央一个雕刻凹槽。
    不含任何字母或代码符号，体积感靠轴测投影 + 侧壁厚度 + 左上侧光 + 边缘高光 + 柔和投影。
    plate=false 时去掉深色底板与光带，只留悬浮的玻璃层叠（开屏动画那种深色背景用）。
  -->
  <svg
    :width="box"
    :height="box"
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="block shrink-0"
    role="img"
    :aria-label="label"
  >
    <defs>
      <linearGradient :id="U('plate')" x1="14" y1="8" x2="112" y2="122" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#223354" />
        <stop offset=".5" stop-color="#111C30" />
        <stop offset="1" stop-color="#070C17" />
      </linearGradient>
      <radialGradient :id="U('side')" cx="24" cy="16" r="110" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#8CC6FF" stop-opacity=".32" />
        <stop offset=".5" stop-color="#5B8FD0" stop-opacity=".08" />
        <stop offset="1" stop-color="#5B8FD0" stop-opacity="0" />
      </radialGradient>
      <clipPath :id="U('clip')"><rect x="4" y="4" width="120" height="120" rx="30" /></clipPath>

      <linearGradient :id="U('g1')" x1="28" y1="64" x2="94" y2="102" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#D8EEFF" stop-opacity=".8" />
        <stop offset=".45" stop-color="#5FA3E6" stop-opacity=".3" />
        <stop offset="1" stop-color="#1B3760" stop-opacity=".3" />
      </linearGradient>
      <linearGradient :id="U('g2')" x1="40" y1="42" x2="100" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#EFE5FF" stop-opacity=".85" />
        <stop offset=".5" stop-color="#9C84E6" stop-opacity=".34" />
        <stop offset="1" stop-color="#2A2A5C" stop-opacity=".32" />
      </linearGradient>
      <linearGradient :id="U('g3')" x1="54" y1="22" x2="104" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity=".95" />
        <stop offset=".42" stop-color="#9BE7D0" stop-opacity=".46" />
        <stop offset="1" stop-color="#225960" stop-opacity=".38" />
      </linearGradient>
      <linearGradient :id="U('wall')" x1="0" y1="18" x2="0" y2="114" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#22375C" />
        <stop offset="1" stop-color="#080E1D" />
      </linearGradient>
      <linearGradient :id="U('rim')" x1="6" y1="14" x2="122" y2="118" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity=".92" />
        <stop offset=".45" stop-color="#C7DCF7" stop-opacity=".26" />
        <stop offset="1" stop-color="#FFFFFF" stop-opacity=".05" />
      </linearGradient>
      <linearGradient :id="U('shaft')" x1="0" y1="0" x2=".62" y2="1">
        <stop offset="0" stop-color="#D5EBFF" stop-opacity=".15" />
        <stop offset=".55" stop-color="#D5EBFF" stop-opacity="0" />
      </linearGradient>

      <filter :id="U('soft')" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter :id="U('drop')" x="-40%" y="-40%" width="180%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="3.4" flood-color="#000000" flood-opacity=".5" />
      </filter>
    </defs>

    <!-- 深色底板（只有当背景是浅色页面时才需要） -->
    <template v-if="plate">
      <rect x="4" y="4" width="120" height="120" rx="30" :fill="V('plate')" />
      <g :clip-path="V('clip')">
        <rect x="4" y="4" width="120" height="120" :fill="V('side')" />
        <path d="M2 40 L46 4 L84 4 L10 96 Z" :fill="V('shaft')" />
      </g>
      <rect x="4.8" y="4.8" width="118.4" height="118.4" rx="29.2" :stroke="RIM" stroke-opacity=".2" />
    </template>

    <!-- 层叠的三片（带落地投影）：整组放大 1.1 倍，和 favicon.svg 保持一致 -->
    <g transform="translate(64 68) scale(1.1) translate(-64 -64)">
      <ellipse v-if="plate" cx="66" cy="103" rx="33" ry="8" fill="#000000" opacity=".5" :filter="V('soft')" />
      <g :filter="V('drop')">
      <g transform="translate(0 6)">
        <g transform="translate(50 84) scale(1 .56) rotate(45)">
          <rect x="-21" y="-21" width="42" height="42" rx="13" :fill="V('wall')" />
        </g>
      </g>
      <g transform="translate(50 84) scale(1 .56) rotate(45)">
        <rect x="-21" y="-21" width="42" height="42" rx="13" :fill="V('g1')" :stroke="V('rim')" stroke-width="1.4" />
      </g>

      <g transform="translate(0 5.5)">
        <g transform="translate(64 62) scale(1 .56) rotate(45)">
          <rect x="-19" y="-19" width="38" height="38" rx="12" :fill="V('wall')" />
        </g>
      </g>
      <g transform="translate(64 62) scale(1 .56) rotate(45)">
        <rect x="-19" y="-19" width="38" height="38" rx="12" :fill="V('g2')" :stroke="V('rim')" stroke-width="1.3" />
      </g>

      <g transform="translate(0 5)">
        <g transform="translate(78 40) scale(1 .56) rotate(45)">
          <rect x="-16.5" y="-16.5" width="33" height="33" rx="10.5" :fill="V('wall')" />
        </g>
      </g>
      <g transform="translate(78 40) scale(1 .56) rotate(45)">
        <rect x="-16.5" y="-16.5" width="33" height="33" rx="10.5" :fill="V('g3')" :stroke="V('rim')" stroke-width="1.3" />
        <rect x="-6" y="-6" width="12" height="12" rx="4.6" fill="#050A14" fill-opacity=".55" />
        <rect x="-6" y="-6" width="12" height="12" rx="4.6" :stroke="RIM" stroke-opacity=".28" stroke-width="1" />
      </g>
      </g>
    </g>
  </svg>
</template>

<script setup>
// BrandMark.vue - 站标图形（纯 SVG，无外部图片依赖，缩到 16px 也能认出层次）
import { computed } from 'vue'

const props = defineProps({
  // 数字按 px 处理，也可以直接传 'min(58vw,190px)' 这类 CSS 尺寸
  size: { type: [Number, String], default: 36 },
  // 是否带深色圆角底板：浅色页面上的 logo 要带，深色开屏背景不带
  plate: { type: Boolean, default: true },
  label: { type: String, default: '源码印记' }
})

const RIM = '#FFFFFF'
const box = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))

// 同一页面可能渲染多个 logo，渐变色 id 必须各自唯一，否则后渲染的会复用第一个的定义
const uid = `bm-${Math.random().toString(36).slice(2, 8)}`
const U = (n) => `${uid}-${n}`
const V = (n) => `url(#${uid}-${n})`
</script>
