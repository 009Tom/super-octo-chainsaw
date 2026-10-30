// directives/reveal.js - v-reveal 自定义指令
// 用法：<div v-reveal> ... </div>
// 元素滚动进入视口时才播放"上浮淡入"动画，可以做错峰（传数字作为延迟毫秒）
// 共享一个观察器实例（比每个元素建一个更省资源）；不支持的环境置为 null
const observer = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            observer.unobserve(entry.target) // 只播一次，避免反复触发
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
  : null

export default {
  // 元素插入 DOM 时：加上初始隐藏类，并交给 IntersectionObserver 监听
  mounted(el, binding) {
    // 兼容降级：环境不支持 IntersectionObserver 时直接显示，避免内容永远看不见
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in')
      return
    }
    el.classList.add('reveal')
    // v-reveal="120" 表示延迟 120ms 入场，用于列表错峰动画
    const delay = Number(binding.value) || 0
    if (delay) el.style.transitionDelay = `${delay}ms`
    observer.observe(el)
  },
  // 元素卸载时取消监听，防止内存泄漏
  unmounted(el) {
    if (observer) observer.unobserve(el)
  }
}
