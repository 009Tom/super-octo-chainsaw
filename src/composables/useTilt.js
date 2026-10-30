// composables/useTilt.js - 卡片 3D 倾斜交互
// 【已停用】本次设计改版把“内容层”定为静态（动效只留在背景层），
// 卡片不再跟随鼠标倾斜，因此该组合式函数目前没有地方引用。
// 如果以后又想给某个独立模块加 3D 效果，可以直接 import 使用（需自行补回 .tilt 样式）。
// 鼠标在卡片上移动时，按指针位置计算 rotateX / rotateY，写入 CSS 变量 --rx / --ry。
export function useTilt(maxDeg = 8) {
  /**
   * 鼠标移动：以卡片中心为原点，算出倾斜角度
   * @param {MouseEvent} e
   */
  function onMouseMove(e) {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    // 指针相对卡片中心的归一化坐标（-0.5 ~ 0.5）
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--ry', `${px * maxDeg * 2}deg`) // 左右倾
    el.style.setProperty('--rx', `${-py * maxDeg * 2}deg`) // 上下倾（反向更符合直觉）
    el.classList.add('tilt-hover')
  }

  /** 鼠标离开：角度归零，恢复平整 */
  function onMouseLeave(e) {
    const el = e.currentTarget
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.classList.remove('tilt-hover')
  }

  return { onMouseMove, onMouseLeave }
}

/**
 * 数字滚动动画：从 0 递增到目标值（首页统计块用）
 * @param {number} end 目标数字
 * @param {number} duration 动画时长（毫秒）
 * @returns {import('vue').Ref<number>} 当前值，模板里直接插值即可
 */
import { ref } from 'vue'
export function useCountUp(end, duration = 1200) {
  const value = ref(0)
  const start = performance.now()
  function tick(now) {
    const p = Math.min((now - start) / duration, 1)
    // easeOutCubic：先快后慢，收尾自然
    const eased = 1 - Math.pow(1 - p, 3)
    value.value = Math.round(end * eased)
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return value
}
