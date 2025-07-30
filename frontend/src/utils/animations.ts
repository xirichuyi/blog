/**
 * 动画工具和预设配置
 */

/**
 * 动画工具和预设配置
 */
import type { Variants, Transition } from 'framer-motion';
import { ANIMATIONS } from '@/constants';

/**
 * 基础动画变体
 */
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 30,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -30,
  },
};

export const fadeInDown: Variants = {
  initial: {
    opacity: 0,
    y: -30,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: 30,
  },
};

export const fadeInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -30,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: 30,
  },
};

export const fadeInRight: Variants = {
  initial: {
    opacity: 0,
    x: 30,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -30,
  },
};

export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
  },
};

export const slideInUp: Variants = {
  initial: {
    y: '100%',
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
  },
  exit: {
    y: '100%',
    opacity: 0,
  },
};

export const slideInDown: Variants = {
  initial: {
    y: '-100%',
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
  },
  exit: {
    y: '-100%',
    opacity: 0,
  },
};

/**
 * 容器动画变体（用于子元素错开动画）
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: ANIMATIONS.STAGGER.CHILDREN,
    },
  },
  exit: {
    transition: {
      staggerChildren: ANIMATIONS.STAGGER.FAST,
      staggerDirection: -1,
    },
  },
};

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};

/**
 * 导航动画变体
 */
export const navVariants: Variants = {
  initial: {
    opacity: 0,
    y: -10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -10,
  },
};

export const mobileMenuVariants: Variants = {
  initial: {
    opacity: 0,
    height: 0,
  },
  animate: {
    opacity: 1,
    height: 'auto',
  },
  exit: {
    opacity: 0,
    height: 0,
  },
};

/**
 * 模态框动画变体
 */
export const modalOverlayVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

export const modalContentVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
};

/**
 * 卡片动画变体
 */
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 30,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -30,
  },
  hover: {
    y: -5,
    transition: {
      duration: ANIMATIONS.DURATION.FAST,
    },
  },
};

/**
 * 按钮动画变体
 */
export const buttonVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
  },
  tap: {
    scale: 0.98,
  },
};

/**
 * 加载动画变体
 */
export const loadingSpinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const loadingDotsVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * 预设过渡配置
 */
export const transitions = {
  default: {
    duration: ANIMATIONS.DURATION.NORMAL,
    ease: ANIMATIONS.EASING.EASE_OUT,
  } as Transition,

  fast: {
    duration: ANIMATIONS.DURATION.FAST,
    ease: ANIMATIONS.EASING.EASE_OUT,
  } as Transition,

  slow: {
    duration: ANIMATIONS.DURATION.SLOW,
    ease: ANIMATIONS.EASING.EASE_OUT,
  } as Transition,

  bounce: {
    duration: ANIMATIONS.DURATION.NORMAL,
    ease: ANIMATIONS.EASING.BOUNCE,
  } as Transition,

  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  } as Transition,

  springBouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  } as Transition,
};

/**
 * 动画工具函数
 */
export const animationUtils = {
  /**
   * 创建错开动画
   */
  createStaggerAnimation: (
    children: number,
    staggerDelay: number = ANIMATIONS.STAGGER.CHILDREN
  ): Variants => ({
    animate: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }),

  /**
   * 创建延迟动画
   */
  createDelayedAnimation: (
    delay: number,
    variants: Variants = fadeInUp
  ): Variants => ({
    ...variants,
    animate: {
      ...variants.animate,
      transition: {
        ...transitions.default,
        delay,
      },
    },
  }),

  /**
   * 创建循环动画
   */
  createLoopAnimation: (
    keyframes: any,
    duration: number = 2,
    ease: string = 'linear'
  ): Transition => ({
    duration,
    repeat: Infinity,
    ease,
    ...keyframes,
  }),

  /**
   * 创建悬停动画
   */
  createHoverAnimation: (
    hoverState: any,
    transition: Transition = transitions.fast
  ): Variants => ({
    initial: {},
    hover: {
      ...hoverState,
      transition,
    },
  }),
};

/**
 * 页面过渡动画
 */
export const pageTransitions = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: transitions.default,
  },

  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: transitions.default,
  },

  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: transitions.default,
  },

  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
    transition: transitions.default,
  },
};
