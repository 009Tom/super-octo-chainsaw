// tailwind.config.js - Tailwind 配置
// 设计分工：内容层保持静态（不用动画类），所有"动"的东西集中在背景层与开屏层
// 这里的 keyframes 主要服务于：背景极光 / 网格平移 / 光束 / 开屏进度
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}' // 扫描所有 vue/js 文件中的样式类
  ],
  theme: {
    extend: {
      colors: {
        // 主色：蓝色（内容层的强调色、按钮主色）
        primary: {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          dark: '#1D4ED8',
          50: '#EFF6FF',
          100: '#DBEAFE'
        },
        // 辅助色：绿色（成功状态）
        accent: {
          DEFAULT: '#10B981',
          light: '#34D399'
        },
        // 背景层专用的低饱和柔光三色（只用于极光与粒子，不用于文字）
        auroraBlue: '#93C5FD',
        auroraViolet: '#C4B5FD',
        auroraMint: '#A7F3D0',
        // 中性色板别名，写起来更顺手
        ink: {
          900: '#0F172A',
          700: '#334155',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC'
        }
      },
      // ===== 关键帧：背景层与开屏层专用 =====
      keyframes: {
        // 极光团漂移（大幅缓慢位移 + 轻微缩放）
        'aurora-1': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(12vw, 6vh, 0) scale(1.18)' },
          '66%': { transform: 'translate3d(-6vw, 10vh, 0) scale(0.92)' }
        },
        'aurora-2': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1.05)' },
          '50%': { transform: 'translate3d(-14vw, -8vh, 0) scale(0.9)' }
        },
        'aurora-3': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(0.95)' },
          '40%': { transform: 'translate3d(10vw, -12vh, 0) scale(1.2)' },
          '75%': { transform: 'translate3d(-10vw, 4vh, 0) scale(1)' }
        },
        // 网格缓慢平移（形成"背景在流动"的错觉）
        'grid-pan': {
          '0%': { backgroundPosition: '0 0, 0 0' },
          '100%': { backgroundPosition: '88px 88px, 88px 88px' }
        },
        // 斜向光束扫过（背景层最明显的"动"，所以亮度给得比极光足）
        beam: {
          '0%': { transform: 'translateX(-40%) translateY(-10%) rotate(12deg)', opacity: '0' },
          '20%, 70%': { opacity: '0.9' },
          '100%': { transform: 'translateX(140%) translateY(10%) rotate(12deg)', opacity: '0' }
        },
        // 渐变位移（开屏进度条、logo 描边用）
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        // 开屏：文字遮罩逐行揭开
        'mask-up': {
          '0%': { transform: 'translateY(105%)' },
          '100%': { transform: 'translateY(0)' }
        },
        // 开屏：字符淡入并轻微上浮
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        // 打字光标
        caret: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' }
        },
        // 呼吸（开屏状态点）
        breathe: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        'aurora-1': 'aurora-1 34s ease-in-out infinite',
        'aurora-2': 'aurora-2 46s ease-in-out infinite',
        'aurora-3': 'aurora-3 40s ease-in-out infinite',
        'grid-pan': 'grid-pan 22s linear infinite',
        beam: 'beam 14s ease-in-out infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'mask-up': 'mask-up 0.8s cubic-bezier(.16,1,.3,1) both',
        'fade-up': 'fade-up 0.7s cubic-bezier(.16,1,.3,1) both',
        caret: 'caret 1s steps(1) infinite',
        breathe: 'breathe 2.4s ease-in-out infinite'
      },
      // 弹性缓动
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.16,1,.3,1)'
      },
      // 移动端安全区与更贴近手机的断点
      screens: {
        xs: '480px' // 介于手机竖屏与大平板之间
      }
    }
  },
  plugins: []
}
