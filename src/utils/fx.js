// utils/fx.js - 全站特效小工具
// 通过自定义事件和背景粒子层（components/FxField.vue）通信，
// 这样任何组件都能"放烟花"，而不需要把 canvas 实例传来传去。

/**
 * 在指定坐标迸发一圈粒子
 * @param {number} x 视口横坐标
 * @param {number} y 视口纵坐标
 * @param {number} count 粒子数量
 * @param {string} [tone] 颜色主题：'success' | 'love' | 'rainbow'
 */
export function burst(x, y, count = 24, tone = 'rainbow') {
  window.dispatchEvent(new CustomEvent('fx-burst', { detail: { x, y, count, tone } }))
}

/**
 * 从屏幕底部中央向上发射（保存成功时用，更有庆祝感）
 * @param {number} count 粒子数量
 */
export function celebrate(count = 60) {
  const x = window.innerWidth / 2
  const y = window.innerHeight * 0.75
  burst(x, y, count, 'success')
}
